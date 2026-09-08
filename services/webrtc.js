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
        this.iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ];
        
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
        this.isInitiator = true;
        return this;
    }
    
    async startStream(deviceId) {
        if (this.isStreaming) {
            return;
        }
        
        this.currentDeviceId = deviceId;
        this.isInitiator = true;
        
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: this.currentFacingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });
            
            if (this.videoElement) {
                this.videoElement.srcObject = this.localStream;
                await this.videoElement.play();
            }
            
            await this.createPeerConnection();
            
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
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
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
            throw error;
        }
    }
    
    stopStream() {
        this.isStreaming = false;
        this.isInitiator = false;
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        
        this.remoteStream = null;
        this.candidates = [];
        
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
        
        this.currentFacingMode = this.currentFacingMode === 'environment' ? 
            'user' : 'environment';
        
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: this.currentFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        
        const oldTracks = this.localStream.getTracks();
        const newTracks = newStream.getTracks();
        
        oldTracks.forEach(track => {
            this.localStream.removeTrack(track);
            track.stop();
        });
        
        newTracks.forEach(track => {
            this.localStream.addTrack(track);
            if (this.peerConnection) {
                this.peerConnection.addTrack(track, this.localStream);
            }
        });
        
        this.localStream = newStream;
        
        if (this.videoElement) {
            this.videoElement.srcObject = this.localStream;
        }
        
        if (this.peerConnection) {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.socket.emit('webrtc:offer', {
                deviceId: this.currentDeviceId,
                offer: offer
            });
        }
    }
    
    async createPeerConnection() {
        const configuration = {
            iceServers: this.iceServers
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
                
                if (['failed', 'closed', 'disconnected'].includes(state)) {
                    if (this.isStreaming) {
                        this.stopStream();
                    }
                }
            }
        };
        
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
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
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
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
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
