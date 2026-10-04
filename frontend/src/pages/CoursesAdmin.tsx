import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { deleteCourse, listCourses, saveCourses, type CourseEntry } from "../api/courses";
import { parseCourseList } from "../lib/courseList";

/** Admin > Courses: paste a course list, check the preview, save. Approving papers also adds courses by itself. */
export default function CoursesAdmin() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<CourseEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const parsed = useMemo(() => parseCourseList(text), [text]);

  async function reload() {
    const r = await listCourses();
    if (r.ok) { setRows(r.data); setError(null); } else setError(r.error);
  }
  useEffect(() => { void reload(); }, []);

  async function save() {
    setBusy(true);
    const r = await saveCourses(parsed.rows);
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`${r.data} course(s) saved.`);
    setText("");
    void reload();
  }

  async function remove(code: string) {
    if (!window.confirm(`Remove ${code} from the catalogue? Papers are not affected.`)) return;
    const r = await deleteCourse(code);
    if (!r.ok) { toast.error(r.error); return; }
    setRows((cur) => (cur ? cur.filter((c) => c.code !== code) : cur));
  }

  const shown = (rows ?? []).filter((c) => `${c.code} ${c.name}`.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <>
      <p className="muted">
        Courses are added automatically when you approve a paper. To add many at once, paste the course list here, one
        course per line (for example <code>MA121C Linear Algebra</code>). Credits like 3-1-0-4 are ignored.
      </p>
      <textarea className="course-paste" rows={6} value={text} onChange={(e) => setText(e.target.value)}
        placeholder={"MA121C Linear Algebra\nPH121C Waves and Optics"} aria-label="Course list" />
      {text.trim() !== "" && (
        <div className="similar-box">
          <p>{parsed.rows.length} course(s) found{parsed.skipped.length > 0 ? `, ${parsed.skipped.length} line(s) skipped` : ""}. Existing codes get the new name.</p>
          {parsed.rows.slice(0, 50).map((r) => <div key={r.code}><b>{r.code}</b> {r.name}</div>)}
          {parsed.rows.length > 50 && <p className="muted">…and {parsed.rows.length - 50} more</p>}
          {parsed.skipped.length > 0 && <p className="muted">Skipped: {parsed.skipped.slice(0, 5).join(" | ")}{parsed.skipped.length > 5 ? " …" : ""}</p>}
          <div className="review-actions">
            <button type="button" disabled={busy || parsed.rows.length === 0} onClick={save}>Save {parsed.rows.length} course(s)</button>
          </div>
        </div>
      )}

      <h2>Catalogue{rows ? ` (${rows.length})` : ""}</h2>
      <input className="course-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by code or name" aria-label="Filter courses" />
      {error && <p className="form-error" role="alert">{error}</p>}
      {rows === null && !error && <p className="message">Loading…</p>}
      {shown.map((c) => (
        <div key={c.code} className="upload-card course-row">
          <span><b>{c.code}</b> {c.name}</span>
          <span className="muted">{c.source}</span>
          <button type="button" className="danger" onClick={() => remove(c.code)}>Remove</button>
        </div>
      ))}
    </>
  );
}
