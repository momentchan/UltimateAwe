import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";
import { resolve } from "path";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default {
  base: "./",
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'packages/three-core/src')
    },
  },
  plugins: [react(), glsl(), basicSsl()],
  server: {
    host: true,
    https: true,
    proxy: {
      // Browser uses wss://localhost:5173/signal → local relay (avoids mixed content)
      "/signal": {
        target: "ws://127.0.0.1:8765",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
};
