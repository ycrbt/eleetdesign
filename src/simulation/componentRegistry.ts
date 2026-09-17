import type {
  Ball,
  ComponentDefinition,
  ComponentRuntimeState,
} from "../engine/types";

function evaluateCapacity(ball: Ball, state: ComponentRuntimeState) {
  if (state.activeRequests >= state.capacity) {
    return {
      type: "reject" as const,
      ball: { ...ball, state: "rejected" as const },
      reason: "capacity_overflow",
    };
  }
  return { type: "pass" as const, ball };
}

function evaluateReadCache(ball: Ball, state: ComponentRuntimeState) {
  const capacityOutcome = evaluateCapacity(ball, state);
  if (capacityOutcome.type !== "pass") return capacityOutcome;
  if (ball.metadata.operation === "read") {
    return { type: "pass" as const, ball: { ...ball, state: "success" as const } };
  }
  return capacityOutcome;
}

export const componentRegistry: Record<string, ComponentDefinition> = {
  ec2: {
    id: "ec2",
    name: "Server",
    capacity: 100,
    monthlyCost: 25,
    ports: { inputs: 1, outputs: 1 },
    evaluate: evaluateCapacity,
  },
  load_balancer: {
    id: "load_balancer",
    name: "Load Balancer",
    capacity: 1000,
    monthlyCost: 18,
    ports: { inputs: 1, outputs: 4 },
    evaluate: evaluateCapacity,
  },
  redis_cache: {
    id: "redis_cache",
    name: "Cache",
    capacity: 800,
    monthlyCost: 22,
    ports: { inputs: 1, outputs: 1 },
    evaluate: evaluateReadCache,
  },
  database: {
    id: "database",
    name: "Database",
    capacity: 120,
    monthlyCost: 30,
    ports: { inputs: 1, outputs: 1 },
    evaluate: evaluateCapacity,
  },
  cdn: {
    id: "cdn",
    name: "Edge Cache",
    capacity: 1500,
    monthlyCost: 20,
    ports: { inputs: 1, outputs: 1 },
    evaluate: evaluateReadCache,
  },
};

export function getComponentDefinition(id: string): ComponentDefinition {
  const definition = componentRegistry[id];
  if (!definition) throw new Error(`Unknown component: ${id}`);
  return definition;
}
