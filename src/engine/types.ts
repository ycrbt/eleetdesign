export type BallState =
  | "in_flight"
  | "success"
  | "rejected"
  | "conflicted"
  | "stale";

export type Ball = {
  id: string;
  type: "request";
  payload: Record<string, unknown>;
  metadata: {
    origin?: string;
    legitimate?: boolean;
    operation?: "read" | "write";
    [key: string]: unknown;
  };
  state: BallState;
};

export type ComponentOutcome =
  | { type: "pass"; ball: Ball }
  | { type: "reject"; ball: Ball; reason?: string }
  | { type: "conflict"; ball: Ball; reason?: string };

export type ComponentRuntimeState = {
  activeRequests: number;
  capacity: number;
};

export type ComponentEvaluator = (
  ball: Ball,
  state: ComponentRuntimeState
) => ComponentOutcome;

export type ComponentDefinition = {
  id: string;
  name: string;
  capacity: number;
  monthlyCost: number;
  ports: {
    inputs: number;
    outputs: number;
  };
  evaluate: ComponentEvaluator;
};

export type ComponentInstance = {
  id: string;
  componentType: string;
  x: number;
  y: number;
};

export type Connection = {
  id: string;
  sourceId: string;
  targetId: string;
};
