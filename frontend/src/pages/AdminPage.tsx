import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import ReviewCard from "../components/ReviewCard";
import CoursesAdmin from "./CoursesAdmin";
import { deletePapers, listByCourseCodes, listPapers, notifyChanged, savePaper, signedPdfUrl, type AdminList } from "../api/admin";
import { ageLabel, bulkProblems, formToFields, normCode, paperToForm, UNDO_MS, type AdminPaper } from "../lib/admin";
import { useCatalogue, useCourseSems } from "../lib/useCatalogue";
import { withCourseName, withCourseSemester } from "../lib/courses";

// Admin dashboard (B5). UI guard only: RLS and the Edge Functions are the real protection.
export default function AdminPage() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="page"><p className="message">Loading…</p></div>;
  if (!isAdmin) return <div className="page"><p className="message">Admins only.</p></div>;
  return (
    <div className="page">
      <h1>Admin</h1>
      <nav className="tabs">
        <NavLink to="/admin" end>Review queue</NavLink>
        <NavLink to="/admin/approved">Approved</NavLink>
        <NavLink to="/admin/courses">Courses</NavLink>
        <NavLink to="/admin/trash">Trash</NavLink>
      </nav>
      <Routes>
        <Route index element={<ReviewList list="pending" />} />
        <Route path="approved" element={<ReviewList list="approved" />} />
        <Route path="courses" element={<CoursesAdmin />} />
        <Route path="trash" element={<TrashList />} />
      </Routes>
    </div>
  );
}

function useList(list: AdminList) {
  const [rows, setRows] = useState<AdminPaper[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const r = await listPapers(list);
    if (r.ok) { setRows(r.data); setError(null); } else setError(r.error);
  }, [list]);
  useEffect(() => { setRows(null); void reload(); }, [reload]);
  return { rows, setRows, error, reload };
}

