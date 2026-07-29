import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 5173,
  },
  build: {
    // Keep the initial route small and cache large UI dependencies separately.
    // Vite 8 uses Rolldown's codeSplitting instead of Rollup manualChunks.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "antd",
              test: /node_modules[\\/]antd[\\/]/,
              maxSize: 260_000,
              priority: 30,
            },
            {
              name: "pro-components",
              test: /node_modules[\\/]@ant-design[\\/]pro-components[\\/]/,
              maxSize: 220_000,
              priority: 25,
            },
            {
              name: "icons",
              test: /node_modules[\\/]@ant-design[\\/]icons[\\/]/,
              maxSize: 180_000,
              priority: 20,
            },
            {
              name: "vendor",
              test: /node_modules[\\/]/,
              maxSize: 220_000,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
