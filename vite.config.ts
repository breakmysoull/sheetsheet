import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 3002,
    strictPort: true,
    hmr: {
      port: 3002,
      clientPort: 3002,
      overlay: false, // Disable error overlay that might cause refreshes
    },
    watch: {
      usePolling: false, // Disable polling that can cause excessive refreshes
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Reduce build warnings that might trigger refreshes
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress certain warnings
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        warn(warning);
      },
    },
  },
}));
