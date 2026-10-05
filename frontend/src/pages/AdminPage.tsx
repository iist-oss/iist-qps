import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import ReviewCard from "../components/ReviewCard";
import CoursesAdmin from "./CoursesAdmin";
import { deleteMany, deletePapers, listByCourseCodes, listPapers, notifyChanged, PAGE_SIZE, savePaper, signedPdfUrl, type AdminList } from "../api/admin";
import { ageLabel, bulkProblems, formToFields, normCode, paperToForm, UNDO_MS, type AdminPaper } from "../lib/admin";
import { useCatalogue, useCourseSems } from "../lib/useCatalogue";
import { withCourseName, withCourseSemester } from "../lib/courses";

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
        <Route index element={<ReviewList key="pending" list="pending" />} />
        <Route path="approved" element={<ReviewList key="approved" list="approved" />} />
        <Route path="courses" element={<CoursesAdmin />} />
        <Route path="trash" element={<TrashList key="trash" />} />
      </Routes>
    </div>
  );
}

function useList(list: AdminList, page: number, search: string) {
  const [rows, setRows] = useState<AdminPaper[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const reload = useCallback(async () => {
    const r = await listPapers(list, { page, search });
    if (r.ok) { setRows(r.data.rows); setTotal(r.data.total); setError(null); } else setError(r.error);
  }, [list, page, search]);
  useEffect(() => { setRows(null); void reload(); }, [reload]);
  const drop = useCallback((ids: number[]) => {
    const n = (rowsRef.current ?? []).filter((r) => ids.includes(r.id)).length;
    setRows((cur) => (cur ? cur.filter((r) => !ids.includes(r.id)) : cur));
    setTotal((t) => Math.max(0, t - n));
  }, []);
  return { rows, total, drop, error, reload };
}

function SearchBox({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  return (
    <form className="admin-search" onSubmit={(e: FormEvent) => { e.preventDefault(); onSubmit(); }}>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search code, name, note or #id" aria-label="Search papers" />
      <button type="submit">Search</button>
    </form>
  );
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <div className="select-bar">
      <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="muted">Page {page + 1} of {pages}</span>
      <button type="button" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}

function ReviewList({ list }: { list: "pending" | "approved" }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const { rows, total, drop, error, reload } = useList(list, page, search);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const remove = drop;

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
  const [selDel, setSelDel] = useState<Set<number>>(new Set());
  const [delBusy, setDelBusy] = useState(false);
  const goPage = (p: number) => { setPage(p); setSelDel(new Set()); setTicked(new Set()); };
  const applySearch = () => { setSearch(draft); goPage(0); };
  const toggleDel = (id: number) => setSelDel((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  async function deleteSelected() {
    const ids = [...selDel];
    if (ids.length === 0 || delBusy) return;
    if (!window.confirm(`Move ${ids.length} paper(s) to Trash?${list === "approved" ? " They will stop appearing in search." : ""}`)) return;
    setDelBusy(true);
    const r = await deleteMany(ids, "soft");
    setDelBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    const okIds = r.data.filter((d) => d.status === "success").map((d) => d.id);
    const failed = r.data.length - okIds.length;
    remove(okIds);
    setSelDel((cur) => new Set([...cur].filter((id) => !okIds.includes(id))));
    if (okIds.length > 0) { notifyChanged(); toast.success(`${okIds.length} moved to Trash.`); }
    if (failed > 0) toast.error(`${failed} could not be deleted.`);
  }
  const readyIds = rows ? rows.filter((r) => bulkInfo.get(r.id)?.ready).map((r) => r.id) : [];
  const tickedReady = readyIds.filter((id) => ticked.has(id));

  async function approveTicked() {
    if (!rows || tickedReady.length === 0 || bulkBusy) return;
    if (!window.confirm(`Approve ${tickedReady.length} paper(s)? Only do this if you looked at each PDF for names or roll numbers.`)) return;
    setBulkBusy(true);
    let okCount = 0;
    const failed: string[] = [];
    for (const id of tickedReady) {
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

  const searchBox = <SearchBox value={draft} onChange={setDraft} onSubmit={applySearch} />;
  if (error) return <>{searchBox}<p className="form-error" role="alert">{error}</p></>;
  if (rows === null) return <>{searchBox}<p className="message">Loading…</p></>;
  if (rows.length === 0) {
    return (
      <>
        {searchBox}
        <p className="message">
          {search !== "" ? "No papers match your search."
            : total > 0 ? "This page is empty."
            : list === "pending" ? "Nothing waiting for review." : "No approved papers yet."}
        </p>
        {total > 0 && <div className="select-bar"><button type="button" onClick={() => goPage(Math.max(0, page - 1))}>Go back a page</button></div>}
      </>
    );
  }
  return (
    <>
      {searchBox}
      <p className="muted">{total} {list === "pending" ? "waiting, oldest first" : "approved, most recent first"}{search !== "" ? ` matching “${search}”` : ""}</p>
      <Pager page={page} total={total} onPage={goPage} />
      <div className="select-bar">
        <button type="button" disabled={delBusy} onClick={() => setSelDel(new Set(rows.map((r) => r.id)))}>Select all on page</button>
        <button type="button" disabled={delBusy || selDel.size === 0} onClick={() => setSelDel(new Set())}>Clear</button>
        <button type="button" className="danger" disabled={delBusy || selDel.size === 0} onClick={() => void deleteSelected()}>
          {delBusy ? "Deleting…" : `Move ${selDel.size} to Trash`}
        </button>
      </div>
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
        return (
          <div key={p.id}>
            <label className="select-row">
              <input type="checkbox" checked={selDel.has(p.id)} onChange={() => toggleDel(p.id)} />
              <span>Select for bulk delete</span>
            </label>
            <ReviewCard paper={p} mode={list} bulk={bulk} onDone={(id) => remove([id])} onDelete={onDelete} onReplaced={remove} />
          </div>
        );
      })}
      <Pager page={page} total={total} onPage={goPage} />
    </>
  );
}

function TrashList() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const { rows, total, drop, error, reload } = useList("trash", page, search);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const goPage = (p: number) => { setPage(p); setTicked(new Set()); };
  const applySearch = () => { setSearch(draft); goPage(0); };
  const [manyBusy, setManyBusy] = useState(false);
  const toggle = (id: number) => setTicked((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function actMany(mode: "restore" | "hard") {
    const ids = [...ticked];
    if (ids.length === 0 || manyBusy) return;
    if (mode === "hard" && !window.confirm(`Permanently delete ${ids.length} paper(s)? This cannot be undone.`)) return;
    setManyBusy(true);
    const r = await deleteMany(ids, mode);
    setManyBusy(false);
    if (!r.ok) { toast.error(r.error); void reload(); return; }
    const okIds = r.data.filter((d) => d.status === "success").map((d) => d.id);
    const failed = r.data.length - okIds.length;
    drop(okIds);
    setTicked((cur) => new Set([...cur].filter((id) => !okIds.includes(id))));
    if (okIds.length > 0) { notifyChanged(); toast.success(mode === "restore" ? `${okIds.length} restored to the review queue.` : `${okIds.length} deleted permanently.`); }
    if (failed > 0) toast.error(`${failed} failed.`);
  }

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
    drop([p.id]);
    notifyChanged();
    toast.success(mode === "restore" ? "Restored to the review queue." : "Deleted permanently.");
  }

  async function view(p: AdminPaper) {
    const r = await signedPdfUrl(p.file_path);
    if (r.ok) window.open(r.data, "_blank", "noopener"); else toast.error(r.error);
  }

  const searchBox = <SearchBox value={draft} onChange={setDraft} onSubmit={applySearch} />;
  if (error) return <>{searchBox}<p className="form-error" role="alert">{error}</p></>;
  if (rows === null) return <>{searchBox}<p className="message">Loading…</p></>;
  if (rows.length === 0) {
    return (
      <>
        {searchBox}
        <p className="message">{search !== "" ? "No trashed papers match your search." : total > 0 ? "This page is empty." : "Trash is empty."}</p>
        {total > 0 && <div className="select-bar"><button type="button" onClick={() => goPage(Math.max(0, page - 1))}>Go back a page</button></div>}
      </>
    );
  }
  return (
    <>
      {searchBox}
      <p className="muted">{total} in Trash. Library papers are kept private while trashed. For a takedown, delete them permanently.</p>
      <div className="select-bar">
        <button type="button" disabled={manyBusy} onClick={() => setTicked(new Set(rows.map((r) => r.id)))}>Select all on page</button>
        <button type="button" disabled={manyBusy || ticked.size === 0} onClick={() => setTicked(new Set())}>Clear</button>
        <button type="button" disabled={manyBusy || ticked.size === 0} onClick={() => void actMany("restore")}>Restore {ticked.size}</button>
        <button type="button" className="danger" disabled={manyBusy || ticked.size === 0} onClick={() => void actMany("hard")}>Delete {ticked.size} permanently</button>
      </div>
      {rows.map((p) => (
        <div key={p.id} className="upload-card">
          <div className="upload-card-head">
            <input type="checkbox" checked={ticked.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select #${p.id}`} />
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
      <Pager page={page} total={total} onPage={goPage} />
    </>
  );
}
