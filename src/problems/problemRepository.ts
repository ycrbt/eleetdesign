import urlShortenerProblem from "./url-shortener.json";
import loadBalancerProblem from "./load-balancer.json";
import type { ProblemDefinition } from "./types";

const problems: Record<string, ProblemDefinition> = {
  "url-shortener-v1": urlShortenerProblem as ProblemDefinition,
  "load-balancer-v1": loadBalancerProblem as ProblemDefinition,
};

export async function getProblem(id: string): Promise<ProblemDefinition> {
  const problem = problems[id];
  if (!problem) throw new Error(`Unknown problem: ${id}`);
  return Promise.resolve(problem);
}

export async function getProblems(): Promise<ProblemDefinition[]> {
  return Promise.resolve(Object.values(problems));
}
