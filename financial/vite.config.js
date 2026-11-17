import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("three") || id.includes("@react-three")) return "vendor-three";
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor")) return "vendor-charts";
          if (id.includes("motion") || id.includes("framer-motion")) return "vendor-motion";
          if (
            id.includes("react-markdown") ||
            id.includes("remark-") ||
            id.includes("micromark") ||
            id.includes("mdast") ||
            id.includes("unist")
          ) {
            return "vendor-markdown";
          }
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("@base-ui") || id.includes("@floating-ui")) return "vendor-ui";
          if (id.includes("react-dom") || id.includes("react-router") || /[\\/]react[\\/]/.test(id)) {
            return "vendor-react";
          }
        },
      },
    },
  },
});
