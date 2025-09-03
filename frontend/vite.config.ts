import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: "preload-critical-assets",
      transformIndexHtml(html, ctx) {
        if (!ctx || !ctx.bundle) return html;

        const assetFiles = Object.keys(ctx.bundle).filter(
          (file) => file.endsWith(".js") || file.endsWith(".css")
        );

        const links = assetFiles
          .map((file) => {
            const asType = file.endsWith(".css") ? "style" : "script";
            return `<link rel="preload" href="/${file}" as="${asType}" crossorigin="anonymous">`;
          })
          .join("\n");

        return html.replace("</head>", `${links}\n</head>`);
      },
    },
    react(),
  ],
});
