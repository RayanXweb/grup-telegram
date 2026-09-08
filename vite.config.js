import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                login: resolve(__dirname, 'login.html'),
                dashboard: resolve(__dirname, 'dashboard.html'),
                devices: resolve(__dirname, 'devices.html'),
                camera: resolve(__dirname, 'camera.html'),
                settings: resolve(__dirname, 'settings.html'),
                client: resolve(__dirname, 'client.html'),
                '404': resolve(__dirname, '404.html')
            }
        }
    }
});
