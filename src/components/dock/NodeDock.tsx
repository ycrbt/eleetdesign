import { InfrastructureNode } from "../nodes/infrastructure/InfrastructureNode";
import { componentRegistry } from "../../simulation/componentRegistry";

type NodeDockProps = {
  available: string[];
  onPickNode: (
    node: InfrastructureNode,
    event: React.PointerEvent<HTMLDivElement>
  ) => void;
};

export function NodeDock({ available, onPickNode }: NodeDockProps) {
  return (
    <div
      onPointerDown={(event) => event.stopPropagation()}
      className="absolute bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
    >
      <div className="mb-2 text-xs font-medium text-slate-400">Components</div>
      <div className="flex gap-2">
        {available.map((componentType) => {
          const definition = componentRegistry[componentType];
          if (!definition) return null;
          const template = new InfrastructureNode(componentType, { x: 0, y: 0 });

          return (
            <div
              key={componentType}
              role="button"
              tabIndex={0}
              onPointerDown={(event) => {
                event.stopPropagation();
                onPickNode(template, event);
              }}
              className="flex h-11 cursor-grab items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:cursor-grabbing active:scale-95"
            >
              {definition.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}
