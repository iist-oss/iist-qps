import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FaSearch, FaLink } from "react-icons/fa";
import { searchPapers } from "../api/papers";
import Stats from "../components/Stats";
import SearchResults from "../components/SearchResults";
import { ALL_EXAM_FILTERS, parseExamFilter } from "../lib/papers";
import { university } from "../config/university";
import type { ExamFilter, Paper } from "../types";

const EXAM_LABELS: Record<ExamFilter, string> = { midsem: "Midsem", endsem: "Endsem", ct: "Class test" };

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("query") ?? "");
  const [exams, setExams] = useState<ExamFilter[]>(parseExamFilter(params.get("exam")));
  const [results, setResults] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Search by course name or code.");

  async function run(q: string, ex: ExamFilter[]) {
    if (q.trim() === "") return;
    setLoading(true);
    const { data, error } = await searchPapers(q.trim(), ex);
    setLoading(false);
    if (error) {
      console.error(error);
      setResults([]);
      setMessage("Something went wrong. Please try again.");
    } else {
      setResults(data);
      setMessage(data.length === 0 ? "No results. Try another query." : "");
    }
  }

  // Run once on load if the link carries a query
  useEffect(() => { void run(query, exams); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setParams({ query, exam: exams.join(",") }, { replace: true });
    void run(query, exams);
  }

  function toggleExam(ex: ExamFilter, checked: boolean) {
    setExams((cur) => (checked ? [...cur, ex] : cur.filter((x) => x !== ex)));
  }

  async function shareSearch() {
    try { await navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }
    catch { toast.error("Could not copy the link"); }
  }

  return (
    <div className="page">
      <h1>{university.name}</h1>
      <p className="subtitle">{university.tagline}</p>
      <Stats />
      <form className="search-form" onSubmit={onSubmit}>
        <label htmlFor="q">Course name or code</label>
        <input id="q" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        <div className="checks">
          {ALL_EXAM_FILTERS.map((ex) => (
            <label key={ex}>
              <input type="checkbox" checked={exams.includes(ex)} onChange={(e) => toggleExam(ex, e.target.checked)} />
              {EXAM_LABELS[ex]}
            </label>
          ))}
        </div>
        <div className="row">
          <button type="submit" disabled={loading}><FaSearch /> Search</button>
          <button type="button" onClick={shareSearch} disabled={loading || results.length === 0}><FaLink /> Share results</button>
        </div>
      </form>
      {loading ? <p className="message">Searching…</p>
        : results.length > 0 ? <SearchResults results={results} />
        : <p className="message">{message}</p>}
    </div>
  );
}
