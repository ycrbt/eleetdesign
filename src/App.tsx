import { useEffect, useState } from "react";
import "./App.css";
import Whiteboard from "./components/whiteboard/Whiteboard";
import { getProblems } from "./problems/problemRepository";
import type { ProblemDefinition } from "./problems/types";

type Screen = "problems" | "briefing" | "design";

function App() {
  const [screen, setScreen] = useState<Screen>("problems");
  const [problems, setProblems] = useState<ProblemDefinition[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<ProblemDefinition | null>(null);

  useEffect(() => { void getProblems().then(setProblems); }, []);

  if (screen === "design" && selectedProblem) {
    return <Whiteboard problemId={selectedProblem.id} onExit={() => setScreen("briefing")} onComplete={() => setScreen("problems")} />;
  }

  return <main className="min-h-dvh bg-slate-50 px-4 py-7 text-slate-900 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-5xl">
      <header className="mb-7 sm:mb-10"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">eleetdesign</div><h1 className="mt-2 text-2xl font-bold sm:text-3xl">System design challenges</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Build the architecture, watch traffic flow through it, and iterate when the system breaks.</p></header>
      {screen === "problems" ? <section><div className="mb-4 text-sm font-semibold text-slate-700">Available problems</div><div className="grid gap-4 md:grid-cols-2">{problems.map((problem,index)=><button key={problem.id} type="button" onClick={()=>{setSelectedProblem(problem);setScreen("briefing")}} className="block w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-6"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Problem {index+1}</div><div className="mt-1 text-lg font-semibold sm:text-xl">{problem.title}</div></div><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500 sm:text-xs">Traffic · Capacity</span></div><p className="mt-3 text-sm leading-6 text-slate-500">{problem.narrative}</p></button>)}</div></section> : selectedProblem && <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-8"><button type="button" onClick={()=>setScreen("problems")} className="text-sm font-medium text-slate-500 hover:text-slate-900">← All problems</button><div className="mt-6 text-xs font-semibold uppercase tracking-wide text-emerald-600">Challenge</div><h2 className="mt-2 text-2xl font-bold sm:text-3xl">{selectedProblem.title}</h2><p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">{selectedProblem.narrative}</p><div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-3"><Brief label="Traffic" value={`${selectedProblem.traffic_pattern.phases[0]?.req_per_s ?? 0} req/s`}/><Brief label="Budget" value={`≤ $${selectedProblem.constraints.max_budget_per_month}/mo`}/><Brief label="Target" value="0 dropped"/></div><div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:mt-8 sm:p-5"><div className="text-sm font-semibold">Your objective</div><p className="mt-2 text-sm leading-6 text-slate-500">Process all incoming requests continuously without exceeding the available component capacity or budget.</p></div><button type="button" onClick={()=>setScreen("design")} className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 sm:mt-8 sm:w-auto sm:py-3">Start designing →</button></section>}
    </div>
  </main>;
}
function Brief({label,value}:{label:string;value:string}){return <div className="min-w-0 rounded-xl border border-slate-200 p-3 sm:p-4"><div className="text-[10px] text-slate-400 sm:text-xs">{label}</div><div className="mt-1 break-words text-xs font-semibold text-slate-800 sm:text-sm">{value}</div></div>}
export default App;
