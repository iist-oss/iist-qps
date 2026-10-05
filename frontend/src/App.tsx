import { HashRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import Header from "./components/Header";
import SearchPage from "./pages/SearchPage";
import UploadPage from "./pages/UploadPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import StatusPage from "./pages/StatusPage";
import AboutPage from "./pages/AboutPage";
import CreditsPage from "./pages/CreditsPage";
import TakedownPage from "./pages/TakedownPage";
import BrowsePage from "./pages/BrowsePage";
import MyUploadsPage from "./pages/MyUploadsPage";
import { configIssues, isConfigured } from "./lib/supabase";
import { university } from "./config/university";

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Header />
        {!isConfigured && (
          <div className="banner">
            Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README.md).
          </div>
        )}
        {isConfigured && configIssues.length > 0 && (
          <div className="banner" role="alert">
            Site configuration problem: {configIssues[0]} See <a href="#/status">connection check</a>.
          </div>
        )}
        <main>
          <Routes>
            <Route path="/" element={<RequireAuth><SearchPage /></RequireAuth>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/credits" element={<CreditsPage />} />
            <Route path="/creator" element={<Navigate to="/credits" replace />} />
            <Route path="/takedown" element={<TakedownPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/upload" element={<RequireAuth><UploadPage /></RequireAuth>} />
            <Route path="/browse" element={<RequireAuth><BrowsePage /></RequireAuth>} />
            <Route path="/my-uploads" element={<RequireAuth><MyUploadsPage /></RequireAuth>} />
            <Route path="/admin/*" element={<RequireAuth><AdminPage /></RequireAuth>} />
            <Route path="*" element={<RequireAuth><SearchPage /></RequireAuth>} />
          </Routes>
        </main>
        <footer className="site-footer">
          <p>{university.name} · A student-run archive of past question papers</p>
          <p>
            <Link to="/about">About</Link> · <Link to="/credits">Credits</Link> · <Link to="/takedown">Takedown &amp; privacy</Link>
          </p>
          <p>© {university.credits.builtYear} {university.credits.builderName} · Open source</p>
        </footer>
        <Toaster toastOptions={{ position: "bottom-center" }} />
      </AuthProvider>
    </HashRouter>
  );
}
