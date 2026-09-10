import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'fs';

// A custom plugin that intercepts media files and forces them into Base64
function forceBase64() {
  return {
    name: 'force-base64',
    enforce: 'pre', // Runs before Vite's default asset handling
    load(id) {
      // Remove query parameters like ?import that Vite sometimes adds
      const cleanId = id.split('?')[0];

      if (cleanId.endsWith('.webm') || cleanId.endsWith('.mp3') || cleanId.endsWith('.png')) {
        const buffer = fs.readFileSync(cleanId);

        // Determine the correct MIME type
        let mime = 'application/octet-stream';
        if (cleanId.endsWith('.webm')) mime = 'video/webm';
        if (cleanId.endsWith('.mp3')) mime = 'audio/mpeg';
        if (cleanId.endsWith('.png')) mime = 'image/png';

        // Convert to Base64 and return as a JavaScript module
        const base64 = buffer.toString('base64');
        return `export default "data:${mime};base64,${base64}";`;
      }
    }
  };
}

export default defineConfig({
  server: {
    port: 5173,
    open: true
  },
  plugins: [forceBase64(), viteSingleFile()],

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 100000000, // Forces all media files to inline as Base64
  },
});
