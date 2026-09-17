import type {
  Ball,
  ComponentInstance,
  Connection,
} from "../engine/types";
import type { ProblemDefinition } from "../problems/types";
import { getComponentDefinition } from "./componentRegistry";
import {
  generateTraffic,
  getTrafficPhase,
} from "./trafficGenerator";
import {
  sampleBalls,
  successRate,
  type SimulationSample,
} from "./metricsTracker";

export type SimulationTick = {
  second: number;
  balls: Ball[];
  samples: SimulationSample[];
  successRate: number;
  finished: boolean;
  passed: boolean | null;
};

type EngineConfig = {
  problem: ProblemDefinition;
  components: ComponentInstance[];
  connections: Connection[];
};

export class SimulationEngine {
  private second = 0;
  private samples: SimulationSample[] = [];
  private readonly problem: ProblemDefinition;
  private readonly components: ComponentInstance[];
  private readonly connections: Connection[];

  constructor(config: EngineConfig) {
    this.problem = config.problem;
    this.components = config.components;
    this.connections = config.connections;
  }

  tick(): SimulationTick {
    const phase = getTrafficPhase(
      this.problem.traffic_pattern.phases,
      this.second
    );

    if (!phase) return this.finish();

    const generated = generateTraffic(
      phase,
      this.second,
      phase.req_per_s
    );

    const balls = generated.map((ball) => this.routeBall(ball));
    const sample = sampleBalls(this.second, balls);
    this.samples = [...this.samples, sample];

    const rate = successRate(
      this.samples,
      this.problem.win_condition.evaluation_window_s,
      this.second
    );

    this.second += 1;

    return {
      second: this.second,
      balls,
      samples: this.samples,
      successRate: rate,
      finished: false,
      passed: null,
    };
  }

  private routeBall(ball: Ball): Ball {
    if (this.components.length === 0) {
      return { ...ball, state: "rejected" };
    }

    const incoming = new Set(
      this.connections.map((connection) => connection.targetId)
    );
    const entry = this.components.find(
      (component) => !incoming.has(component.id)
    );

    if (!entry) return { ...ball, state: "rejected" };

    let current: ComponentInstance | undefined = entry;
    let routedBall = ball;
    const visited = new Set<string>();

    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      const definition = getComponentDefinition(current.componentType);
      const sameSecondVisits = this.samples.length === 0
        ? 0
        : 0;
      const outcome = definition.evaluate(routedBall, {
        activeRequests: sameSecondVisits,
        capacity: definition.capacity,
      });

      routedBall = outcome.ball;
      if (outcome.type !== "pass") return routedBall;

      const outgoing = this.connections.filter(
        (connection) => connection.sourceId === current?.id
      );

      if (outgoing.length === 0) {
        return { ...routedBall, state: "success" };
      }

      const nextConnection = outgoing[
        Math.floor(Math.random() * outgoing.length)
      ];
      current = this.components.find(
        (component) => component.id === nextConnection.targetId
      );
    }

    return { ...routedBall, state: "rejected" };
  }

  private finish(): SimulationTick {
    const currentSecond = Math.max(0, this.second - 1);
    const rate = successRate(
      this.samples,
      this.problem.win_condition.evaluation_window_s,
      currentSecond
    );
    const monthlyCost = this.components.reduce(
      (sum, component) =>
        sum + getComponentDefinition(component.componentType).monthlyCost,
      0
    );
    const passed =
      rate >= this.problem.win_condition.min_success_rate &&
      monthlyCost <= this.problem.constraints.max_budget_per_month;

    return {
      second: this.second,
      balls: [],
      samples: this.samples,
      successRate: rate,
      finished: true,
      passed,
    };
  }
}
