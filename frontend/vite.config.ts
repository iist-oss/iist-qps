import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" + HashRouter => works on any GitHub Pages path (D5)
export default defineConfig({ base: "./", plugins: [react()] });
