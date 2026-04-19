/**
 * CameraPreview - Live Camera Feed Component
 *
 * Accesses the device camera via getUserMedia and renders
 * a live video preview with controls for the seller.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  RefreshCw,
  Users,
  Radio,
  Maximize,
  Minimize,
} from 'lucide-react';

interface CameraPreviewProps {
  viewerCount: number;
  streamDuration: string;
  onEndStream: () => void;
  isActive: boolean;
}

export function CameraPreview({ viewerCount, streamDuration, onEndStream, isActive }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const containerRef = useRef<HTMLDivElement>(null);

  // Start camera on mount
  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    let retryCount = 0;
    const maxRetries = 3;

    async function startCamera() {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setCameraError(null);
      } catch (err: any) {
        console.error('Camera access error:', err);

        let errorMsg = 'Unable to access camera. Please check your device.';
        if (err.name === 'NotAllowedError') {
          errorMsg = 'Camera access denied. Please allow camera permissions in your browser settings.';
        } else if (err.name === 'NotFoundError') {
          errorMsg = 'No camera device found. Please check your hardware.';
        } else if (err.name === 'NotReadableError') {
          errorMsg = 'Camera is in use by another application. Close it and try again.';
        }

        setCameraError(errorMsg);

        // Retry after 2 seconds (max 3 times)
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(startCamera, 2000);
        }
      }
    }

    if (isActive) {
      startCamera();
    }

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, facingMode]);

  // Toggle audio
  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Flip camera
  const flipCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 aspect-video">
      {/* Camera Feed */}
      {cameraError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
            <VideoOff className="w-10 h-10 text-red-400" />
          </div>
          <p className="text-red-400 text-center font-medium">{cameraError}</p>
          <button
            onClick={() => {
              setCameraError(null);
              // Trigger retry by toggling facingMode briefly
              setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
              setTimeout(() => setFacingMode('user'), 100);
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
          >
            Retry Camera
          </button>
          <p className="text-gray-500 text-sm text-center">
            A simulated preview is shown instead
          </p>
          {/* Simulated preview fallback */}
          <div className="absolute inset-0 -z-10">
            <div className="w-full h-full bg-gradient-to-br from-purple-900/40 via-slate-900 to-pink-900/40 animate-pulse" />
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${isVideoOff ? 'hidden' : ''}`}
        />
      )}

      {/* Video off overlay */}
      {isVideoOff && !cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <VideoOff className="w-16 h-16 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">Camera is off</p>
          </div>
        </div>
      )}

      {/* Top bar: LIVE badge + stats */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* LIVE badge */}
            <motion.div
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-lg text-sm font-bold"
            >
              <Radio className="w-4 h-4" />
              LIVE
            </motion.div>

            {/* Duration */}
            <span className="px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg text-sm font-mono">
              {streamDuration}
            </span>
          </div>

          {/* Viewer count */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg text-sm">
            <Users className="w-4 h-4 text-pink-400" />
            <span>{viewerCount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Bottom controls bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-center gap-3">
          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full backdrop-blur-sm transition-all ${
              isMuted
                ? 'bg-red-500/80 hover:bg-red-500'
                : 'bg-white/10 hover:bg-white/20'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Video toggle */}
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full backdrop-blur-sm transition-all ${
              isVideoOff
                ? 'bg-red-500/80 hover:bg-red-500'
                : 'bg-white/10 hover:bg-white/20'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* End Stream */}
          <button
            onClick={onEndStream}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-full font-semibold text-sm transition-all flex items-center gap-2"
          >
            End Stream
          </button>

          {/* Flip camera */}
          <button
            onClick={flipCamera}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
            title="Flip camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
