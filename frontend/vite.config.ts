import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { configProblems } from "./src/lib/diagnose";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  if (env.VITE_SUPABASE_URL || env.VITE_SUPABASE_ANON_KEY) {
    const problems = configProblems(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    if (problems.length > 0) throw new Error("Bad Supabase configuration:\n- " + problems.join("\n- "));
  }
  return { base: "./", plugins: [react()], build: { target: "es2022" } };
});
