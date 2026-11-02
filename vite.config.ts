/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/BRAVOMAIL/" : "/",
  server: {
    host: "::",
    port: 8080,
    open: "/app.html",
  },
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, "app.html"),
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["lucide-react", "clsx", "tailwind-merge"],
        },
      },
    },
  },
  plugins: [
    react(),
    {
      name: "dev-server-root-redirect",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === "/" || req.url === "/index.html") {
            req.url = "/app.html";
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/test/**/*.{test,spec}.{ts,tsx}"],
  },
}));
