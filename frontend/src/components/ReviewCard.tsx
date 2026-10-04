import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { courseCatalogue } from "../config/courses";
import { listSameCourseYear, savePaper, signedPdfUrl, notifyChanged } from "../api/admin";
import { ageLabel, approveProblems, findSimilar, formToFields, normCode, paperToForm, type AdminPaper } from "../lib/admin";
import { withCourseName } from "../lib/courses";
import { EXAM_OPTIONS, SEMESTER_OPTIONS, type FormDetails } from "../lib/upload";
import type { SemesterValue } from "../lib/autofill";

interface Props {
  paper: AdminPaper;
  /** pending = not yet approved; approved = already public (edit / unapprove / takedown). */
  mode: "pending" | "approved";
  onDone: (id: number) => void;          // the card left this list (approved / unapproved / replaced)
  onDelete: (id: number) => void;        // parent shows the 8 s undo
  onReplaced: (ids: number[]) => void;   // duplicates that were moved to trash
}

export default function ReviewCard({ paper, mode, onDone, onDelete, onReplaced }: Props) {
  const [form, setForm] = useState<FormDetails>(() => withCourseName(paperToForm(paper), courseCatalogue));
  const [url, setUrl] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [similar, setSimilar] = useState<AdminPaper[]>([]);
  const [replace, setReplace] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const set = (c: Partial<FormDetails>) => { setForm((f) => ({ ...f, ...c })); setProblems([]); };

  // Look for probable duplicates whenever code / year / exam / semester change (debounced).
  const code = normCode(form.course_code);
  const year = Number(form.year);
  useEffect(() => {
    if (code === "" || !Number.isInteger(year)) { setSimilar([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const rows = await listSameCourseYear(code, year);
      if (!cancelled) setSimilar(findSimilar({ id: paper.id, course_code: code, year, exam: form.exam, semester: form.semester, note: form.note }, rows));
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [paper.id, code, year, form.exam, form.semester, form.note]);
  const replaceIds = useMemo(() => similar.filter((s) => replace.has(s.id)).map((s) => s.id), [similar, replace]);

  async function openPdf(path: string, inline: boolean) {
    const r = await signedPdfUrl(path);
    if (!r.ok) { toast.error(r.error); return; }
    if (inline) { setUrl(r.data); setShowPdf(true); } else window.open(r.data, "_blank", "noopener");
  }

  async function submit(approve: boolean) {
    const nowYear = new Date().getFullYear();
    if (approve) {
      const p = approveProblems(form, nowYear);
      if (p.length) { setProblems(p); return; }
    }
    setBusy(true);
    const r = await savePaper(paper.id, formToFields(form), approve, approve ? replaceIds : []);
    setBusy(false);
    if (!r.ok) { setProblems([r.error]); return; }
    notifyChanged();
    if (replaceIds.length) onReplaced(replaceIds);
    if (mode === "pending" && approve) { toast.success("Approved."); onDone(paper.id); }
    else if (mode === "approved" && !approve) { toast.success("Unapproved (back in the review queue)."); onDone(paper.id); }
    else toast.success("Saved.");
  }

  const id = (n: string) => `${n}-${paper.id}`;
  return (
    <div className="upload-card review-card">
      <div className="upload-card-head">
        <b className="file-name">#{paper.id} · {paper.course_code || "no code"} · {paper.year}</b>
        <span className="muted">{ageLabel(paper.upload_timestamp)}{paper.from_library ? " · library" : ""}</span>
      </div>

      <div className="review-actions">
        <button type="button" onClick={() => (showPdf ? setShowPdf(false) : openPdf(paper.file_path, true))}>
          {showPdf ? "Hide PDF" : "Preview PDF"}
        </button>
        <button type="button" onClick={() => openPdf(paper.file_path, false)}>Open in new tab</button>
      </div>
      {showPdf && url && (
        <div className="pdf-frame">
          <iframe src={url} title={`Paper ${paper.id}`} />
          <p className="muted">If the preview stays blank (some phones cannot show PDFs here), use “Open in new tab”.</p>
        </div>
      )}

      <div className="upload-fields">
        <label htmlFor={id("code")}>Course code</label>
        <input id={id("code")} value={form.course_code} autoCapitalize="characters" onChange={(e) => set({ course_code: e.target.value })} />
        <label htmlFor={id("name")}>Course name</label>
        <input id={id("name")} value={form.course_name} onChange={(e) => set({ course_name: e.target.value })} />
        <label htmlFor={id("year")}>Year</label>
        <input id={id("year")} value={form.year} inputMode="numeric" maxLength={4} onChange={(e) => set({ year: e.target.value.replace(/\D/g, "") })} />
        <label htmlFor={id("exam")}>Exam</label>
        <select id={id("exam")} value={form.exam} onChange={(e) => set({ exam: e.target.value })}>
          {EXAM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label htmlFor={id("sem")}>Semester</label>
        <select id={id("sem")} value={form.semester} onChange={(e) => set({ semester: e.target.value as SemesterValue })}>
          {SEMESTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value === "" ? "Choose…" : o.label}</option>)}
        </select>
        <label htmlFor={id("note")}>Note</label>
        <input id={id("note")} value={form.note} maxLength={200} onChange={(e) => set({ note: e.target.value })} />
      </div>

      {similar.length > 0 && (
        <div className="similar-box">
          <b>Possible duplicates</b>
          <p className="muted">Same course, year and exam. Tick one to replace it with this paper (it goes to the trash when you approve).</p>
          {similar.map((s) => (
            <label key={s.id} className="similar-row">
              <input type="checkbox" checked={replace.has(s.id)} disabled={mode === "approved"}
                onChange={(e) => setReplace((cur) => { const n = new Set(cur); if (e.target.checked) n.add(s.id); else n.delete(s.id); return n; })} />
              <span>#{s.id} · {s.approve_status ? "approved" : "pending"} · {s.course_name || "no name"} {s.note ? `(${s.note})` : ""}</span>
              <button type="button" className="link-btn" onClick={() => openPdf(s.file_path, false)}>view</button>
            </label>
          ))}
        </div>
      )}

      {problems.length > 0 && (
        <div className="form-error" role="alert">{problems.map((p) => <p key={p}>{p}</p>)}</div>
      )}

      <div className="upload-actions">
        {mode === "pending" ? (
          <>
            <button type="button" disabled={busy} onClick={() => submit(true)}>{busy ? "Working…" : "Approve"}</button>
            <button type="button" disabled={busy} onClick={() => submit(false)}>Save only</button>
          </>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={() => submit(true)}>{busy ? "Working…" : "Save changes"}</button>
            <button type="button" disabled={busy} onClick={() => submit(false)}>Unapprove</button>
          </>
        )}
        <button type="button" disabled={busy} className="danger" onClick={() => onDelete(paper.id)}>Delete</button>
      </div>
    </div>
  );
}
