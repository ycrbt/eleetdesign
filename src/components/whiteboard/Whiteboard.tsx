import React, { useEffect, useRef, useState } from "react";
import { NodeDock } from "../dock/NodeDock";
import { InfrastructureNode, InfrastructureNodeView } from "../nodes/infrastructure/InfrastructureNode";
import { SimulationEngine } from "../../simulation/SimulationEngine";
import { useSimulationStore } from "../../simulation/store";
import type { ComponentInstance, Connection } from "../../engine/types";

type Point = { x: number; y: number };
type DragState =
  | { type: "pan"; startMouse: Point; startPan: Point }
  | { type: "node"; nodeId: string; offset: Point }
  | null;

const GRID_SIZE = 32;

export default function Whiteboard() {
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(null);
  const engineRef = useRef<SimulationEngine | null>(null);
  const timerRef = useRef<number | null>(null);

  const [nodes, setNodes] = useState<InfrastructureNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const zoom = 1;
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<Point | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const problem = useSimulationStore((state) => state.problem);
  const status = useSimulationStore((state) => state.status);
  const metrics = useSimulationStore((state) => state.metrics);
  const balls = useSimulationStore((state) => state.balls);
  const loadProblem = useSimulationStore((state) => state.loadProblem);
  const setDesign = useSimulationStore((state) => state.setDesign);
  const applyTick = useSimulationStore((state) => state.applyTick);
  const setStatus = useSimulationStore((state) => state.setStatus);
  const resetSimulation = useSimulationStore((state) => state.resetSimulation);

  useEffect(() => {
    void loadProblem("url-shortener-v1");
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [loadProblem]);

  function screenToWorld(clientX: number, clientY: number): Point {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }

  function handlePickNode(template: InfrastructureNode, event: React.PointerEvent<HTMLDivElement>) {
    if (status === "running") return;
    const mouse = screenToWorld(event.clientX, event.clientY);
    const position = {
      x: mouse.x - template.size.width / 2,
      y: mouse.y - template.size.height / 2,
    };
    const node = new InfrastructureNode(template.componentType, position);
    setNodes((current) => [...current, node]);
    setDraggedNodeId(node.id);
    setDragPosition(position);
    dragRef.current = {
      type: "node",
      nodeId: node.id,
      offset: { x: template.size.width / 2, y: template.size.height / 2 },
    };
  }

  function startNodeDrag(event: React.PointerEvent, node: InfrastructureNode) {
    if (status === "running") return;
    event.stopPropagation();
    const mouse = screenToWorld(event.clientX, event.clientY);
    setDraggedNodeId(node.id);
    setDragPosition({ ...node.position });
    dragRef.current = {
      type: "node",
      nodeId: node.id,
      offset: { x: mouse.x - node.position.x, y: mouse.y - node.position.y },
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    dragRef.current = {
      type: "pan",
      startMouse: { x: event.clientX, y: event.clientY },
      startPan: pan,
    };
    setIsPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.type === "pan") {
      setPan({
        x: drag.startPan.x + event.clientX - drag.startMouse.x,
        y: drag.startPan.y + event.clientY - drag.startMouse.y,
      });
      return;
    }
    const mouse = screenToWorld(event.clientX, event.clientY);
    setDragPosition({ x: mouse.x - drag.offset.x, y: mouse.y - drag.offset.y });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag?.type === "node" && dragPosition) {
      setNodes((current) =>
        current.map((node) => {
          if (node.id === drag.nodeId) node.moveTo({ ...dragPosition });
          return node;
        })
      );
    }
    dragRef.current = null;
    setDraggedNodeId(null);
    setDragPosition(null);
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function connectNode(node: InfrastructureNode) {
    if (!connectingFrom) {
      setConnectingFrom(node.id);
      return;
    }
    if (connectingFrom === node.id) {
      setConnectingFrom(null);
      return;
    }
    const exists = connections.some(
      (connection) => connection.sourceId === connectingFrom && connection.targetId === node.id
    );
    if (!exists) {
      setConnections((current) => [
        ...current,
        { id: crypto.randomUUID(), sourceId: connectingFrom, targetId: node.id },
      ]);
    }
    setConnectingFrom(null);
  }

  function componentInstances(): ComponentInstance[] {
    return nodes.map((node) => ({
      id: node.id,
      componentType: node.componentType,
      x: node.position.x,
      y: node.position.y,
    }));
  }

  function runSimulation() {
    if (!problem || nodes.length === 0) return;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    resetSimulation();
    const components = componentInstances();
    setDesign(components, connections);
    const engine = new SimulationEngine({ problem, components, connections });
    engineRef.current = engine;
    setStatus("running");

    const runTick = () => {
      const tick = engine.tick();
      if (tick.finished) {
        setStatus(tick.passed ? "passed" : "failed");
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
        return;
      }
      applyTick(tick.balls, tick.successRate, tick.second);
    };

    runTick();
    timerRef.current = window.setInterval(runTick, 350);
  }

  function stopSimulation() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    engineRef.current = null;
    setStatus("idle");
  }

  const draggedNode = draggedNodeId ? nodes.find((node) => node.id === draggedNodeId) : undefined;

  return (
    <div
      ref={boardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative h-screen w-screen touch-none select-none overflow-hidden bg-slate-50 ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
          backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      <div className="pointer-events-none absolute left-0 top-0 z-10 origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        <svg className="absolute left-0 top-0 overflow-visible" width="1" height="1">
          {connections.map((connection) => {
            const source = nodes.find((node) => node.id === connection.sourceId);
            const target = nodes.find((node) => node.id === connection.targetId);
            if (!source || !target) return null;
            const x1 = source.position.x + source.size.width;
            const y1 = source.position.y + source.size.height / 2;
            const x2 = target.position.x;
            const y2 = target.position.y + target.size.height / 2;
            return <path key={connection.id} d={`M ${x1} ${y1} C ${x1 + 70} ${y1}, ${x2 - 70} ${y2}, ${x2} ${y2}`} fill="none" stroke="#94a3b8" strokeWidth="2" />;
          })}
        </svg>

        {nodes.map((node) =>
          node.id === draggedNodeId ? null : (
            <InfrastructureNodeView
              key={node.id}
              node={node}
              connecting={connectingFrom === node.id}
              onPointerDown={(event) => startNodeDrag(event, node)}
              onConnect={connectNode}
            />
          )
        )}
      </div>

      {problem && <NodeDock available={problem.components_available} onPickNode={handlePickNode} />}

      {draggedNode && dragPosition && (
        <div className="pointer-events-none absolute left-0 top-0 z-[100] origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <InfrastructureNodeView
            node={new InfrastructureNode(draggedNode.componentType, dragPosition)}
            isDragging
            pickupScale={0.9}
          />
        </div>
      )}

      <div onPointerDown={(event) => event.stopPropagation()} className="absolute left-5 top-5 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Problem 1</div>
        <div className="mt-1 text-lg font-semibold text-slate-900">{problem?.title ?? "Loading…"}</div>
        <p className="mt-2 text-xs leading-5 text-slate-500">{problem?.narrative}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <Metric label="Success" value={`${(metrics.successRate * 100).toFixed(1)}%`} />
          <Metric label="Throughput" value={`${metrics.throughputPerSecond}/s`} />
          <Metric label="Cost" value={`$${metrics.monthlyCost}`} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          {status === "running" ? (
            <button type="button" onClick={stopSimulation} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Stop</button>
          ) : (
            <button type="button" onClick={runSimulation} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">Run simulation</button>
          )}
          <span className="text-xs text-slate-500">{metrics.elapsedSeconds}s · {balls.filter((ball) => ball.state === "rejected").length} rejected now</span>
        </div>
        {(status === "passed" || status === "failed") && (
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${status === "passed" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {status === "passed" ? "System passed the traffic test" : "System failed — revise the design and try again"}
          </div>
        )}
      </div>

      {status === "running" && (
        <div className="pointer-events-none absolute right-5 top-5 z-50 flex max-w-52 flex-wrap gap-1 rounded-xl bg-white/90 p-3 shadow">
          {balls.slice(0, 80).map((ball) => (
            <span key={ball.id} className={`h-2.5 w-2.5 rounded-full ${ball.state === "rejected" ? "bg-red-500" : "bg-emerald-500"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <div className="font-semibold text-slate-900">{value}</div>
      <div className="mt-0.5 text-[10px] text-slate-400">{label}</div>
    </div>
  );
}
