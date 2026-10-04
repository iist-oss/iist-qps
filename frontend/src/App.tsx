import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./auth/AuthContext";
import Header from "./components/Header";
import SearchPage from "./pages/SearchPage";
import UploadPage from "./pages/UploadPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import { isConfigured } from "./lib/supabase";
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
        <main>
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/admin/*" element={<AdminPage />} />
            <Route path="*" element={<SearchPage />} />
          </Routes>
        </main>
        <footer className="site-footer">{university.name} · papers are shared by students for study use</footer>
        <Toaster toastOptions={{ position: "bottom-center" }} />
      </AuthProvider>
    </HashRouter>
  );
}
