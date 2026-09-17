import { useEffect, useState } from "react";
import { ServerNode } from "../nodes/server/ServerNode";

type NodeDockProps = {
  onPickNode: (
    node: ServerNode,
    event: React.PointerEvent<HTMLDivElement>
  ) => void;
};

const DOCK_MARGIN = 20;

export function NodeDock({
  onPickNode,
}: NodeDockProps) {
  const serverTemplate = new ServerNode({
    x: 0,
    y: 0,
  });

  const [visualBottomInset, setVisualBottomInset] =
    useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) return;

    const updateVisualViewport = () => {
      const visibleBottom =
        viewport.offsetTop + viewport.height;

      const hiddenBelowViewport = Math.max(
        0,
        window.innerHeight - visibleBottom
      );

      setVisualBottomInset(hiddenBelowViewport);
    };

    updateVisualViewport();

    viewport.addEventListener(
      "resize",
      updateVisualViewport
    );
    viewport.addEventListener(
      "scroll",
      updateVisualViewport
    );
    window.addEventListener(
      "resize",
      updateVisualViewport
    );

    return () => {
      viewport.removeEventListener(
        "resize",
        updateVisualViewport
      );
      viewport.removeEventListener(
        "scroll",
        updateVisualViewport
      );
      window.removeEventListener(
        "resize",
        updateVisualViewport
      );
    };
  }, []);

  return (
    <div
      onPointerDown={(event) =>
        event.stopPropagation()
      }
      className="
        absolute left-1/2 z-50
        -translate-x-1/2
        rounded-2xl
        border border-slate-200
        bg-white
        p-3
        shadow-xl
      "
      style={{
        bottom: `calc(${DOCK_MARGIN + visualBottomInset}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <div className="mb-2 text-xs font-medium text-slate-400">
        Components
      </div>

      <div
        role="button"
        tabIndex={0}
        onPointerDown={(event) => {
          event.stopPropagation();
          onPickNode(serverTemplate, event);
        }}
        className="
          flex h-12 min-w-28
          cursor-grab items-center justify-center
          rounded-xl border border-slate-200
          bg-white px-5
          text-sm font-semibold text-slate-900
          shadow-sm
          transition-[transform,box-shadow,border-color]
          duration-150 ease-out
          hover:-translate-y-0.5
          hover:border-slate-300
          hover:shadow-md
          active:cursor-grabbing
          active:scale-95
        "
      >
        {serverTemplate.name}
      </div>
    </div>
  );
}
