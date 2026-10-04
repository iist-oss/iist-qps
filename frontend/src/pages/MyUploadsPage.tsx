import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { listMine, type MyPaper } from "../api/mine";
import { ageLabel } from "../lib/admin";
import { examTag, paperTitle, semesterTag } from "../lib/papers";

function statusOf(p: MyPaper): { label: string; cls: string } {
  if (p.is_deleted) return { label: "Removed", cls: "status-removed" };
  if (p.approve_status) return { label: "Approved · live in search", cls: "status-live" };
  return { label: "Waiting for review", cls: "status-wait" };
}

export default function MyUploadsPage() {
  const { user, loading, signIn } = useAuth();
  const [rows, setRows] = useState<MyPaper[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void listMine(userId).then((r) => {
      if (!alive) return;
      if (r.ok) { setRows(r.data); setError(null); } else setError(r.error);
    });
    return () => { alive = false; };
  }, [userId]);

  if (loading) return <div className="page"><p className="message">Loading…</p></div>;
  if (!user) {
    return (
      <div className="page">
        <h1>My uploads</h1>
        <p className="message">Please <button className="link-btn" onClick={signIn}>sign in</button> to see your uploads.</p>
      </div>
    );
  }

  const live = rows?.filter((r) => r.approve_status && !r.is_deleted).length ?? 0;
  const waiting = rows?.filter((r) => !r.approve_status && !r.is_deleted).length ?? 0;

  return (
    <div className="page">
      <h1>My uploads</h1>
      <p className="subtitle">Papers you have submitted. An admin checks each one before it appears in search.</p>
      {error && <p className="form-error" role="alert">Could not load your uploads. Please try again.</p>}
      {rows === null && !error && <p className="message">Loading…</p>}
      {rows !== null && rows.length === 0 && <p className="message">You have not uploaded anything yet.</p>}
      {rows !== null && rows.length > 0 && (
        <p className="muted">{live} live · {waiting} waiting · {rows.length - live - waiting} removed</p>
      )}
      {rows?.map((p) => {
        const s = statusOf(p);
        return (
          <div key={p.id} className={`upload-card my-upload ${s.cls}`}>
            <div className="upload-card-head">
              <b className="file-name">{p.course_code ? paperTitle(p) : "No course code"} · {p.year}</b>
              <span className="muted">{ageLabel(p.upload_timestamp)}</span>
            </div>
            <div className="tags">
              <span className="tag">{examTag(p.exam)}</span>
              <span className="tag">{semesterTag(p.semester)}</span>
              {p.note !== "" && <span className="tag">{p.note}</span>}
            </div>
            <p className="my-status">{s.label}</p>
          </div>
        );
      })}
    </div>
  );
}
