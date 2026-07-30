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
    // Named groups keep antd/icons/pro-components as single chunks so rolldown
    // never splits their internal factory-registration pairs across boundaries
    // (which caused "a is not a function" when maxSize was also set on them).
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              // Keep antd as ONE chunk — no maxSize; splitting it mid-init breaks things.
              name: "antd",
              test: /node_modules[\\/]antd[\\/]/,
              priority: 40,
            },
            {
              name: "antd-icons",
              test: /node_modules[\\/]@ant-design[\\/]icons[\\/]/,
              priority: 35,
            },
            {
              name: "antd-pro",
              test: /node_modules[\\/]@ant-design[\\/]pro-components[\\/]/,
              priority: 30,
            },
            {
              // Generic vendor — maxSize is safe here as there are no ordered-init deps.
              name: "vendor",
              test: /node_modules[\\/]/,
              maxSize: 250_000,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
