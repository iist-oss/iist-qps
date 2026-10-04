import { HashRouter, Link, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./auth/AuthContext";
import Header from "./components/Header";
import SearchPage from "./pages/SearchPage";
import UploadPage from "./pages/UploadPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import StatusPage from "./pages/StatusPage";
import AboutPage from "./pages/AboutPage";
import CreatorPage from "./pages/CreatorPage";
import TakedownPage from "./pages/TakedownPage";
import { configIssues, isConfigured } from "./lib/supabase";
import { university } from "./config/university";

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Header />
        {!isConfigured && (
          <div className="banner">
            Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see frontend/.env.example).
          </div>
        )}
        {isConfigured && configIssues.length > 0 && (
          <div className="banner" role="alert">
            Site configuration problem: {configIssues[0]} See <a href="#/status">connection check</a>.
          </div>
        )}
        <main>
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/creator" element={<CreatorPage />} />
            <Route path="/takedown" element={<TakedownPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/admin/*" element={<AdminPage />} />
            <Route path="*" element={<SearchPage />} />
          </Routes>
        </main>
        <footer className="site-footer">
          <p>{university.name} · papers are shared by students for study use</p>
          <p>
            <Link to="/about">About</Link> · <Link to="/creator">About the builder</Link> · <Link to="/takedown">Takedown &amp; privacy</Link>
          </p>
          <p>Built by <Link to="/creator">{university.credits.builderName}</Link>, {university.credits.institute}</p>
        </footer>
        <Toaster toastOptions={{ position: "bottom-center" }} />
      </AuthProvider>
    </HashRouter>
  );
}
