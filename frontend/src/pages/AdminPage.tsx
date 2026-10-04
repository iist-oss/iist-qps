import { useAuth } from "../auth/AuthContext";

// B5 will implement: review queue, edit/approve modal, trash. (UI guard only; RLS is the real protection.)
export default function AdminPage() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="page"><p className="message">Loading…</p></div>;
  if (!isAdmin) return <div className="page"><p className="message">Admins only.</p></div>;
  return <div className="page"><h1>Admin</h1><p className="message">Dashboard is coming soon (build step B5).</p></div>;
}
