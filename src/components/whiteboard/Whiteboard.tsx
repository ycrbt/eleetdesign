import React, { useEffect, useRef, useState } from "react";
import { NodeDock } from "../dock/NodeDock";
import { InfrastructureNode, InfrastructureNodeView } from "../nodes/infrastructure/InfrastructureNode";
import { SimulationEngine, TRAFFIC_SOURCE_ID } from "../../simulation/SimulationEngine";
import { useSimulationStore } from "../../simulation/store";
import type { ComponentInstance, Connection } from "../../engine/types";

type Point = { x: number; y: number };
type DragState =
  | { type: "pan"; startMouse: Point; startPan: Point }
  | { type: "node"; nodeId: string; offset: Point }
  | null;
type WhiteboardProps = { onExit?: () => void };

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const GRID_SIZE = 32;
const SOURCE_POSITION = { x: 390, y: 360 };
const SOURCE_SIZE = { width: 150, height: 86 };

export default function Whiteboard({ onExit }: WhiteboardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(null);
  const engineRef = useRef<SimulationEngine | null>(null);
  const timerRef = useRef<number | null>(null);
  const [nodes, setNodes] = useState<InfrastructureNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
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
    return () => { if (timerRef.current !== null) window.clearInterval(timerRef.current); };
  }, [loadProblem]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Delete" || event.key === "Backspace") && selectedConnectionId && status !== "running") {
        setConnections((current) => current.filter((connection) => connection.id !== selectedConnectionId));
        setSelectedConnectionId(null);
      }
      if (event.key === "Escape") {
        setConnectingFrom(null);
        setSelectedConnectionId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedConnectionId, status]);

  function screenToWorld(clientX: number, clientY: number): Point {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  }

  function zoomAt(clientX: number, clientY: number, requestedZoom: number) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, requestedZoom));
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const worldX = (mouseX - pan.x) / zoom;
    const worldY = (mouseY - pan.y) / zoom;
    setPan({ x: mouseX - worldX * nextZoom, y: mouseY - worldY * nextZoom });
    setZoom(nextZoom);
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, zoom * (event.deltaY < 0 ? 1.1 : 0.9));
  }

  function zoomFromCenter(nextZoom: number) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (rect) zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, nextZoom);
  }

  function handlePickNode(template: InfrastructureNode, event: React.PointerEvent<HTMLDivElement>) {
    if (status === "running") return;
    const mouse = screenToWorld(event.clientX, event.clientY);
    const position = { x: mouse.x - template.size.width / 2, y: mouse.y - template.size.height / 2 };
    const node = new InfrastructureNode(template.componentType, position);
    setNodes((current) => [...current, node]);
    setDraggedNodeId(node.id);
    setDragPosition(position);
    dragRef.current = { type: "node", nodeId: node.id, offset: { x: template.size.width / 2, y: template.size.height / 2 } };
  }

  function startNodeDrag(event: React.PointerEvent, node: InfrastructureNode) {
    if (status === "running") return;
    event.stopPropagation();
    const mouse = screenToWorld(event.clientX, event.clientY);
    setDraggedNodeId(node.id);
    setDragPosition({ ...node.position });
    dragRef.current = { type: "node", nodeId: node.id, offset: { x: mouse.x - node.position.x, y: mouse.y - node.position.y } };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    setSelectedConnectionId(null);
    dragRef.current = { type: "pan", startMouse: { x: event.clientX, y: event.clientY }, startPan: pan };
    setIsPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.type === "pan") {
      setPan({ x: drag.startPan.x + event.clientX - drag.startMouse.x, y: drag.startPan.y + event.clientY - drag.startMouse.y });
      return;
    }
    const mouse = screenToWorld(event.clientX, event.clientY);
    setDragPosition({ x: mouse.x - drag.offset.x, y: mouse.y - drag.offset.y });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag?.type === "node" && dragPosition) {
      setNodes((current) => current.map((node) => { if (node.id === drag.nodeId) node.moveTo({ ...dragPosition }); return node; }));
    }
    dragRef.current = null;
    setDraggedNodeId(null);
    setDragPosition(null);
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function startConnection(sourceId: string) {
    if (status === "running") return;
    setSelectedConnectionId(null);
    setConnectingFrom((current) => current === sourceId ? null : sourceId);
  }

  function finishConnection(node: InfrastructureNode) {
    if (status === "running" || !connectingFrom || connectingFrom === node.id) return;
    const exists = connections.some((connection) => connection.sourceId === connectingFrom && connection.targetId === node.id);
    if (!exists) setConnections((current) => [...current, { id: crypto.randomUUID(), sourceId: connectingFrom, targetId: node.id }]);
    setConnectingFrom(null);
  }

  function deleteNode(node: InfrastructureNode) {
    if (status === "running") return;
    setNodes((current) => current.filter((item) => item.id !== node.id));
    setConnections((current) => current.filter((connection) => connection.sourceId !== node.id && connection.targetId !== node.id));
    if (connectingFrom === node.id) setConnectingFrom(null);
  }

  function deleteSelectedConnection() {
    if (!selectedConnectionId || status === "running") return;
    setConnections((current) => current.filter((connection) => connection.id !== selectedConnectionId));
    setSelectedConnectionId(null);
  }

  function componentInstances(): ComponentInstance[] {
    return nodes.map((node) => ({ id: node.id, componentType: node.componentType, x: node.position.x, y: node.position.y }));
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

  function endpoint(id: string, side: "source" | "target"): Point | null {
    if (id === TRAFFIC_SOURCE_ID) return { x: SOURCE_POSITION.x + SOURCE_SIZE.width, y: SOURCE_POSITION.y + SOURCE_SIZE.height / 2 };
    const node = nodes.find((item) => item.id === id);
    if (!node) return null;
    return side === "source"
      ? { x: node.position.x + node.size.width, y: node.position.y + node.size.height / 2 }
      : { x: node.position.x, y: node.position.y + node.size.height / 2 };
  }

  const draggedNode = draggedNodeId ? nodes.find((node) => node.id === draggedNodeId) : undefined;
  const sourceConnected = connections.some((connection) => connection.sourceId === TRAFFIC_SOURCE_ID);

  return (
    <div ref={boardRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onWheel={handleWheel} className={`relative h-screen w-screen touch-none select-none overflow-hidden bg-slate-50 ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}>
      <div className="pointer-events-none absolute inset-0 z-0" style={{ backgroundImage: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)", backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }} />

      <div className="pointer-events-none absolute left-0 top-0 z-10 origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        <svg className="absolute left-0 top-0 overflow-visible" width="1" height="1">
          {connections.map((connection) => {
            const source = endpoint(connection.sourceId, "source");
            const target = endpoint(connection.targetId, "target");
            if (!source || !target) return null;
            const d = `M ${source.x} ${source.y} C ${source.x + 70} ${source.y}, ${target.x - 70} ${target.y}, ${target.x} ${target.y}`;
            const selected = selectedConnectionId === connection.id;
            return (
              <g key={connection.id} className="pointer-events-auto cursor-pointer" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); if (status !== "running") setSelectedConnectionId(connection.id); }}>
                <path d={d} fill="none" stroke="transparent" strokeWidth="16" pointerEvents="stroke" />
                <path d={d} fill="none" stroke={selected ? "#ef4444" : "#94a3b8"} strokeWidth={selected ? 3 : 2} pointerEvents="none" />
              </g>
            );
          })}
        </svg>

        <div className="pointer-events-auto absolute rounded-2xl border-2 border-emerald-300 bg-emerald-50 shadow-sm" style={{ left: SOURCE_POSITION.x, top: SOURCE_POSITION.y, width: SOURCE_SIZE.width, height: SOURCE_SIZE.height }} onPointerDown={(event) => event.stopPropagation()}>
          <div className="flex h-full flex-col justify-center px-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />Traffic</div>
            <div className="mt-1 text-xs text-emerald-700">Request source</div>
          </div>
          <button type="button" onClick={(event) => { event.stopPropagation(); startConnection(TRAFFIC_SOURCE_ID); }} className={`absolute -right-3 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full border bg-white text-sm shadow ${connectingFrom === TRAFFIC_SOURCE_ID ? "border-blue-500 ring-2 ring-blue-200" : "border-emerald-400"}`} title="Connect traffic source">→</button>
          {!sourceConnected && (
            <div className="pointer-events-none absolute left-full top-1/2 ml-5 flex -translate-y-1/2 gap-3">
              <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
              <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-400 [animation-delay:150ms]" />
              <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-300 [animation-delay:300ms]" />
            </div>
          )}
        </div>

        {nodes.map((node) => node.id === draggedNodeId ? null : (
          <InfrastructureNodeView
            key={node.id}
            node={node}
            connecting={connectingFrom === node.id}
            onPointerDown={(event) => startNodeDrag(event, node)}
            onStartConnection={() => startConnection(node.id)}
            onFinishConnection={finishConnection}
            onDelete={deleteNode}
          />
        ))}
      </div>

      {problem && <NodeDock available={problem.components_available} onPickNode={handlePickNode} />}
      {draggedNode && dragPosition && <div className="pointer-events-none absolute left-0 top-0 z-[100] origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}><InfrastructureNodeView node={new InfrastructureNode(draggedNode.componentType, dragPosition)} isDragging pickupScale={0.9} /></div>}

      <div onPointerDown={(event) => event.stopPropagation()} className="absolute left-5 top-5 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Problem 1</div><div className="mt-1 text-lg font-semibold text-slate-900">{problem?.title ?? "Loading…"}</div></div>{onExit && <button type="button" onClick={onExit} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-700">Briefing</button>}</div>
        <p className="mt-2 text-xs leading-5 text-slate-500">{problem?.narrative}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><Metric label="Success" value={`${(metrics.successRate * 100).toFixed(1)}%`} /><Metric label="Throughput" value={`${metrics.throughputPerSecond}/s`} /><Metric label="Cost" value={`$${metrics.monthlyCost}`} /></div>
        <div className="mt-3 flex items-center gap-2">{status === "running" ? <button type="button" onClick={stopSimulation} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Stop</button> : <button type="button" onClick={runSimulation} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">Run simulation</button>}<span className="text-xs text-slate-500">{metrics.elapsedSeconds}s · {balls.filter((ball) => ball.state === "rejected").length} rejected now</span></div>
        {(status === "passed" || status === "failed") && <div className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${status === "passed" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{status === "passed" ? "System passed the traffic test" : "System failed — revise the design and try again"}</div>}
      </div>

      {selectedConnectionId && status !== "running" && <div onPointerDown={(event) => event.stopPropagation()} className="absolute left-1/2 top-5 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-red-200 bg-white px-4 py-2 shadow-lg"><span className="text-xs font-medium text-slate-600">Connection selected</span><button type="button" onClick={deleteSelectedConnection} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">Delete</button></div>}

      {connectingFrom && <div className="pointer-events-none absolute bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg">Select an IN port to finish the connection · Esc to cancel</div>}

      <div onPointerDown={(event) => event.stopPropagation()} className="absolute bottom-5 right-5 z-50 flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"><button type="button" onClick={() => zoomFromCenter(zoom - ZOOM_STEP)} className="grid h-10 w-10 place-items-center text-lg text-slate-600 hover:bg-slate-100">−</button><button type="button" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }} className="min-w-16 border-x border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100">{Math.round(zoom * 100)}%</button><button type="button" onClick={() => zoomFromCenter(zoom + ZOOM_STEP)} className="grid h-10 w-10 place-items-center text-lg text-slate-600 hover:bg-slate-100">+</button></div>
      {status === "running" && <div className="pointer-events-none absolute right-5 top-5 z-50 flex max-w-52 flex-wrap gap-1 rounded-xl bg-white/90 p-3 shadow">{balls.slice(0, 80).map((ball) => <span key={ball.id} className={`h-2.5 w-2.5 rounded-full ${ball.state === "rejected" ? "bg-red-500" : "bg-emerald-500"}`} />)}</div>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-2"><div className="font-semibold text-slate-900">{value}</div><div className="mt-0.5 text-[10px] text-slate-400">{label}</div></div>;
}
