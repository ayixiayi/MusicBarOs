import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Camera, CameraOff, Cpu, Eye, Activity, AlertCircle, RefreshCw } from 'lucide-react';

interface GestureVolumeControllerProps {
  onVolumeChange: (delta: number) => void;
}

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17]
];

export const GestureVolumeController: React.FC<GestureVolumeControllerProps> = ({ onVolumeChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isLoopingRef = useRef(false);
  
  const [isActive, setIsActive] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [handInFrame, setHandInFrame] = useState(false);
  const [debugStatus, setDebugStatus] = useState('BOOT');
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const lastVideoTime = useRef<number>(-1);
  const prevXRef = useRef<number | null>(null);
  const lastVolumeUpdate = useRef<number>(0);
  const frames = useRef(0);
  const lastFpsTime = useRef(0);

  useEffect(() => {
    const setup = async () => {
      try {
        setDebugStatus('ENGINE_WASM');
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        setIsLoaded(true);
        setDebugStatus('ENGINE_READY');
      } catch (err) {
        setError("视觉引擎启动失败，请检查网络");
      }
    };
    setup();
    return () => {
      isLoopingRef.current = false;
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
    };
  }, []);

  const loop = useCallback((time: number) => {
    if (!isLoopingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    frames.current++;
    if (time - lastFpsTime.current >= 1000) {
      setFps(frames.current);
      frames.current = 0;
      lastFpsTime.current = time;
    }

    if (video && video.readyState >= 2 && canvas && landmarker) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      if (video.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = video.currentTime;
        const results = landmarker.detectForVideo(video, performance.now());

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制诊断背景
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)';
        ctx.lineWidth = 1;
        for(let i=0; i<canvas.width; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }
        const scanLine = (time % 2000) / 2000 * canvas.height;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)';
        ctx.strokeRect(0, scanLine, canvas.width, 1);

        if (results.landmarks && results.landmarks.length > 0) {
          if (!handInFrame) setHandInFrame(true);
          const landmarks = results.landmarks[0];
          
          // 绘制骨架
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 3;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#0891b2';
          
          HAND_CONNECTIONS.forEach(([a, b]) => {
            const p1 = landmarks[a];
            const p2 = landmarks[b];
            ctx.beginPath();
            ctx.moveTo((1 - p1.x) * canvas.width, p1.y * canvas.height);
            ctx.lineTo((1 - p2.x) * canvas.width, p2.y * canvas.height);
            ctx.stroke();
          });

          // 关键点绘制
          ctx.fillStyle = '#fff';
          landmarks.forEach(p => {
             ctx.beginPath();
             ctx.arc((1 - p.x) * canvas.width, p.y * canvas.height, 2, 0, 2*Math.PI);
             ctx.fill();
          });

          // 音量算法
          const currentX = landmarks[0].x;
          if (prevXRef.current !== null) {
            const delta = currentX - prevXRef.current;
            const now = Date.now();
            if (Math.abs(delta) > 0.03 && now - lastVolumeUpdate.current > 100) {
              // 镜像修正：向左移(x减小) -> 屏幕看起来是向左 -> 音量减
              // 实际操作感觉：delta > 0 是手向左移（MediaPipe坐标系），通常映射为音量减
              onVolumeChange(delta > 0 ? -4 : 4);
              lastVolumeUpdate.current = now;
            }
          }
          prevXRef.current = currentX;
        } else {
          if (handInFrame) setHandInFrame(false);
          prevXRef.current = null;
        }
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [handInFrame, onVolumeChange]);

  const start = async () => {
    if (!isLoaded) return; // 防止未加载完成时点击
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, frameRate: 30 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play();
            // [关键修正] 强制同步物理尺寸，防止MediaPipe坐标归一化错误
            videoRef.current.width = videoRef.current.videoWidth;
            videoRef.current.height = videoRef.current.videoHeight;
            
            isLoopingRef.current = true;
            setIsActive(true);
            setDebugStatus('ACTIVE');
            rafRef.current = requestAnimationFrame(loop);
          }
        };
      }
    } catch (e) {
      setError("相机权限开启失败");
    }
  };

  const stop = () => {
    isLoopingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setHandInFrame(false);
    setDebugStatus('IDLE');
  };

  return (
    <>
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[140] flex items-center gap-6 bg-black/80 backdrop-blur-3xl border border-white/10 px-8 py-3 rounded-full pointer-events-auto shadow-2xl transition-all select-none">
        <div className="flex flex-col border-r border-white/5 pr-6">
          <span className="text-[7px] text-zinc-500 font-black tracking-[0.2em] mb-1 uppercase">Vision_Link_V4</span>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? (handInFrame ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 'bg-amber-500 animate-pulse') : 'bg-zinc-800'}`} />
            <span className="text-[10px] text-white font-mono font-black tracking-widest">
                {isActive ? (handInFrame ? 'LOCKED' : 'SCAN') : (isLoaded ? 'READY' : 'BOOTING...')}
            </span>
          </div>
        </div>
        <div className="flex flex-col min-w-[100px]">
           <span className="text-[7px] text-zinc-600 font-black tracking-widest mb-1 uppercase">Stats</span>
           <span className="text-[9px] text-zinc-400 font-mono uppercase">{debugStatus} {isActive && `| ${fps}FPS`}</span>
        </div>
        <button 
            onClick={isActive ? stop : start} 
            disabled={!isLoaded}
            className={`p-3 rounded-full transition-all ${isActive ? 'bg-red-500 text-white' : (isLoaded ? 'bg-white text-black hover:scale-110' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed')}`}
        >
          {isActive ? <CameraOff size={18} /> : <Camera size={18} />}
        </button>
      </div>

      {error && (
        <div className="fixed top-40 left-1/2 -translate-x-1/2 z-[150] bg-red-500/20 border border-red-500/30 px-6 py-2 rounded-xl flex items-center gap-3 pointer-events-auto">
          <AlertCircle size={14} className="text-red-400" />
          <span className="text-[10px] text-red-100 font-bold uppercase tracking-widest">{error}</span>
          <button onClick={() => window.location.reload()} className="text-white/40 hover:text-white"><RefreshCw size={12} /></button>
        </div>
      )}

      {/* 底部调试窗口 */}
      <div className={`fixed bottom-10 left-8 z-[140] transition-all duration-700 transform ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12 pointer-events-none'}`}>
        <div className="relative w-64 h-48 bg-zinc-950/90 rounded-[2rem] overflow-hidden border border-cyan-500/20 shadow-2xl ring-1 ring-cyan-500/10 backdrop-blur-xl pointer-events-auto">
          <div className="absolute top-0 left-0 w-full h-8 bg-zinc-900/80 border-b border-white/5 flex items-center px-4">
             <Cpu size={10} className="text-cyan-400 mr-2" />
             <span className="text-[8px] font-black text-white uppercase tracking-widest">Neural_Skeleton</span>
          </div>
          <canvas ref={canvasRef} className="absolute inset-0 top-8 w-full h-[calc(100%-2rem)] z-10" />
        </div>
      </div>

      <div className={`fixed bottom-10 right-8 z-[140] transition-all duration-700 transform ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none'}`}>
        <div className="relative w-64 h-48 bg-zinc-950/90 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl ring-1 ring-white/5 backdrop-blur-xl pointer-events-auto">
          <div className="absolute top-0 left-0 w-full h-8 bg-zinc-900/80 border-b border-white/5 flex items-center px-4">
             <Eye size={10} className="text-zinc-400 mr-2" />
             <span className="text-[8px] font-black text-white uppercase tracking-widest">Live_Monitor</span>
          </div>
          <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 top-8 w-full h-[calc(100%-2rem)] object-cover -scale-x-100 opacity-40 grayscale" />
        </div>
      </div>
    </>
  );
};