import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
    plugins: [
        legacy({
            targets: ['defaults', 'not IE 11']
        })
    ],
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                login: 'login.html',
                dashboard: 'dashboard.html',
                devices: 'devices.html',
                camera: 'camera.html',
                settings: 'settings.html',
                client: 'client.html',
                '404': '404.html'
            },
            output: {
                manualChunks: {
                    vendor: ['firebase', 'socket.io-client']
                }
            }
        },
        sourcemap: false,
        minify: 'terser',
        target: 'es2020',
        outDir: 'dist',
        emptyOutDir: true
    },
    server: {
        port: 3000,
        open: true,
        host: true
    },
    preview: {
        port: 3000
    }
});
