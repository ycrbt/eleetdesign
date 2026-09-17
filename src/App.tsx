import { useEffect, useState } from "react";
import "./App.css";
import Whiteboard from "./components/whiteboard/Whiteboard";
import { getProblem } from "./problems/problemRepository";
import type { ProblemDefinition } from "./problems/types";

type Screen = "problems" | "briefing" | "design";

function App() {
  const [screen, setScreen] = useState<Screen>("problems");
  const [problem, setProblem] = useState<ProblemDefinition | null>(null);

  useEffect(() => {
    void getProblem("url-shortener-v1").then(setProblem);
  }, []);

  if (screen === "design") {
    return <Whiteboard onExit={() => setScreen("briefing")} />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">eleetdesign</div>
          <h1 className="mt-2 text-3xl font-bold">System design challenges</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Build the architecture, run real traffic through it, and iterate when the system breaks.
          </p>
        </header>

        {screen === "problems" ? (
          <section>
            <div className="mb-4 text-sm font-semibold text-slate-700">Available problems</div>
            <button
              type="button"
              disabled={!problem}
              onClick={() => setScreen("briefing")}
              className="block w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Problem 1</div>
                  <div className="mt-1 text-xl font-semibold">{problem?.title ?? "Loading…"}</div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Traffic · Capacity</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">{problem?.narrative}</p>
            </button>
          </section>
        ) : (
          <section className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <button type="button" onClick={() => setScreen("problems")} className="text-sm font-medium text-slate-500 hover:text-slate-900">
              ← All problems
            </button>
            <div className="mt-8 text-xs font-semibold uppercase tracking-wide text-emerald-600">Problem 1</div>
            <h2 className="mt-2 text-3xl font-bold">{problem?.title}</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">{problem?.narrative}</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Brief label="Traffic" value="10 → 500 req/s" />
              <Brief label="Budget" value={`≤ $${problem?.constraints.max_budget_per_month ?? 100}/mo`} />
              <Brief label="Target" value={`≥ ${((problem?.win_condition.min_success_rate ?? 0.99) * 100).toFixed(0)}% success`} />
            </div>

            <div className="mt-8 rounded-2xl bg-slate-50 p-5">
              <div className="text-sm font-semibold">Your objective</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Design a system that survives the full traffic pattern while staying within budget. The exact architecture is up to you.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setScreen("design")}
              className="mt-8 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Start designing →
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

function Brief({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

export default App;
