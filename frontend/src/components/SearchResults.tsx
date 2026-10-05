import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaFilePdf, FaFlag, FaLink } from "react-icons/fa";
import { signedFileUrl } from "../api/papers";
import {
  availableYears, examTag, examTooltip, filterAndSort, paperTitle, semesterTag, semesterTooltip,
  type SortBy, type SortOrder,
} from "../lib/papers";
import { university } from "../config/university";
import type { Paper } from "../types";

async function openPdf(filePath: string) {
  // Open the tab first (inside the click) so pop-up blockers allow it, then point it at the signed link.
  const tab = window.open("", "_blank");
  const url = await signedFileUrl(filePath);
  if (!url) { tab?.close(); toast.error("Could not open the PDF. Please sign in again."); return; }
  if (tab) { tab.opener = null; tab.location.href = url; } else window.location.href = url;
}

async function copyLink(filePath: string) {
  const url = await signedFileUrl(filePath);
  if (!url) { toast.error("Could not create the link"); return; }
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied. It stops working after 1 hour.");
  } catch {
    toast.error("Could not copy the link");
  }
}

function ResultCard({ paper }: { paper: Paper }) {
  const reportHref = `mailto:${university.contact.email}?subject=${encodeURIComponent(`Report paper #${paper.id}`)}`
    + `&body=${encodeURIComponent(`Paper: ${paperTitle(paper)} ${paper.year}\nPaper id: ${paper.id}\n\nWhat is wrong (wrong details, names or roll numbers visible, copyright, other): `)}`;
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
        <button className="icon-btn" onClick={() => void openPdf(paper.file_path)} title="Open PDF" aria-label={`Open PDF: ${paperTitle(paper)} ${paper.year}`}><FaFilePdf /></button>
        <button className="icon-btn" onClick={() => void copyLink(paper.file_path)} title="Copy link to PDF" aria-label="Copy link to PDF"><FaLink /></button>
        <a className="icon-btn" href={reportHref} title="Report a problem with this paper" aria-label="Report a problem with this paper"><FaFlag /></a>
      </div>
    </div>
  );
}

export default function SearchResults({ results }: { results: Paper[] }) {
  const [year, setYear] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("relevance");
  const [order, setOrder] = useState<SortOrder>("descending");
  const [semester, setSemester] = useState<"all" | "odd" | "even">("all");

  const years = useMemo(() => availableYears(results), [results]);
  const shown = useMemo(() => filterAndSort(results, { year, sortBy, order, semester }), [results, year, sortBy, order, semester]);

  return (
    <div className="results">
      <div className="filters">
        <select aria-label="Filter by year" value={year ?? "all"} onChange={(e) => setYear(e.target.value === "all" ? null : Number(e.target.value))}>
          <option value="all">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select aria-label="Filter by semester" value={semester} onChange={(e) => setSemester(e.target.value as "all" | "odd" | "even")}>
          <option value="all">All semesters</option>
          <option value="odd">Odd semester</option>
          <option value="even">Even semester</option>
        </select>
        <select aria-label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
          <option value="relevance">Sort by relevance</option>
          <option value="year">Sort by year</option>
          <option value="course_name">Sort by course name</option>
        </select>
        <select aria-label="Sort order" value={order} onChange={(e) => setOrder(e.target.value as SortOrder)} disabled={sortBy === "relevance"}>
          <option value="descending">Descending</option>
          <option value="ascending">Ascending</option>
        </select>
      </div>
      {shown.length === 0 ? <p className="message">No results for this filter.</p>
        : shown.map((p) => <ResultCard key={p.id} paper={p} />)}
    </div>
  );
}
