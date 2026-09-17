import type { ReactNode } from "react";

export type NodePosition = {
  x: number;
  y: number;
};

export type NodeSize = {
  width: number;
  height: number;
};

export type NodePort = {
  id: string;
  type: "input" | "output";
};

export abstract class BaseNode {
  readonly id: string;

  position: NodePosition;
  size: NodeSize;

  abstract readonly type: string;
  abstract readonly name: string;

  inputs: NodePort[] = [];
  outputs: NodePort[] = [];

  constructor(
    position: NodePosition,
    size: NodeSize = {
      width: 220,
      height: 140,
    }
  ) {
    this.id = crypto.randomUUID();
    this.position = position;
    this.size = size;
  }

  moveTo(position: NodePosition) {
    this.position = position;
  }

  addInput(id: string) {
    this.inputs.push({
      id,
      type: "input",
    });
  }

  addOutput(id: string) {
    this.outputs.push({
      id,
      type: "output",
    });
  }
}

type NodeViewProps = {
  node: BaseNode;
  children?: ReactNode;
  selected?: boolean;
  isDragging?: boolean;
  pickupScale?: number;
  onPointerDown?: (
    event: React.PointerEvent<HTMLDivElement>
  ) => void;
};

export function NodeView({
  node,
  children,
  selected = false,
  isDragging = false,
  pickupScale = 1,
  onPointerDown,
}: NodeViewProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      className={`
        pointer-events-auto
        absolute
        rounded-xl
        border
        bg-white
        shadow-sm
        transition-[transform,box-shadow]
        duration-200
        ease-out

        ${
          isDragging
            ? "z-[100] cursor-grabbing shadow-xl"
            : "z-10 cursor-grab"
        }

        ${
          selected
            ? "border-blue-500 ring-2 ring-blue-500/20"
            : "border-slate-200"
        }
      `}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: node.size.width,
        minHeight: node.size.height,
        transform: `scale(${pickupScale})`,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  );
}