/** Review queue (pending) and approved list. Delete is delayed by UNDO_MS so it can be undone. */
function ReviewList({ list }: { list: "pending" | "approved" }) {
  const { rows, setRows, error, reload } = useList(list);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  // Timers are NOT cleared on unmount: leaving the page must not cancel a delete the admin already confirmed.

  const remove = (ids: number[]) => setRows((cur) => (cur ? cur.filter((r) => !ids.includes(r.id)) : cur));

  // ---- Bulk approve (B2): pending list only. Uses each paper's SAVED details (+ catalogue name / semester). ----
  const catalogue = useCatalogue();
  const sems = useCourseSems();
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [sameCourse, setSameCourse] = useState<AdminPaper[] | null>(null);
  const codesKey = list === "pending" && rows ? rows.map((r) => r.course_code).join("|") : "";
  useEffect(() => {
    if (list !== "pending" || !rows) return;
    let cancelled = false;
    const codes = rows.flatMap((r) => [r.course_code, normCode(r.course_code)]);
    void listByCourseCodes(codes).then((all) => { if (!cancelled) setSameCourse(all); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, codesKey]);
  const formFor = useCallback((p: AdminPaper) =>
    withCourseSemester(withCourseName(paperToForm(p), catalogue), sems, catalogue), [catalogue, sems]);
  const bulkInfo = useMemo(() => {
    const m = new Map<number, { ready: boolean; reasons: string[] }>();
    if (list !== "pending" || !rows || sameCourse === null) return m;
    const nowYear = new Date().getFullYear();
    for (const p of rows) {
      const reasons = bulkProblems(p, formFor(p), sameCourse, nowYear);
      m.set(p.id, { ready: reasons.length === 0, reasons });
    }
    return m;
  }, [list, rows, sameCourse, formFor]);
  const readyIds = rows ? rows.filter((r) => bulkInfo.get(r.id)?.ready).map((r) => r.id) : [];
  const tickedReady = readyIds.filter((id) => ticked.has(id));

  async function approveTicked() {
    if (!rows || tickedReady.length === 0 || bulkBusy) return;
    if (!window.confirm(`Approve ${tickedReady.length} paper(s)? Only do this if you looked at each PDF for names or roll numbers.`)) return;
    setBulkBusy(true);
    let okCount = 0;
    const failed: string[] = [];
    for (const id of tickedReady) {          // one by one; a failure never stops the rest
      const p = rows.find((r) => r.id === id);
      if (!p) continue;
      const r = await savePaper(id, formToFields(formFor(p)), true, []);
      if (r.ok) { okCount++; remove([id]); } else failed.push(`#${id}: ${r.error}`);
    }
    setBulkBusy(false);
    setTicked(new Set(failed.length ? tickedReady.filter((id) => failed.some((f) => f.startsWith(`#${id}:`))) : []));
    if (okCount > 0) { notifyChanged(); toast.success(`${okCount} approved.`); }
    if (failed.length > 0) toast.error(`${failed.length} failed. ${failed[0]}`);
  }

  function onDelete(id: number) {
    remove([id]);
    const undo = () => {
      const t = timers.current.get(id);
      if (t) clearTimeout(t);
      timers.current.delete(id);
      toast.dismiss(`del-${id}`);
      void reload();
    };
    toast((t) => (
      <span>Deleted #{id}. <button className="link-btn" onClick={() => { undo(); toast.dismiss(t.id); }}>Undo</button></span>
    ), { id: `del-${id}`, duration: UNDO_MS });
    timers.current.set(id, setTimeout(async () => {
      timers.current.delete(id);
      const r = await deletePapers([id], "soft");
      if (!r.ok || r.data.some((d) => d.status !== "success")) {
        toast.error(`Could not delete #${id}: ${r.ok ? r.data[0]?.message ?? "failed" : r.error}`);
        void reload();
      } else notifyChanged();
    }, UNDO_MS));
  }

  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (rows === null) return <p className="message">Loading…</p>;
  if (rows.length === 0) return <p className="message">{list === "pending" ? "Nothing waiting for review." : "No approved papers yet."}</p>;
  return (
    <>
      <p className="muted">{rows.length}{rows.length >= 100 ? "+" : ""} {list === "pending" ? "waiting, oldest first" : "most recent"}</p>
      {list === "pending" && (
        <div className="bulk-bar">
          <span>{sameCourse === null ? "Checking for duplicates…" : `${readyIds.length} ready (complete, no duplicate) · ${tickedReady.length} ticked`}</span>
          <div className="review-actions">
            <button type="button" disabled={bulkBusy || readyIds.length === 0} onClick={() => setTicked(new Set(readyIds))}>Tick all ready</button>
            <button type="button" disabled={bulkBusy || ticked.size === 0} onClick={() => setTicked(new Set())}>Untick all</button>
            <button type="button" disabled={bulkBusy || tickedReady.length === 0} onClick={() => void approveTicked()}>
              {bulkBusy ? "Approving…" : `Approve ${tickedReady.length} ticked`}
            </button>
          </div>
          <span className="muted">Bulk approve uses the saved details. If you changed a card, press “Save only” on it first.</span>
        </div>
      )}
      {rows.map((p) => {
        const info = bulkInfo.get(p.id);
        const bulk = list === "pending" && info
          ? { ready: info.ready, reasons: info.reasons, checked: ticked.has(p.id) && info.ready,
              onToggle: () => setTicked((cur) => { const n = new Set(cur); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; }) }
          : undefined;
        return <ReviewCard key={p.id} paper={p} mode={list} bulk={bulk} onDone={(id) => remove([id])} onDelete={onDelete} onReplaced={remove} />;
      })}
    </>
  );
}

function TrashList() {
  const { rows, setRows, error, reload } = useList("trash");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function act(p: AdminPaper, mode: "restore" | "hard") {
    if (mode === "hard" && !window.confirm(`Permanently delete #${p.id} (${p.course_code || "no code"} ${p.year})? This cannot be undone.`)) return;
    setBusyId(p.id);
    const r = await deletePapers([p.id], mode);
    setBusyId(null);
    const item = r.ok ? r.data[0] : undefined;
    if (!r.ok || !item || (item.status !== "success")) {
      toast.error(r.ok ? item?.message ?? "Failed." : r.error);
      void reload();
      return;
    }
    setRows((cur) => (cur ? cur.filter((x) => x.id !== p.id) : cur));
    notifyChanged();
    toast.success(mode === "restore" ? "Restored to the review queue." : "Deleted permanently.");
  }

  async function view(p: AdminPaper) {
    const r = await signedPdfUrl(p.file_path);
    if (r.ok) window.open(r.data, "_blank", "noopener"); else toast.error(r.error);
  }

  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (rows === null) return <p className="message">Loading…</p>;
  if (rows.length === 0) return <p className="message">Trash is empty.</p>;
  return (
    <>
      <p className="muted">Library papers stay in the public bucket while trashed. For a takedown, delete them permanently.</p>
      {rows.map((p) => (
        <div key={p.id} className="upload-card">
          <div className="upload-card-head">
            <b className="file-name">#{p.id} · {p.course_code || "no code"} · {p.course_name || "no name"} · {p.year}</b>
            <span className="muted">{ageLabel(p.upload_timestamp)}{p.from_library ? " · library" : ""}</span>
          </div>
          <div className="upload-actions">
            <button type="button" onClick={() => view(p)}>View</button>
            <button type="button" disabled={busyId === p.id} onClick={() => act(p, "restore")}>Restore</button>
            <button type="button" className="danger" disabled={busyId === p.id} onClick={() => act(p, "hard")}>Delete permanently</button>
          </div>
        </div>
      ))}
    </>
  );
}
