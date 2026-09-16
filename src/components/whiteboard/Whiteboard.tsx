import React, {
  useRef,
  useState,
} from "react";

import { NodeDock } from "../dock/NodeDock";
import { BaseNode } from "../nodes/BaseNode";

import {
  ServerNode,
  ServerNodeView,
} from "../nodes/server/ServerNode";

type Point = {
  x: number;
  y: number;
};

type DragState =
  | {
      type: "pan";
      startMouse: Point;
      startPan: Point;
    }
  | {
      type: "node";
      nodeId: string;
      offset: Point;
    }
  | null;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const GRID_SIZE = 32;

export default function Whiteboard() {
  const boardRef =
    useRef<HTMLDivElement>(null);

  const dragRef =
    useRef<DragState>(null);

  const [nodes, setNodes] = useState<
    BaseNode[]
  >([]);

  const [pan, setPan] = useState<Point>({
    x: 0,
    y: 0,
  });

  const [zoom, setZoom] = useState(1);

  const [
    draggedNodeId,
    setDraggedNodeId,
  ] = useState<string | null>(null);

  /*
   * Position used only while dragging.
   *
   * This is what makes the overlay update
   * immediately with the pointer.
   */
  const [
    dragPosition,
    setDragPosition,
  ] = useState<Point | null>(null);

  const [isPanning, setIsPanning] =
    useState(false);

  /* ==================================================
     COORDINATES
     ================================================== */

  function screenToWorld(
    clientX: number,
    clientY: number
  ): Point {
    const board = boardRef.current;

    if (!board) {
      return {
        x: 0,
        y: 0,
      };
    }

    const rect =
      board.getBoundingClientRect();

    return {
      x:
        (clientX -
          rect.left -
          pan.x) /
        zoom,

      y:
        (clientY -
          rect.top -
          pan.y) /
        zoom,
    };
  }

  /* ==================================================
     START DRAGGING EXISTING NODE
     ================================================== */

  function startNodeDrag(
    event: React.PointerEvent,
    node: BaseNode
  ) {
    event.stopPropagation();

    const mouse =
      screenToWorld(
        event.clientX,
        event.clientY
      );

    setDraggedNodeId(node.id);

    /*
     * Start the overlay at the node's
     * current position.
     */
    setDragPosition({
      ...node.position,
    });

    dragRef.current = {
      type: "node",

      nodeId: node.id,

      offset: {
        x:
          mouse.x -
          node.position.x,

        y:
          mouse.y -
          node.position.y,
      },
    };

    boardRef.current?.setPointerCapture(
      event.pointerId
    );
  }

  /* ==================================================
     PICK FROM DOCK
     ================================================== */

  function handlePickNode(
    template: BaseNode,
    event: React.PointerEvent
  ) {
    event.stopPropagation();

    const mouse =
      screenToWorld(
        event.clientX,
        event.clientY
      );

    const initialPosition = {
      x:
        mouse.x -
        template.size.width / 2,

      y:
        mouse.y -
        template.size.height / 2,
    };

    const newNode =
      createNode(
        template.type,
        initialPosition
      );

    if (!newNode) return;

    /*
     * Add the node to our model immediately.
     * It won't be rendered in the normal world
     * while draggedNodeId matches it.
     */
    setNodes((current) => [
      ...current,
      newNode,
    ]);

    setDraggedNodeId(
      newNode.id
    );

    setDragPosition(
      initialPosition
    );

    dragRef.current = {
      type: "node",

      nodeId: newNode.id,

      offset: {
        x:
          template.size.width / 2,

        y:
          template.size.height / 2,
      },
    };

    boardRef.current?.setPointerCapture(
      event.pointerId
    );
  }

  /* ==================================================
     START PANNING
     ================================================== */

  function handlePointerDown(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    if (event.button !== 0) {
      return;
    }

    dragRef.current = {
      type: "pan",

      startMouse: {
        x: event.clientX,
        y: event.clientY,
      },

      startPan: pan,
    };

    setIsPanning(true);

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  }

  /* ==================================================
     POINTER MOVE
     ================================================== */

  function handlePointerMove(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    const drag =
      dragRef.current;

    if (!drag) return;

    /* ------------------------------
       PAN
       ------------------------------ */

    if (drag.type === "pan") {
      setPan({
        x:
          drag.startPan.x +
          event.clientX -
          drag.startMouse.x,

        y:
          drag.startPan.y +
          event.clientY -
          drag.startMouse.y,
      });

      return;
    }

    /* ------------------------------
       NODE DRAG
       ------------------------------ */

    if (drag.type === "node") {
      const mouse =
        screenToWorld(
          event.clientX,
          event.clientY
        );

      /*
       * DO NOT mutate the actual node here.
       *
       * Only move the visual overlay.
       */
      setDragPosition({
        x:
          mouse.x -
          drag.offset.x,

        y:
          mouse.y -
          drag.offset.y,
      });
    }
  }

  /* ==================================================
     POINTER UP
     ================================================== */

  function handlePointerUp(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    const drag =
      dragRef.current;

    /*
     * Commit the final visual position
     * into the actual node.
     */
    if (
      drag?.type === "node" &&
      dragPosition
    ) {
      setNodes((current) =>
        current.map((node) => {
          if (
            node.id !==
            drag.nodeId
          ) {
            return node;
          }

          node.moveTo({
            ...dragPosition,
          });

          return node;
        })
      );
    }

    dragRef.current = null;

    setDraggedNodeId(null);
    setDragPosition(null);

    setIsPanning(false);

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  }

  /* ==================================================
     ZOOM
     ================================================== */

  function handleWheel(
    event: React.WheelEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    const board =
      boardRef.current;

    if (!board) return;

    const rect =
      board.getBoundingClientRect();

    const mouseX =
      event.clientX -
      rect.left;

    const mouseY =
      event.clientY -
      rect.top;

    const worldX =
      (mouseX - pan.x) /
      zoom;

    const worldY =
      (mouseY - pan.y) /
      zoom;

    const factor =
      event.deltaY < 0
        ? 1.1
        : 0.9;

    const nextZoom =
      clamp(
        zoom * factor,
        MIN_ZOOM,
        MAX_ZOOM
      );

    setPan({
      x:
        mouseX -
        worldX *
          nextZoom,

      y:
        mouseY -
        worldY *
          nextZoom,
    });

    setZoom(nextZoom);
  }

  function zoomTo(
    requestedZoom: number
  ) {
    const board =
      boardRef.current;

    if (!board) return;

    const rect =
      board.getBoundingClientRect();

    const centerX =
      rect.width / 2;

    const centerY =
      rect.height / 2;

    const worldX =
      (centerX - pan.x) /
      zoom;

    const worldY =
      (centerY - pan.y) /
      zoom;

    const nextZoom =
      clamp(
        requestedZoom,
        MIN_ZOOM,
        MAX_ZOOM
      );

    setPan({
      x:
        centerX -
        worldX *
          nextZoom,

      y:
        centerY -
        worldY *
          nextZoom,
    });

    setZoom(nextZoom);
  }

  function resetView() {
    setPan({
      x: 0,
      y: 0,
    });

    setZoom(1);
  }

  /* ==================================================
     FIND DRAGGED NODE
     ================================================== */

  const draggedNode =
    draggedNodeId
      ? nodes.find(
          (node) =>
            node.id ===
            draggedNodeId
        )
      : undefined;

  /* ==================================================
     RENDER
     ================================================== */

  return (
    <div
      ref={boardRef}

      onPointerDown={
        handlePointerDown
      }

      onPointerMove={
        handlePointerMove
      }

      onPointerUp={
        handlePointerUp
      }

      onPointerCancel={
        handlePointerUp
      }

      onWheel={
        handleWheel
      }

      className={`
        relative
        h-screen
        w-screen

        touch-none
        select-none
        overflow-hidden

        bg-slate-50

        ${
          isPanning
            ? "cursor-grabbing"
            : "cursor-grab"
        }
      `}
    >
      {/* ==========================================
          GRID
          ========================================== */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          z-0
        "
        style={{
          backgroundImage: `
            linear-gradient(
              #e2e8f0 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              #e2e8f0 1px,
              transparent 1px
            )
          `,

          backgroundSize: `
            ${GRID_SIZE * zoom}px
            ${GRID_SIZE * zoom}px
          `,

          backgroundPosition: `
            ${pan.x}px
            ${pan.y}px
          `,
        }}
      />

      {/* ==========================================
          NORMAL WHITEBOARD WORLD
          ========================================== */}

      <div
        className="
          pointer-events-none

          absolute
          left-0
          top-0

          z-10

          origin-top-left
        "
        style={{
          transform: `
            translate(
              ${pan.x}px,
              ${pan.y}px
            )
            scale(${zoom})
          `,
        }}
      >
        {nodes.map((node) => {
          /*
           * Don't render the node here while
           * we're dragging it.
           */
          if (
            node.id ===
            draggedNodeId
          ) {
            return null;
          }

          return (
            <NodeRenderer
              key={node.id}

              node={node}

              onPointerDown={(
                event
              ) =>
                startNodeDrag(
                  event,
                  node
                )
              }
            />
          );
        })}
      </div>

      {/* ==========================================
          DOCK
          ========================================== */}

      <NodeDock
        onPickNode={
          handlePickNode
        }
      />

      {/* ==========================================
          DRAG OVERLAY

          This uses dragPosition instead of the
          node's stored position.
          ========================================== */}

      {draggedNode &&
        dragPosition && (
          <div
            className="
              pointer-events-none

              absolute
              left-0
              top-0

              z-[100]

              origin-top-left
            "
            style={{
              transform: `
                translate(
                  ${pan.x}px,
                  ${pan.y}px
                )
                scale(${zoom})
              `,
            }}
          >
            <DraggedNodeRenderer
              node={
                draggedNode
              }

              position={
                dragPosition
              }
            />
          </div>
        )}

      {/* ==========================================
          ZOOM CONTROLS
          ========================================== */}

      <div
        onPointerDown={(
          event
        ) =>
          event.stopPropagation()
        }

        className="
          absolute
          bottom-5
          right-5

          z-50

          flex
          items-center

          overflow-hidden
          rounded-xl

          border
          border-slate-200

          bg-white

          shadow-lg
          shadow-slate-900/5
        "
      >
        <button
          type="button"

          onClick={() =>
            zoomTo(
              zoom -
              ZOOM_STEP
            )
          }

          className="
            grid
            h-10
            w-10
            place-items-center

            text-lg
            text-slate-600

            hover:bg-slate-100
          "
        >
          −
        </button>

        <button
          type="button"

          onClick={
            resetView
          }

          className="
            min-w-16

            border-x
            border-slate-200

            px-3
            py-2

            text-xs
            font-medium
            text-slate-600

            hover:bg-slate-100
          "
        >
          {Math.round(
            zoom * 100
          )}
          %
        </button>

        <button
          type="button"

          onClick={() =>
            zoomTo(
              zoom +
              ZOOM_STEP
            )
          }

          className="
            grid
            h-10
            w-10
            place-items-center

            text-lg
            text-slate-600

            hover:bg-slate-100
          "
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ==================================================
   NODE FACTORY
   ================================================== */

function createNode(
  type: string,
  position: Point
): BaseNode | null {
  switch (type) {
    case "server":
      return new ServerNode(
        position
      );

    default:
      console.warn(
        `Unknown node type: ${type}`
      );

      return null;
  }
}

/* ==================================================
   NORMAL NODE RENDERER
   ================================================== */

type NodeRendererProps = {
  node: BaseNode;

  onPointerDown: (
    event: React.PointerEvent<HTMLDivElement>
  ) => void;
};

function NodeRenderer({
  node,
  onPointerDown,
}: NodeRendererProps) {
  if (
    node instanceof
    ServerNode
  ) {
    return (
      <ServerNodeView
        node={node}

        onPointerDown={
          onPointerDown
        }
      />
    );
  }

  return null;
}

/* ==================================================
   DRAGGED NODE RENDERER
   ================================================== */

function DraggedNodeRenderer({
  node,
  position,
}: {
  node: BaseNode;
  position: Point;
}) {
  /*
   * We need the same node visually, but at the
   * temporary drag position.
   *
   * Create a temporary rendering copy instead of
   * changing the real node.
   */

  if (
    node instanceof
    ServerNode
  ) {
    const preview =
      new ServerNode(
        position
      );

    /*
     * Copy properties that affect its appearance.
     */
    preview.capacity =
      node.capacity;

    preview.processingTime =
      node.processingTime;

    return (
      <ServerNodeView
        node={preview}
        isDragging
      />
    );
  }

  return null;
}

/* ==================================================
   HELPERS
   ================================================== */

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  );
}