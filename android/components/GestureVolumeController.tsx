import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Camera, CameraOff, Cpu, Eye, AlertCircle, RefreshCw, Volume2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { getSystemVolume } from '../utils/nativeBridge';

interface GestureVolumeControllerProps {
  onVolumeChange: (delta: number) => Promise<number>;
  sensitivity?: number;
}

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17]
];

export const GestureVolumeController: React.FC<GestureVolumeControllerProps> = ({ onVolumeChange, sensitivity = 5 }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isLoopingRef = useRef(false);
  
  const [isActive, setIsActive] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [handInFrame, setHandInFrame] = useState(false);
  const [debugStatus, setDebugStatus] = useState('BOOT');
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 音量 OSD 状态
  const [showVolumeOSD, setShowVolumeOSD] = useState(false);
  const [visualVolume, setVisualVolume] = useState(30); 
  const volumeTimerRef = useRef<any>(null);

  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const lastVideoTime = useRef<number>(-1);
  const prevXRef = useRef<number | null>(null);
  const lastVolumeUpdate = useRef<number>(0);
  const frames = useRef(0);
  const lastFpsTime = useRef(0);
  const volumeAccumulator = useRef(0);

  // 初始化音量同步
  useEffect(() => {
      if (Capacitor.getPlatform() === 'android') {
          getSystemVolume().then(v => setVisualVolume(Math.round(v * 100)));
      }
  }, []);

  // 处理音量变化并显示 OSD
  const handleVolumeChangeWrapper = useCallback(async (delta: number) => {
      if (Capacitor.getPlatform() === 'android') {
          const newVol = await onVolumeChange(delta);
          setVisualVolume(Math.round(newVol * 100));
          
          setShowVolumeOSD(true);
          if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
          volumeTimerRef.current = setTimeout(() => setShowVolumeOSD(false), 2000);
      } else {
          onVolumeChange(delta);
      }
  }, [onVolumeChange]);

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
            delegate: "CPU"
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
      if (video.videoWidth === 0 || video.videoHeight === 0) {
          rafRef.current = requestAnimationFrame(loop);
          return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      if (video.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = video.currentTime;
        const results = landmarker.detectForVideo(video, performance.now());
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制诊断网格
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)';
        ctx.lineWidth = 1;
        for(let i=0; i<canvas.width; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }

        if (results.landmarks && results.landmarks.length > 0) {
          if (!handInFrame) setHandInFrame(true);
          const landmarks = results.landmarks[0];
          
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

          ctx.fillStyle = '#fff';
          landmarks.forEach(p => {
             ctx.beginPath();
             ctx.arc((1 - p.x) * canvas.width, p.y * canvas.height, 4, 0, 2*Math.PI); 
             ctx.fill();
          });

          // --- 音量控制 V7：频率调制版 (最终修复) ---
          const x = landmarks[0].x; 
          window.dispatchEvent(new CustomEvent('gesture-move', { detail: { x } }));

          const DEAD_ZONE_START = 0.4;
          const DEAD_ZONE_END = 0.6;
          
          // 基础累积速度：值越大，触发频率越高
          // 0.05 * 60fps = 3.0 -> 每秒触发 3 次 step
          const BASE_ACCUMULATION = 0.05; 
          const sensitivityFactor = sensitivity / 5.0;

          let direction = 0; // 0: 无, 1: 加, -1: 减

          if (x < DEAD_ZONE_START) {
              direction = 1;
          } else if (x > DEAD_ZONE_END) {
              direction = -1;
          }
          
          if (direction !== 0) {
              // 1. 激活状态：显示 OSD
              setShowVolumeOSD(true);
              if (volumeTimerRef.current) {
                  clearTimeout(volumeTimerRef.current);
                  volumeTimerRef.current = null;
              }

              // 2. 累积计算
              // 灵敏度越高，累积越快
              const accumulation = BASE_ACCUMULATION * sensitivityFactor;
              
              if (direction > 0) {
                  volumeAccumulator.current += accumulation;
              } else {
                  volumeAccumulator.current -= accumulation;
              }

              // 3. 阈值触发 (步进刚性化)
              // 只有当累积值跨过整数门槛时，才发送指令
              if (Math.abs(volumeAccumulator.current) >= 1) {
                  const step = Math.trunc(volumeAccumulator.current);
                  // 保留小数部分，实现平滑过渡
                  volumeAccumulator.current -= step;
                  
                  // 发送整数 step
                  onVolumeChange(step).then(newVol => {
                      if (typeof newVol === 'number') {
                          setVisualVolume(Math.round(newVol * 100));
                      }
                  });
              }
          } else {
              // 4. 回到死区：启动 OSD 消失倒计时
              if (showVolumeOSD && !volumeTimerRef.current) {
                  volumeTimerRef.current = setTimeout(() => {
                      setShowVolumeOSD(false);
                      volumeTimerRef.current = null;
                  }, 2000);
              }
              // 在死区时，缓慢衰减累积值，而不是直接清零，防止边缘抖动
              volumeAccumulator.current *= 0.8;
          }
        } else {
          // 手离开视野
          if (handInFrame) setHandInFrame(false);
          if (showVolumeOSD && !volumeTimerRef.current) {
              volumeTimerRef.current = setTimeout(() => {
                  setShowVolumeOSD(false);
                  volumeTimerRef.current = null;
              }, 2000);
          }
          volumeAccumulator.current = 0; 
        }
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [handInFrame, handleVolumeChangeWrapper]);

  const start = async () => {
    if (!isLoaded) return; 
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: false, 
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play();
            isLoopingRef.current = true;
            setIsActive(true);
            setDebugStatus('ACTIVE');
            rafRef.current = requestAnimationFrame(loop);
          }
        };
      }
    } catch (e: any) {
      console.error(e);
      alert(`Camera Error: ${e.name} - ${e.message}`);
      setError("相机启动失败");
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
        <button onClick={isActive ? stop : start} disabled={!isLoaded} className={`p-3 rounded-full transition-all ${isActive ? 'bg-red-500 text-white' : (isLoaded ? 'bg-white text-black hover:scale-110' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed')}`}>
          {isActive ? <CameraOff size={18} /> : <Camera size={18} />}
        </button>
      </div>

      {/* 音量提示条 (Android Only) */}
      <div className={`fixed right-6 top-1/2 -translate-y-1/2 z-[200] w-12 h-64 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full overflow-hidden transition-opacity duration-500 flex flex-col justify-end p-1.5 ${showVolumeOSD ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50"><Volume2 size={16} /></div>
          <div className="w-full bg-white/10 rounded-full h-full relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-cyan-500 to-blue-500 transition-all duration-200 ease-out" style={{ height: `${visualVolume}%` }} />
          </div>
      </div>

      {error && (
        <div className="fixed top-40 left-1/2 -translate-x-1/2 z-[150] bg-red-500/20 border border-red-500/30 px-6 py-2 rounded-xl flex items-center gap-3 pointer-events-auto">
          <AlertCircle size={14} className="text-red-400" />
          <span className="text-[10px] text-red-100 font-bold uppercase tracking-widest">{error}</span>
          <button onClick={() => window.location.reload()} className="text-white/40 hover:text-white"><RefreshCw size={12} /></button>
        </div>
      )}

      <div className={`fixed bottom-10 left-8 z-[140] transition-all duration-700 transform pointer-events-none ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
        <div className="relative w-64 h-48 bg-zinc-950/90 rounded-[2rem] overflow-hidden border border-cyan-500/20 shadow-2xl ring-1 ring-cyan-500/10 backdrop-blur-xl">
          <div className="absolute top-0 left-0 w-full h-8 bg-zinc-900/80 border-b border-white/5 flex items-center px-4">
             <Cpu size={10} className="text-cyan-400 mr-2" /><span className="text-[8px] font-black text-white uppercase tracking-widest">Neural_Skeleton</span>
          </div>
          <canvas ref={canvasRef} className="absolute inset-0 top-8 w-full h-[calc(100%-2rem)] z-10 object-contain pointer-events-none" />
        </div>
      </div>

      <div className={`fixed bottom-10 right-8 z-[140] transition-all duration-700 transform pointer-events-none ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
        <div className="relative w-64 h-48 bg-zinc-950/90 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl ring-1 ring-white/5 backdrop-blur-xl">
          <div className="absolute top-0 left-0 w-full h-8 bg-zinc-900/80 border-b border-white/5 flex items-center px-4">
             <Eye size={10} className="text-zinc-400 mr-2" /><span className="text-[8px] font-black text-white uppercase tracking-widest">Live_Monitor</span>
          </div>
          <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 top-8 w-full h-[calc(100%-2rem)] object-cover -scale-x-100 opacity-40 grayscale pointer-events-none" />
        </div>
      </div>
    </>
  );
};
