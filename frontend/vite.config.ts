import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" + HashRouter => works on any GitHub Pages path (D5)
// target es2022: pdfjs-dist (upload autofill, D23) may use top-level await.
export default defineConfig({ base: "./", plugins: [react()], build: { target: "es2022" } });
