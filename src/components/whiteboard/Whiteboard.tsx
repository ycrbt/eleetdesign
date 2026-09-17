import React, { useEffect, useRef, useState } from "react";
import { NodeDock } from "../dock/NodeDock";
import { InfrastructureNode, InfrastructureNodeView } from "../nodes/infrastructure/InfrastructureNode";
import { TRAFFIC_SOURCE_ID } from "../../simulation/SimulationEngine";
import { useSimulationStore } from "../../simulation/store";
import { getComponentDefinition } from "../../simulation/componentRegistry";
import type { Connection } from "../../engine/types";

type Point = { x: number; y: number };
type DragState = { type: "pan"; startMouse: Point; startPan: Point } | { type: "node"; nodeId: string; offset: Point } | null;
type WhiteboardProps = { onExit?: () => void };
type FlowDot = { id: number; progress: number };

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2;
const GRID_SIZE = 32;
const SOURCE_POSITION = { x: 360, y: 360 };
const SOURCE_SIZE = { width: 160, height: 90 };
const REQUEST_RATE = 40;

export default function Whiteboard({ onExit }: WhiteboardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(null);
  const [nodes, setNodes] = useState<InfrastructureNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<Point | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [flowTime, setFlowTime] = useState(0);
  const problem = useSimulationStore((state) => state.problem);
  const loadProblem = useSimulationStore((state) => state.loadProblem);

  useEffect(() => { void loadProblem("url-shortener-v1"); }, [loadProblem]);
  useEffect(() => {
    let frame = 0;
    const started = performance.now();
    const animate = (now: number) => { setFlowTime((now - started) / 1000); frame = requestAnimationFrame(animate); };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Delete" || event.key === "Backspace") && selectedConnectionId) {
        setConnections((current) => current.filter((connection) => connection.id !== selectedConnectionId));
        setSelectedConnectionId(null);
      }
      if (event.key === "Escape") { setConnectingFrom(null); setSelectedConnectionId(null); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedConnectionId]);

  function screenToWorld(clientX: number, clientY: number): Point {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  }
  function zoomAt(clientX: number, clientY: number, requestedZoom: number) {
    const rect = boardRef.current?.getBoundingClientRect(); if (!rect) return;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, requestedZoom));
    const mx = clientX - rect.left, my = clientY - rect.top;
    const wx = (mx - pan.x) / zoom, wy = (my - pan.y) / zoom;
    setPan({ x: mx - wx * nextZoom, y: my - wy * nextZoom }); setZoom(nextZoom);
  }
  function handlePickNode(template: InfrastructureNode, event: React.PointerEvent<HTMLDivElement>) {
    const mouse = screenToWorld(event.clientX, event.clientY);
    const position = { x: mouse.x - template.size.width / 2, y: mouse.y - template.size.height / 2 };
    const node = new InfrastructureNode(template.componentType, position);
    setNodes((current) => [...current, node]); setDraggedNodeId(node.id); setDragPosition(position);
    dragRef.current = { type: "node", nodeId: node.id, offset: { x: template.size.width / 2, y: template.size.height / 2 } };
  }
  function startNodeDrag(event: React.PointerEvent, node: InfrastructureNode) {
    event.stopPropagation(); const mouse = screenToWorld(event.clientX, event.clientY);
    setDraggedNodeId(node.id); setDragPosition({ ...node.position });
    dragRef.current = { type: "node", nodeId: node.id, offset: { x: mouse.x - node.position.x, y: mouse.y - node.position.y } };
  }
  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return; setSelectedConnectionId(null);
    dragRef.current = { type: "pan", startMouse: { x: event.clientX, y: event.clientY }, startPan: pan }; setIsPanning(true); event.currentTarget.setPointerCapture(event.pointerId);
  }
  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current; if (!drag) return;
    if (drag.type === "pan") { setPan({ x: drag.startPan.x + event.clientX - drag.startMouse.x, y: drag.startPan.y + event.clientY - drag.startMouse.y }); return; }
    const mouse = screenToWorld(event.clientX, event.clientY); setDragPosition({ x: mouse.x - drag.offset.x, y: mouse.y - drag.offset.y });
  }
  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag?.type === "node" && dragPosition) setNodes((current) => current.map((node) => { if (node.id === drag.nodeId) node.moveTo({ ...dragPosition }); return node; }));
    dragRef.current = null; setDraggedNodeId(null); setDragPosition(null); setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function startConnection(sourceId: string) { setSelectedConnectionId(null); setConnectingFrom((current) => current === sourceId ? null : sourceId); }
  function finishConnection(node: InfrastructureNode) {
    if (!connectingFrom || connectingFrom === node.id) return;
    const exists = connections.some((c) => c.sourceId === connectingFrom && c.targetId === node.id);
    if (!exists) setConnections((current) => [...current, { id: crypto.randomUUID(), sourceId: connectingFrom, targetId: node.id }]);
    setConnectingFrom(null);
  }
  function deleteNode(node: InfrastructureNode) {
    setNodes((current) => current.filter((item) => item.id !== node.id));
    setConnections((current) => current.filter((c) => c.sourceId !== node.id && c.targetId !== node.id));
  }
  function endpoint(id: string, side: "source" | "target"): Point | null {
    if (id === TRAFFIC_SOURCE_ID) return { x: SOURCE_POSITION.x + SOURCE_SIZE.width, y: SOURCE_POSITION.y + SOURCE_SIZE.height / 2 };
    const node = nodes.find((item) => item.id === id); if (!node) return null;
    return side === "source" ? { x: node.position.x + node.size.width, y: node.position.y + node.size.height / 2 } : { x: node.position.x, y: node.position.y + node.size.height / 2 };
  }
  function pointOnCurve(a: Point, b: Point, t: number): Point {
    const c1 = { x: a.x + 70, y: a.y }, c2 = { x: b.x - 70, y: b.y }, u = 1 - t;
    return { x: u*u*u*a.x + 3*u*u*t*c1.x + 3*u*t*t*c2.x + t*t*t*b.x, y: u*u*u*a.y + 3*u*u*t*c1.y + 3*u*t*t*c2.y + t*t*t*b.y };
  }

  const draggedNode = draggedNodeId ? nodes.find((node) => node.id === draggedNodeId) : undefined;
  const sourceConnection = connections.find((c) => c.sourceId === TRAFFIC_SOURCE_ID);
  const connectedServer = sourceConnection ? nodes.find((n) => n.id === sourceConnection.targetId) : undefined;
  const serverCapacity = connectedServer ? getComponentDefinition(connectedServer.componentType).capacity : 0;
  const processed = connectedServer ? Math.min(REQUEST_RATE, serverCapacity) : 0;
  const dropped = REQUEST_RATE - processed;
  const dots: FlowDot[] = Array.from({ length: 8 }, (_, id) => ({ id, progress: (flowTime * 0.55 + id / 8) % 1 }));

  return (
    <div ref={boardRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onWheel={(e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, zoom * (e.deltaY < 0 ? 1.1 : 0.9)); }} className={`relative h-screen w-screen touch-none select-none overflow-hidden bg-slate-50 ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}>
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "linear-gradient(#e2e8f0 1px,transparent 1px),linear-gradient(90deg,#e2e8f0 1px,transparent 1px)", backgroundSize: `${GRID_SIZE*zoom}px ${GRID_SIZE*zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }} />
      <div className="pointer-events-none absolute left-0 top-0 z-10 origin-top-left" style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})` }}>
        <svg className="absolute left-0 top-0 overflow-visible" width="1" height="1">
          {connections.map((c) => { const a=endpoint(c.sourceId,"source"), b=endpoint(c.targetId,"target"); if(!a||!b)return null; const d=`M ${a.x} ${a.y} C ${a.x+70} ${a.y}, ${b.x-70} ${b.y}, ${b.x} ${b.y}`; const selected=selectedConnectionId===c.id; return <g key={c.id} className="pointer-events-auto cursor-pointer" onPointerDown={(e)=>e.stopPropagation()} onClick={(e)=>{e.stopPropagation();setSelectedConnectionId(c.id)}}><path d={d} fill="none" stroke="transparent" strokeWidth="16" pointerEvents="stroke"/><path d={d} fill="none" stroke={selected?"#ef4444":"#94a3b8"} strokeWidth={selected?3:2}/>{c.sourceId===TRAFFIC_SOURCE_ID && dots.map((dot)=>{const p=pointOnCurve(a,b,dot.progress);return <circle key={dot.id} cx={p.x} cy={p.y} r="5" fill="#22c55e"/>})}</g>; })}
        </svg>
        <div className="pointer-events-auto absolute rounded-2xl border-2 border-emerald-300 bg-emerald-50 shadow-sm" style={{left:SOURCE_POSITION.x,top:SOURCE_POSITION.y,width:SOURCE_SIZE.width,height:SOURCE_SIZE.height}} onPointerDown={(e)=>e.stopPropagation()}>
          <div className="flex h-full flex-col justify-center px-4"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500"/>Request Source</div><div className="mt-1 text-xs text-emerald-700">{REQUEST_RATE} requests/s</div></div>
          <button type="button" onClick={(e)=>{e.stopPropagation();startConnection(TRAFFIC_SOURCE_ID)}} className={`absolute -right-3 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full border bg-white shadow ${connectingFrom===TRAFFIC_SOURCE_ID?"border-blue-500 ring-2 ring-blue-200":"border-emerald-400"}`}>→</button>
          {!sourceConnection && <div className="pointer-events-none absolute left-full top-1/2 ml-4 flex w-40 -translate-y-1/2 gap-5 overflow-hidden">{dots.slice(0,5).map((d)=><span key={d.id} className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" style={{transform:`translateX(${d.progress*120}px)`}}/>)}</div>}
        </div>
        {nodes.map((node)=>node.id===draggedNodeId?null:<InfrastructureNodeView key={node.id} node={node} load={sourceConnection?.targetId===node.id?REQUEST_RATE:0} connecting={connectingFrom===node.id} onPointerDown={(e)=>startNodeDrag(e,node)} onStartConnection={()=>startConnection(node.id)} onFinishConnection={finishConnection} onDelete={deleteNode}/>)}
      </div>
      {problem && <NodeDock available={problem.components_available} onPickNode={handlePickNode}/>} 
      {draggedNode&&dragPosition&&<div className="pointer-events-none absolute left-0 top-0 z-[100] origin-top-left" style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}><InfrastructureNodeView node={new InfrastructureNode(draggedNode.componentType,dragPosition)} isDragging pickupScale={0.9}/></div>}
      <div onPointerDown={(e)=>e.stopPropagation()} className="absolute left-5 top-5 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"><div className="flex items-start justify-between"><div><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Problem 1</div><div className="mt-1 text-lg font-semibold">{problem?.title??"Loading…"}</div></div>{onExit&&<button onClick={onExit} className="text-xs text-slate-400">Briefing</button>}</div><p className="mt-2 text-xs leading-5 text-slate-500">{problem?.narrative}</p><div className="mt-4 grid grid-cols-3 gap-2"><Metric label="Incoming" value={`${REQUEST_RATE}/s`}/><Metric label="Processed" value={`${processed}/s`}/><Metric label="Dropped" value={`${dropped}/s`}/></div><div className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${connectedServer?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{connectedServer?"Traffic is being processed continuously.":"Connect the request source to a Server."}</div></div>
      {selectedConnectionId&&<button type="button" onPointerDown={(e)=>e.stopPropagation()} onClick={()=>{setConnections((current)=>current.filter((c)=>c.id!==selectedConnectionId));setSelectedConnectionId(null)}} className="absolute left-1/2 top-5 z-[70] -translate-x-1/2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow">Delete connection</button>}
      <div onPointerDown={(e)=>e.stopPropagation()} className="absolute bottom-5 right-5 z-50 flex overflow-hidden rounded-xl border bg-white shadow"><button onClick={()=>zoomAt(innerWidth/2,innerHeight/2,zoom-.1)} className="h-10 w-10">−</button><button onClick={()=>{setZoom(1);setPan({x:0,y:0})}} className="border-x px-3 text-xs">{Math.round(zoom*100)}%</button><button onClick={()=>zoomAt(innerWidth/2,innerHeight/2,zoom+.1)} className="h-10 w-10">+</button></div>
    </div>
  );
}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-lg bg-slate-50 p-2 text-center"><div className="text-xs font-semibold text-slate-900">{value}</div><div className="mt-0.5 text-[10px] text-slate-400">{label}</div></div>}
