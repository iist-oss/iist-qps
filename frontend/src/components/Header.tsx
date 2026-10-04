import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { FaSignInAlt, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../auth/AuthContext";
import { university } from "../config/university";
import { countPending } from "../api/admin";

export default function Header() {
  const { user, isAdmin, loading, signIn, signOut } = useAuth();
  const [pending, setPending] = useState(0);
  useEffect(() => {
    if (!isAdmin) { setPending(0); return; }
    let alive = true;
    const refresh = () => { void countPending().then((n) => { if (alive) setPending(n); }); };
    refresh();
    window.addEventListener("qps:papers-changed", refresh);
    return () => { alive = false; window.removeEventListener("qps:papers-changed", refresh); };
  }, [isAdmin]);
  return (
    <header className="site-header">
      <NavLink to="/" className="brand">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={28} height={28} />
        {university.name}
      </NavLink>
      <nav>
        <NavLink to="/">Search</NavLink>
        <NavLink to="/upload">Upload</NavLink>
        {isAdmin && <NavLink to="/admin">Admin{pending > 0 && <span className="badge" title="Papers waiting for review">{pending}</span>}</NavLink>}
        {!loading && (user ? (
          <button className="link-btn" onClick={signOut} title={user.email ?? ""}>
            <FaSignOutAlt /> Sign out
          </button>
        ) : (
          <button className="link-btn" onClick={signIn}><FaSignInAlt /> Sign in</button>
        ))}
      </nav>
    </header>
  );
}
