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
      className="absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-xl backdrop-blur sm:bottom-5 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:p-3"
    >
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:mb-2 sm:text-xs sm:normal-case sm:tracking-normal">Add component</div>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
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
              className="flex h-12 min-w-[92px] shrink-0 cursor-grab items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-900 shadow-sm transition active:scale-95 active:cursor-grabbing sm:h-11 sm:min-w-0 sm:hover:-translate-y-0.5 sm:hover:border-slate-300 sm:hover:shadow-md"
            >
              {definition.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}
