import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }: { mode: string }) => ({
  server: {
    host: true,
    port: 8080,
  },
  plugins: [
    react(),
    ...(mode === "development" ? (componentTagger() as Plugin[]) : []),
  ].filter((p): p is Plugin => !!p),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "xlsx": path.resolve(__dirname, "./src/lib/xlsx-shim.ts"),
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react-router": path.resolve(__dirname, "./node_modules/react-router"),
      "react-router-dom": path.resolve(__dirname, "./node_modules/react-router-dom"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
    force: true,
  },
}));
