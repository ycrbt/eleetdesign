import { ServerNode } from "../nodes/server/ServerNode";
import { ServerNodeView } from "../nodes/server/ServerNode";

type NodeDockProps = {
  onPickNode: (
    node: ServerNode,
    event: React.PointerEvent<HTMLDivElement>
  ) => void;
};

export function NodeDock({
  onPickNode,
}: NodeDockProps) {
  const serverTemplate = new ServerNode({
    x: 0,
    y: 0,
  });

  return (
    <div
      onPointerDown={(event) =>
        event.stopPropagation()
      }
      className="
        absolute bottom-5 left-1/2 z-50
        -translate-x-1/2

        rounded-2xl
        border border-slate-200
        bg-white
        p-3

        shadow-xl
      "
    >
      <div className="mb-2 text-xs font-medium text-slate-400">
        Components
      </div>

      <div
        className="
          relative
          h-[140px]
          w-[220px]
        "
      >
        <ServerNodeView
          node={serverTemplate}
          onPointerDown={(event) => {
            event.stopPropagation();

            onPickNode(
              serverTemplate,
              event
            );
          }}
        />
      </div>
    </div>
  );
}