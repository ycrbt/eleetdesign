import { create } from "zustand";
import type { Ball, ComponentInstance, Connection } from "../engine/types";
import type { ProblemDefinition } from "../problems/types";
import { getProblem } from "../problems/problemRepository";
import { getComponentDefinition } from "./componentRegistry";

export type SimulationStatus = "idle" | "running" | "passed" | "failed";

export type SimulationMetrics = {
  totalRequests: number;
  successfulRequests: number;
  rejectedRequests: number;
  throughputPerSecond: number;
  monthlyCost: number;
  successRate: number;
  elapsedSeconds: number;
};

type SimulationState = {
  problem: ProblemDefinition | null;
  status: SimulationStatus;
  balls: Ball[];
  components: ComponentInstance[];
  connections: Connection[];
  metrics: SimulationMetrics;
  loadProblem: (id: string) => Promise<void>;
  setDesign: (components: ComponentInstance[], connections: Connection[]) => void;
  applyTick: (balls: Ball[], successRate: number, elapsedSeconds: number) => void;
  setStatus: (status: SimulationStatus) => void;
  resetSimulation: () => void;
};

const emptyMetrics: SimulationMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  rejectedRequests: 0,
  throughputPerSecond: 0,
  monthlyCost: 0,
  successRate: 1,
  elapsedSeconds: 0,
};

export const useSimulationStore = create<SimulationState>()((set) => ({
  problem: null,
  status: "idle",
  balls: [],
  components: [],
  connections: [],
  metrics: emptyMetrics,

  loadProblem: async (id) => {
    const problem = await getProblem(id);
    set({ problem, status: "idle", balls: [], components: [], connections: [], metrics: emptyMetrics });
  },

  setDesign: (components, connections) => {
    const monthlyCost = components.reduce(
      (sum, component) => sum + getComponentDefinition(component.componentType).monthlyCost,
      0
    );
    set((state) => ({
      components,
      connections,
      metrics: { ...state.metrics, monthlyCost },
    }));
  },

  applyTick: (balls, successRate, elapsedSeconds) =>
    set((state) => {
      const successful = balls.filter((ball) => ball.state === "success").length;
      const rejected = balls.filter((ball) => ball.state === "rejected").length;
      return {
        balls,
        metrics: {
          ...state.metrics,
          totalRequests: state.metrics.totalRequests + balls.length,
          successfulRequests: state.metrics.successfulRequests + successful,
          rejectedRequests: state.metrics.rejectedRequests + rejected,
          throughputPerSecond: successful,
          successRate,
          elapsedSeconds,
        },
      };
    }),

  setStatus: (status) => set({ status }),

  resetSimulation: () =>
    set((state) => ({
      status: "idle",
      balls: [],
      metrics: { ...emptyMetrics, monthlyCost: state.metrics.monthlyCost },
    })),
}));
