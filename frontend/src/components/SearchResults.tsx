import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaFilePdf, FaLink } from "react-icons/fa";
import { publicFileUrl } from "../api/papers";
import {
  availableYears, examTag, examTooltip, filterAndSort, paperTitle, semesterTag, semesterTooltip,
  type SortBy, type SortOrder,
} from "../lib/papers";
import type { Paper } from "../types";

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  } catch {
    toast.error("Could not copy the link");
  }
}

function ResultCard({ paper }: { paper: Paper }) {
  const url = publicFileUrl(paper.file_path);
  return (
    <div className="result-card">
      <div className="result-info">
        <p className="result-title">{paperTitle(paper)}</p>
        <div className="tags">
          <span className="tag">{paper.year}</span>
          <span className="tag" title={examTooltip(paper.exam)}>{examTag(paper.exam)}</span>
          <span className="tag" title={semesterTooltip(paper.semester)}>{semesterTag(paper.semester)}</span>
          {paper.note !== "" && <span className="tag">{paper.note}</span>}
        </div>
      </div>
      <div className="result-btns">
        <a className="icon-btn" href={url} target="_blank" rel="noopener noreferrer" title="Open PDF"><FaFilePdf /></a>
        <button className="icon-btn" onClick={() => copyLink(url)} title="Copy link to PDF"><FaLink /></button>
      </div>
    </div>
  );
}

export default function SearchResults({ results }: { results: Paper[] }) {
  const [year, setYear] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("relevance");
  const [order, setOrder] = useState<SortOrder>("descending");

  const years = useMemo(() => availableYears(results), [results]);
  const shown = useMemo(() => filterAndSort(results, { year, sortBy, order }), [results, year, sortBy, order]);

  return (
    <div className="results">
      <div className="filters">
        <select value={year ?? "all"} onChange={(e) => setYear(e.target.value === "all" ? null : Number(e.target.value))}>
          <option value="all">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
          <option value="relevance">Sort by relevance</option>
          <option value="year">Sort by year</option>
          <option value="course_name">Sort by course name</option>
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value as SortOrder)} disabled={sortBy === "relevance"}>
          <option value="descending">Descending</option>
          <option value="ascending">Ascending</option>
        </select>
      </div>
      {shown.length === 0 ? <p className="message">No results for this filter.</p>
        : shown.map((p) => <ResultCard key={p.id} paper={p} />)}
    </div>
  );
}
