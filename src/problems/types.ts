export type TrafficPhase = {
  duration_s: number;
  req_per_s: number;
  read_write_ratio: number;
};

export type CapacityOverflowFailureCondition = {
  type: "capacity_overflow";
};

export type ProblemDefinition = {
  id: string;
  title: string;
  narrative: string;
  components_available: string[];
  traffic_pattern: {
    phases: TrafficPhase[];
  };
  constraints: {
    max_budget_per_month: number;
  };
  failure_condition: CapacityOverflowFailureCondition;
  win_condition: {
    min_success_rate: number;
    evaluation_window_s: number;
  };
};
