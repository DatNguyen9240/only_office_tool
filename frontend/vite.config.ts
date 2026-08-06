import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const configuredBackend = env.BACKEND_URL || "http://localhost:5000";
  const devApiTarget = configuredBackend.replace(/\/api\/?$/, "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: devApiTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
    // Named groups keep antd/icons/pro-components as single chunks so rolldown
    // never splits their internal factory-registration pairs across boundaries
    // (which caused "a is not a function" when maxSize was also set on them).
    // antd is ~1 334 kB pre-gzip but only ~413 kB gzipped — well within browser
    // limits and cached after first visit. Raise the warning threshold so we still
    // catch genuine unexpected bloat in app code (threshold sits just above antd).
    chunkSizeWarningLimit: 1_600,
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
  };
});
