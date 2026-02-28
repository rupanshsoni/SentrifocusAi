import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
    plugins: [tailwindcss(), react()],
    root: '.',
    base: './',
    server: {
        port: 5173,
        strictPort: true,
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                intervention: resolve(__dirname, 'src/ui/overlays/intervention.html'),
                focusbar: resolve(__dirname, 'src/ui/overlays/focusbar.html'),
                countdown: resolve(__dirname, 'src/ui/overlays/countdown.html'),
                credit: resolve(__dirname, 'src/ui/overlays/credit.html'),
                sessionlock: resolve(__dirname, 'src/ui/overlays/sessionlock.html'),
            },
        },
    },
});
