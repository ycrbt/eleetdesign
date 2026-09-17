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
    return (
      <Whiteboard
        onExit={() => setScreen("briefing")}
        onComplete={() => setScreen("problems")}
      />
    );
  }

  return (
    <main className="min-h-[100dvh] bg-slate-50 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7 sm:mb-10">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">eleetdesign</div>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">System design challenges</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Build the architecture, watch traffic flow through it, and iterate when the system breaks.
          </p>
        </header>

        {screen === "problems" ? (
          <section>
            <div className="mb-4 text-sm font-semibold text-slate-700">Available problems</div>
            <button
              type="button"
              disabled={!problem}
              onClick={() => setScreen("briefing")}
              className="block w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition active:scale-[0.99] sm:p-6 sm:hover:-translate-y-0.5 sm:hover:border-slate-300 sm:hover:shadow-md disabled:opacity-60"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Problem 1</div>
                  <div className="mt-1 text-lg font-semibold sm:text-xl">{problem?.title ?? "Loading…"}</div>
                </div>
                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Traffic · Capacity</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">{problem?.narrative}</p>
            </button>
          </section>
        ) : (
          <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-8">
            <button type="button" onClick={() => setScreen("problems")} className="min-h-11 text-sm font-medium text-slate-500 hover:text-slate-900">
              ← All problems
            </button>
            <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-emerald-600 sm:mt-8">Problem 1</div>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{problem?.title}</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">{problem?.narrative}</p>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-3">
              <Brief label="Traffic" value="40 req/s" />
              <Brief label="Budget" value={`≤ $${problem?.constraints.max_budget_per_month ?? 100}/mo`} />
              <Brief label="Target" value="0 dropped" />
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:mt-8 sm:p-5">
              <div className="text-sm font-semibold">Your objective</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Add a server, connect the request source to it, and process all incoming traffic without exceeding capacity or budget.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setScreen("design")}
              className="mt-6 min-h-12 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white active:scale-[0.99] sm:mt-8 sm:w-auto sm:hover:bg-slate-800"
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
    <div className="min-w-0 rounded-xl border border-slate-200 p-3 sm:p-4">
      <div className="text-[10px] text-slate-400 sm:text-xs">{label}</div>
      <div className="mt-1 break-words text-xs font-semibold text-slate-800 sm:text-sm">{value}</div>
    </div>
  );
}

export default App;
