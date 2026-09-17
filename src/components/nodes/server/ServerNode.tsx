import {
  BaseNode,
  NodeView,
  type NodePosition,
} from "../BaseNode";

export class ServerNode extends BaseNode {
  readonly type = "server";
  readonly name = "Server";

  capacity = 100;
  processingTime = 500;

  constructor(position: NodePosition) {
    super(position, {
      width: 220,
      height: 140,
    });

    this.addInput("requests");
    this.addOutput("responses");
  }
}

type ServerNodeViewProps = {
  node: ServerNode;
  isDragging?: boolean;

  onPointerDown?: (
    event: React.PointerEvent<HTMLDivElement>
  ) => void;
};

export function ServerNodeView({
  node,
  isDragging = false,
  onPointerDown,
}: ServerNodeViewProps) {
  return (
    <NodeView
      node={node}
      isDragging={isDragging}
      onPointerDown={onPointerDown}
    >
      <div className="p-4">
        <div className="text-sm font-semibold text-slate-900">
          Server
        </div>

        <div className="mt-1 text-xs text-slate-500">
          {node.capacity} requests / second
        </div>
      </div>
    </NodeView>
  );
}
