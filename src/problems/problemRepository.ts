import urlShortenerProblem from "./url-shortener.json";
import type { ProblemDefinition } from "./types";

const problems: Record<string, ProblemDefinition> = {
  "url-shortener-v1": urlShortenerProblem as ProblemDefinition,
};

export async function getProblem(
  id: string
): Promise<ProblemDefinition> {
  const problem = problems[id];

  if (!problem) {
    throw new Error(`Unknown problem: ${id}`);
  }

  return Promise.resolve(problem);
}
