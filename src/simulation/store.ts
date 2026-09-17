import { create } from "zustand";
import type {
  Ball,
  ComponentInstance,
  Connection,
} from "../engine/types";
import type { ProblemDefinition } from "../problems/types";
import { getProblem } from "../problems/problemRepository";
import { getComponentDefinition } from "./componentRegistry";

export type SimulationStatus =
  | "idle"
  | "running"
  | "passed"
  | "failed";

type SimulationMetrics = {
  totalRequests: number;
  successfulRequests: number;
  rejectedRequests: number;
  throughputPerSecond: number;
  monthlyCost: number;
};

type SimulationState = {
  problem: ProblemDefinition | null;
  status: SimulationStatus;
  balls: Ball[];
  components: ComponentInstance[];
  connections: Connection[];
  metrics: SimulationMetrics;
  loadProblem: (id: string) => Promise<void>;
  addComponent: (component: ComponentInstance) => void;
  addConnection: (connection: Connection) => void;
  setBalls: (balls: Ball[]) => void;
  setStatus: (status: SimulationStatus) => void;
  resetSimulation: () => void;
};

const emptyMetrics: SimulationMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  rejectedRequests: 0,
  throughputPerSecond: 0,
  monthlyCost: 0,
};

export const useSimulationStore =
  create<SimulationState>()((set) => ({
    problem: null,
    status: "idle",
    balls: [],
    components: [],
    connections: [],
    metrics: emptyMetrics,

    loadProblem: async (id) => {
      const problem = await getProblem(id);
      set({
        problem,
        status: "idle",
        balls: [],
        components: [],
        connections: [],
        metrics: emptyMetrics,
      });
    },

    addComponent: (component) =>
      set((state) => {
        const definition = getComponentDefinition(
          component.componentType
        );

        return {
          components: [...state.components, component],
          metrics: {
            ...state.metrics,
            monthlyCost:
              state.metrics.monthlyCost +
              definition.monthlyCost,
          },
        };
      }),

    addConnection: (connection) =>
      set((state) => ({
        connections: [
          ...state.connections,
          connection,
        ],
      })),

    setBalls: (balls) => set({ balls }),
    setStatus: (status) => set({ status }),

    resetSimulation: () =>
      set({
        status: "idle",
        balls: [],
        metrics: emptyMetrics,
      }),
  }));
