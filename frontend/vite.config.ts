import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("/node_modules/p5/")) return "p5";
          if (id.includes("/node_modules/vanta/")) return "vanta";
          if (
            id.includes("/node_modules/@chakra-ui/") ||
            id.includes("/node_modules/@emotion/")
          ) {
            return "chakra";
          }
          if (id.includes("/node_modules/@zag-js/")) return "zag";
          if (id.includes("/node_modules/@floating-ui/")) return "floating-ui";
          if (id.includes("/node_modules/motion/") || id.includes("/node_modules/framer-motion/")) {
            return "motion";
          }
          if (id.includes("/node_modules/react-icons/")) return "icons";
          if (id.includes("/node_modules/axios/")) return "axios";
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/")
          ) {
            return "react-vendor";
          }

          return "vendor";
        },
      },
    },
  },
});
