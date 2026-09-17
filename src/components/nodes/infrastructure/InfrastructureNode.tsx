import { BaseNode, NodeView, type NodePosition } from "../BaseNode";
import { getComponentDefinition } from "../../../simulation/componentRegistry";

export class InfrastructureNode extends BaseNode {
  readonly type: string;
  readonly name: string;
  readonly componentType: string;

  constructor(componentType: string, position: NodePosition) {
    super(position, { width: 190, height: 120 });
    const definition = getComponentDefinition(componentType);
    this.type = componentType;
    this.componentType = componentType;
    this.name = definition.name;
    this.addInput("in");
    this.addOutput("out");
  }
}

type Props = {
  node: InfrastructureNode;
  isDragging?: boolean;
  pickupScale?: number;
  connecting?: boolean;
  load?: number;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onStartConnection?: (node: InfrastructureNode) => void;
  onFinishConnection?: (node: InfrastructureNode) => void;
  onDelete?: (node: InfrastructureNode) => void;
};

export function InfrastructureNodeView({ node, isDragging = false, pickupScale = 1, connecting = false, load = 0, onPointerDown, onStartConnection, onFinishConnection, onDelete }: Props) {
  const definition = getComponentDefinition(node.componentType);
  const utilization = Math.min(1, load / definition.capacity);
  const percentage = Math.round(utilization * 100);

  return (
    <NodeView node={node} isDragging={isDragging} pickupScale={pickupScale} onPointerDown={onPointerDown}>
      <div className="relative p-4">
        <div className="pr-6 text-sm font-semibold text-slate-900">{definition.name}</div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
          <span>Capacity</span><span>{load}/{definition.capacity} req/s</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full transition-all duration-300 ${percentage >= 100 ? "bg-red-500" : percentage >= 75 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${percentage}%` }} />
        </div>
        <div className="mt-2 text-[10px] text-slate-400">${definition.monthlyCost}/mo</div>

        {!isDragging && onFinishConnection && <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onFinishConnection(node); }} className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-500 shadow-sm hover:border-blue-500 hover:text-blue-600" title="Connect into this component">IN</button>}
        {!isDragging && onStartConnection && <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onStartConnection(node); }} className={`absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border bg-white text-xs shadow-sm ${connecting ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" : "border-slate-300 hover:border-blue-500"}`} title={connecting ? "Cancel connection" : "Start connection"}>→</button>}
        {!isDragging && onDelete && <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onDelete(node); }} className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-md text-sm text-slate-300 hover:bg-red-50 hover:text-red-500" title="Delete component">×</button>}
      </div>
    </NodeView>
  );
}
