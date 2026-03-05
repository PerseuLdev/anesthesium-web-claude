import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, X, CameraOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64: string, mimeType: string) => void;
}

export function CameraScanner({ isOpen, onClose, onCapture }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPermissionError(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      setPermissionError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setPermissionError(err.message || "Não foi possível acessar a câmera. Verifique as permissões do navegador.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current && stream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];
        onCapture(base64, 'image/jpeg');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        onCapture(base64, file.type);
      }
    };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
            <h2 className="text-white font-medium tracking-widest uppercase text-sm">Scan ABG Report</h2>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video Feed */}
          <div className="flex-1 relative overflow-hidden bg-zinc-900 flex items-center justify-center">
            {permissionError ? (
              <div className="text-center p-8 max-w-sm">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
                  <CameraOff className="w-8 h-8 text-rose-400" />
                </div>
                <p className="text-white font-medium mb-2">Câmera indisponível</p>
                <p className="text-zinc-400 text-sm mb-6">{permissionError}</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-zinc-200 transition-colors"
                >
                  Selecionar da Galeria
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Scanner Overlay Guide */}
                <div className="absolute inset-0 border-[2px] border-white/20 m-8 md:m-16 rounded-3xl pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-3xl -ml-[2px] -mt-[2px]" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-3xl -mr-[2px] -mt-[2px]" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-3xl -ml-[2px] -mb-[2px]" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-3xl -mr-[2px] -mb-[2px]" />
                </div>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="h-40 bg-black flex items-center justify-around px-8 pb-8">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors"
              title="Select from Gallery"
            >
              <ImageIcon className="w-6 h-6" />
            </button>
            
            <button 
              onClick={handleCapture}
              disabled={!!permissionError}
              className="w-20 h-20 rounded-full border-4 border-emerald-500 p-1 flex items-center justify-center group disabled:opacity-50 disabled:border-zinc-600"
              title="Take Photo"
            >
              <div className="w-full h-full bg-white rounded-full group-active:scale-90 transition-transform disabled:bg-zinc-600" />
            </button>

            <div className="w-14 h-14" /> {/* Spacer for centering */}
          </div>

          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileSelect}
          />
          <canvas ref={canvasRef} className="hidden" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
