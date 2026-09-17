import { BaseNode, NodeView, type NodePosition } from "../BaseNode";
import { getComponentDefinition } from "../../../simulation/componentRegistry";

export class InfrastructureNode extends BaseNode {
  readonly type: string;
  readonly name: string;
  readonly componentType: string;

  constructor(componentType: string, position: NodePosition) {
    super(position, { width: 190, height: 110 });
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
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onConnect?: (node: InfrastructureNode) => void;
};

export function InfrastructureNodeView({
  node,
  isDragging = false,
  pickupScale = 1,
  connecting = false,
  onPointerDown,
  onConnect,
}: Props) {
  const definition = getComponentDefinition(node.componentType);

  return (
    <NodeView
      node={node}
      isDragging={isDragging}
      pickupScale={pickupScale}
      onPointerDown={onPointerDown}
    >
      <div className="relative p-4">
        <div className="text-sm font-semibold text-slate-900">{definition.name}</div>
        <div className="mt-1 text-xs text-slate-500">
          {definition.capacity} req/s · ${definition.monthlyCost}/mo
        </div>
        {!isDragging && onConnect && (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onConnect(node);
            }}
            className={`absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border bg-white text-xs shadow-sm ${
              connecting ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-300"
            }`}
            title={connecting ? "Cancel connection" : "Connect from this component"}
          >
            →
          </button>
        )}
      </div>
    </NodeView>
  );
}
