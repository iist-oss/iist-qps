import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { configProblems } from "./src/lib/diagnose";

// base "./" + HashRouter => works on any GitHub Pages path (D5)
// target es2022: pdfjs-dist (upload autofill, D23) may use top-level await.
export default defineConfig(({ mode }) => {
  // Fail the build (CI and deploy) if a malformed URL/key was baked in, instead of shipping a broken site (D24).
  const env = loadEnv(mode, process.cwd(), "VITE_");
  if (env.VITE_SUPABASE_URL || env.VITE_SUPABASE_ANON_KEY) {
    const problems = configProblems(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    if (problems.length > 0) throw new Error("Bad Supabase configuration:\n- " + problems.join("\n- "));
  }
  return { base: "./", plugins: [react()], build: { target: "es2022" } };
});
