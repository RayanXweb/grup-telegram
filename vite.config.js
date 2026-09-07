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
            }
        }
    },
    server: {
        port: 3000,
        open: true
    }
});
