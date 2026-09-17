import type { Ball } from "../engine/types";

export type SimulationSample = {
  second: number;
  total: number;
  successful: number;
  rejected: number;
};

export function sampleBalls(
  second: number,
  balls: Ball[]
): SimulationSample {
  return {
    second,
    total: balls.length,
    successful: balls.filter((ball) => ball.state === "success").length,
    rejected: balls.filter((ball) => ball.state === "rejected").length,
  };
}

export function successRate(
  samples: SimulationSample[],
  windowSeconds: number,
  currentSecond: number
): number {
  const windowStart = Math.max(0, currentSecond - windowSeconds + 1);
  const window = samples.filter((sample) => sample.second >= windowStart);
  const total = window.reduce((sum, sample) => sum + sample.total, 0);
  const successful = window.reduce(
    (sum, sample) => sum + sample.successful,
    0
  );

  return total === 0 ? 1 : successful / total;
}
