#!/bin/bash

echo "🔧 Fixing all issues..."

# Create missing settings.html
if [ ! -f settings.html ]; then
    echo "📄 Creating settings.html..."
    cat > settings.html << 'EOF'
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settings - Device Monitor</title>
    <link rel="stylesheet" href="assets/css/main.css">
    <link rel="stylesheet" href="assets/css/settings.css">
</head>
<body>
    <div class="app-container">
        <nav class="sidebar">
            <div class="sidebar-header">
                <h2>📹 Device Monitor</h2>
            </div>
            <ul class="sidebar-menu">
                <li><a href="/dashboard.html">📊 Dashboard</a></li>
                <li><a href="/devices.html">📱 Devices</a></li>
                <li><a href="/camera.html">📷 Live Camera</a></li>
                <li class="active"><a href="/settings.html">⚙️ Settings</a></li>
                <li><a href="#" id="logoutBtn">🚪 Logout</a></li>
            </ul>
        </nav>
        
        <main class="main-content">
            <header class="top-header">
                <h1>Settings</h1>
            </header>
            
            <div class="settings-container">
                <div class="settings-section">
                    <h2>System Information</h2>
                    <div class="setting-item">
                        <label>Environment</label>
                        <span id="env">Production</span>
                    </div>
                    <div class="setting-item">
                        <label>Backend API</label>
                        <span id="apiUrl">-</span>
                    </div>
                    <div class="setting-item">
                        <label>Socket Server</label>
                        <span id="socketUrl">-</span>
                    </div>
                    <div class="setting-item">
                        <label>Version</label>
                        <span>1.0.0</span>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h2>Account</h2>
                    <div class="setting-item">
                        <label>Email</label>
                        <span id="userEmail">-</span>
                    </div>
                    <button id="changePasswordBtn" class="btn-setting">🔑 Change Password</button>
                </div>
                
                <div class="settings-section">
                    <h2>Preferences</h2>
                    <div class="setting-item">
                        <label>Theme</label>
                        <select id="themeSelect">
                            <option value="light">☀️ Light</option>
                            <option value="dark">🌙 Dark</option>
                        </select>
                    </div>
                    <div class="setting-item">
                        <label>Auto-refresh</label>
                        <select id="refreshSelect">
                            <option value="0">Off</option>
                            <option value="30000">30 seconds</option>
                            <option value="60000">1 minute</option>
                            <option value="300000">5 minutes</option>
                        </select>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
    
    <script type="module">
        import { initializeAuth } from './services/auth.js';
        
        document.addEventListener('DOMContentLoaded', () => {
            const auth = initializeAuth();
            
            auth.onAuthStateChanged((user) => {
                if (!user) {
                    window.location.href = '/login.html';
                    return;
                }
                document.getElementById('userEmail').textContent = user.email;
            });
            
            document.getElementById('logoutBtn').addEventListener('click', async () => {
                await auth.signOut();
                window.location.href = '/login.html';
            });
            
            document.getElementById('apiUrl').textContent = import.meta.env.VITE_API_BASE_URL || 'Not configured';
            document.getElementById('socketUrl').textContent = import.meta.env.VITE_SOCKET_URL || 'Not configured';
            
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.getElementById('themeSelect').value = savedTheme;
            document.body.className = savedTheme;
            
            document.getElementById('themeSelect').addEventListener('change', (e) => {
                document.body.className = e.target.value;
                localStorage.setItem('theme', e.target.value);
            });
            
            const savedRefresh = localStorage.getItem('refreshInterval') || '0';
            document.getElementById('refreshSelect').value = savedRefresh;
            
            document.getElementById('refreshSelect').addEventListener('change', (e) => {
                localStorage.setItem('refreshInterval', e.target.value);
                if (e.target.value !== '0') {
                    location.reload();
                }
            });
            
            document.getElementById('changePasswordBtn').addEventListener('click', async () => {
                const user = auth.currentUser;
                if (!user) return;
                
                const newPassword = prompt('Enter new password (min 6 characters):');
                if (!newPassword || newPassword.length < 6) {
                    alert('Password must be at least 6 characters');
                    return;
                }
                
                try {
                    await user.updatePassword(newPassword);
                    alert('✅ Password updated successfully');
                } catch (error) {
                    alert('❌ Failed to update password: ' + error.message);
                }
            });
        });
    </script>
</body>
</html>
EOF
    echo "✅ settings.html created"
fi

# Clean install
echo "🧹 Cleaning node_modules..."
rm -rf node_modules package-lock.json

echo "📦 Installing dependencies..."
npm install --production=false --legacy-peer-deps

echo "🔨 Building project..."
npm run build

echo "✅ All fixes applied!"
