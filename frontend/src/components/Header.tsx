import { NavLink } from "react-router-dom";
import { FaSignInAlt, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../auth/AuthContext";
import { university } from "../config/university";

export default function Header() {
  const { user, isAdmin, loading, signIn, signOut } = useAuth();
  return (
    <header className="site-header">
      <NavLink to="/" className="brand">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={28} height={28} />
        {university.name}
      </NavLink>
      <nav>
        <NavLink to="/">Search</NavLink>
        <NavLink to="/upload">Upload</NavLink>
        {isAdmin && <NavLink to="/admin">Admin</NavLink>}
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
