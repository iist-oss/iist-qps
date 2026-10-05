import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { FaMoon, FaSignInAlt, FaSignOutAlt, FaSun } from "react-icons/fa";
import { useAuth } from "../auth/AuthContext";
import { university } from "../config/university";
import { countPending } from "../api/admin";
import { applyTheme, getTheme, saveTheme, type Theme } from "../lib/theme";

export default function Header() {
  const { user, isAdmin, loading, signIn, signOut } = useAuth();
  const [pending, setPending] = useState(0);
  const [theme, setTheme] = useState<Theme>(getTheme());
  useEffect(() => { applyTheme(theme); }, [theme]);
  const toggleTheme = () => { const next: Theme = theme === "dark" ? "light" : "dark"; saveTheme(next); setTheme(next); };
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
        {user && <NavLink to="/">Search</NavLink>}
        {user && <NavLink to="/browse">Browse</NavLink>}
        {user && <NavLink to="/upload">Upload</NavLink>}
        {user && <NavLink to="/my-uploads">My uploads</NavLink>}
        <button className="link-btn" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>
          {theme === "dark" ? <FaSun /> : <FaMoon />}
        </button>
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
