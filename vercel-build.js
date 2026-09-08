// vercel-build.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting Vercel build process...');

// Install dependencies
console.log('📦 Installing dependencies...');
execSync('npm install --production=false', { stdio: 'inherit' });

// Run build
console.log('🔨 Building project...');
execSync('npm run build', { stdio: 'inherit' });

// Verify build output
if (!fs.existsSync('dist')) {
    console.error('❌ Build failed: dist directory not found');
    process.exit(1);
}

console.log('✅ Build completed successfully!');
