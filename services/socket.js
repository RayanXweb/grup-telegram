import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

if (!SOCKET_URL) {
    console.warn('⚠️ VITE_SOCKET_URL is not set');
}

class SocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.token = null;
        this.deviceId = null;
        this.heartbeatInterval = null;
    }
    
    initialize(token, options = {}) {
        this.token = token;
        this.deviceId = options.deviceId || null;
        
        if (this.socket) {
            this.disconnect();
        }
        
        const socketOptions = {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            auth: {
                token: token
            },
            query: {}
        };
        
        if (this.deviceId) {
            socketOptions.query.deviceId = this.deviceId;
        }
        
        this.socket = io(SOCKET_URL, socketOptions);
        
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('🔌 Socket connected');
            this.emit('client:connect', { deviceId: this.deviceId });
            
            // Start heartbeat
            this.startHeartbeat();
        });
        
        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            console.log('🔌 Socket disconnected:', reason);
            this.stopHeartbeat();
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            this.reconnectAttempts++;
            
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('Max reconnection attempts reached');
                this.disconnect();
            }
        });
        
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
        
        return this.socket;
    }
    
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.emit('client:heartbeat', {
                    deviceId: this.deviceId,
                    timestamp: Date.now()
                });
            }
        }, 30000);
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
            if (callbacks.length === 0) {
                this.listeners.delete(event);
            }
        }
        
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }
    
    emit(event, data) {
        if (this.socket && this.isConnected) {
            this.socket.emit(event, data);
        } else {
            console.warn('Socket not connected, cannot emit:', event);
        }
    }
    
    disconnect() {
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.listeners.clear();
        }
    }
}

export const socketService = new SocketService();
