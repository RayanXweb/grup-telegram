export class WebRTCService {
    constructor(socketService, callbacks = {}) {
        this.socket = socketService;
        this.callbacks = callbacks;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.currentDeviceId = null;
        this.isStreaming = false;
        this.currentFacingMode = 'environment';
        this.videoElement = document.getElementById('videoElement') || 
                          document.getElementById('clientVideo');
        this.candidates = [];
        this.isInitiator = false;
        
        // Signaling handlers
        this.setupSignaling();
    }
    
    setupSignaling() {
        this.socket.on('webrtc:offer', async (data) => {
            if (data.deviceId === this.currentDeviceId) {
                await this.handleOffer(data.offer);
            }
        });
        
        this.socket.on('webrtc:answer', async (data) => {
            if (data.deviceId === this.currentDeviceId) {
                await this.handleAnswer(data.answer);
            }
        });
        
        this.socket.on('webrtc:ice-candidate', async (data) => {
            if (data.deviceId === this.currentDeviceId) {
                await this.handleIceCandidate(data.candidate);
            }
        });
        
        this.socket.on('webrtc:hangup', (data) => {
            if (data.deviceId === this.currentDeviceId) {
                this.stopStream();
            }
        });
    }
    
    async initialize(deviceId) {
        this.currentDeviceId = deviceId;
        this.isInitiator = false; // Admin side is initiator
    }
    
    async startStream(deviceId) {
        if (this.isStreaming) {
            return;
        }
        
        this.currentDeviceId = deviceId;
        this.isInitiator = true;
        
        try {
            // Get local media stream
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: this.currentFacingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });
            
            // Show local stream
            if (this.videoElement) {
                this.videoElement.srcObject = this.localStream;
                this.videoElement.play();
            }
            
            // Create peer connection
            await this.createPeerConnection();
            
            // Add local tracks
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            // Create and send offer
            const offer = await this.peerConnection.createOffer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: false
            });
            await this.peerConnection.setLocalDescription(offer);
            
            this.socket.emit('webrtc:offer', {
                deviceId: deviceId,
                offer: offer
            });
            
            this.isStreaming = true;
            
            if (this.callbacks.onStreamStarted) {
                this.callbacks.onStreamStarted();
            }
            
            // Send stream info
            const track = this.localStream.getVideoTracks()[0];
            if (track && this.callbacks.onStreamInfo) {
                const settings = track.getSettings();
                this.callbacks.onStreamInfo({
                    width: settings.width || 0,
                    height: settings.height || 0,
                    fps: settings.frameRate || 0
                });
            }
            
        } catch (error) {
            console.error('Error starting stream:', error);
            this.stopStream();
            throw error;
        }
    }
    
    async stopStream() {
        this.isStreaming = false;
        this.isInitiator = false;
        
        // Stop local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        // Clear video
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        
        this.remoteStream = null;
        this.candidates = [];
        
        // Notify hangup
        if (this.currentDeviceId) {
            this.socket.emit('webrtc:hangup', {
                deviceId: this.currentDeviceId
            });
        }
        
        if (this.callbacks.onStreamStopped) {
            this.callbacks.onStreamStopped();
        }
    }
    
    async switchCamera() {
        if (!this.isStreaming || !this.localStream) {
            return;
        }
        
        // Toggle facing mode
        this.currentFacingMode = this.currentFacingMode === 'environment' ? 
            'user' : 'environment';
        
        // Get new stream
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: this.currentFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        
        // Replace tracks
        const oldTracks = this.localStream.getTracks();
        const newTracks = newStream.getTracks();
        
        oldTracks.forEach(track => {
            this.localStream.removeTrack(track);
            track.stop();
        });
        
        newTracks.forEach(track => {
            this.localStream.addTrack(track);
            this.peerConnection.addTrack(track, this.localStream);
        });
        
        this.localStream = newStream;
        
        // Update video
        if (this.videoElement) {
            this.videoElement.srcObject = this.localStream;
        }
        
        // Re-negotiate
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        this.socket.emit('webrtc:offer', {
            deviceId: this.currentDeviceId,
            offer: offer
        });
    }
    
    async createPeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        this.peerConnection = new RTCPeerConnection(configuration);
        
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('webrtc:ice-candidate', {
                    deviceId: this.currentDeviceId,
                    candidate: event.candidate
                });
            }
        };
        
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            if (this.videoElement && this.remoteStream) {
                this.videoElement.srcObject = this.remoteStream;
                this.videoElement.play();
            }
        };
        
        this.peerConnection.onconnectionstatechange = () => {
            if (this.peerConnection) {
                const state = this.peerConnection.connectionState;
                if (this.callbacks.onConnectionStateChange) {
                    this.callbacks.onConnectionStateChange(state);
                }
                
                if (state === 'failed' || state === 'closed' || state === 'disconnected') {
                    if (this.isStreaming) {
                        this.stopStream();
                    }
                }
            }
        };
        
        // Add buffered candidates
        for (const candidate of this.candidates) {
            await this.peerConnection.addIceCandidate(candidate);
        }
        this.candidates = [];
    }
    
    async handleOffer(offer) {
        if (!this.peerConnection) {
            await this.createPeerConnection();
        }
        
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Create answer
            const answer = await this.peerConnection.createAnswer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: false
            });
            await this.peerConnection.setLocalDescription(answer);
            
            this.socket.emit('webrtc:answer', {
                deviceId: this.currentDeviceId,
                answer: answer
            });
            
            this.isStreaming = true;
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }
    
    async handleAnswer(answer) {
        if (!this.peerConnection) {
            return;
        }
        
        try {
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(answer)
            );
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }
    
    async handleIceCandidate(candidate) {
        if (!this.peerConnection) {
            this.candidates.push(candidate);
            return;
        }
        
        try {
            await this.peerConnection.addIceCandidate(
                new RTCIceCandidate(candidate)
            );
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }
                    }
