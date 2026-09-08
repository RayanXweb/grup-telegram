import { defineConfig } from 'vite';
import { resolve } from 'path';
import { existsSync, readdirSync } from 'fs';

// Auto-detect all HTML files
const htmlFiles = {};
const rootDir = process.cwd();
const files = readdirSync(rootDir);

files.forEach(file => {
    if (file.endsWith('.html') && file !== 'index.html') {
        const name = file.replace('.html', '');
        htmlFiles[name] = resolve(rootDir, file);
    }
});

// Add index.html
htmlFiles.main = resolve(rootDir, 'index.html');

export default defineConfig({
    build: {
        rollupOptions: {
            input: htmlFiles,
            output: {
                manualChunks: {
                    vendor: ['firebase', 'socket.io-client']
                },
                assetFileNames: 'assets/[name].[hash].[ext]',
                chunkFileNames: 'assets/[name].[hash].js',
                entryFileNames: 'assets/[name].[hash].js'
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
    },
    optimizeDeps: {
        include: ['firebase', 'socket.io-client']
    }
});
