import { defineConfig } from 'vite';

export default defineConfig({
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
        target: 'es2020'
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
