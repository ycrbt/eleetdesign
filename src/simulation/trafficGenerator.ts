import type { Ball } from "../engine/types";
import type { TrafficPhase } from "../problems/types";

export function getTrafficPhase(
  phases: TrafficPhase[],
  elapsedSeconds: number
): TrafficPhase | null {
  let cursor = 0;

  for (const phase of phases) {
    cursor += phase.duration_s;
    if (elapsedSeconds < cursor) return phase;
  }

  return null;
}

export function generateTraffic(
  phase: TrafficPhase,
  elapsedSeconds: number,
  count: number
): Ball[] {
  return Array.from({ length: count }, (_, index) => {
    const read = Math.random() < phase.read_write_ratio;

    return {
      id: `request-${elapsedSeconds}-${index}-${crypto.randomUUID()}`,
      type: "request" as const,
      payload: {},
      metadata: {
        origin: "legitimate",
        legitimate: true,
        operation: read ? "read" : "write",
      },
      state: "in_flight" as const,
    };
  });
}
