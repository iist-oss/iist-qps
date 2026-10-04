import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import ReviewCard from "../components/ReviewCard";
import { deletePapers, listPapers, notifyChanged, signedPdfUrl, type AdminList } from "../api/admin";
import { ageLabel, UNDO_MS, type AdminPaper } from "../lib/admin";

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
        <NavLink to="/admin/trash">Trash</NavLink>
      </nav>
      <Routes>
        <Route index element={<ReviewList list="pending" />} />
        <Route path="approved" element={<ReviewList list="approved" />} />
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
      {rows.map((p) => (
        <ReviewCard key={p.id} paper={p} mode={list} onDone={(id) => remove([id])} onDelete={onDelete} onReplaced={remove} />
      ))}
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
