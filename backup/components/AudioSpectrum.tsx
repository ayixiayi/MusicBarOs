import React, { useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';

export const AudioSpectrum: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engineState, setEngineState] = useState<'idle' | 'active'>('idle');
  const [isSilent, setIsSilent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number>(0);
  const silenceCounter = useRef<number>(0);

  const startAudio = async () => {
    try {
      setErrorMessage(null);
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();

      // FFT 参数调优：不仅要有反应，还要“跟手”
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      let stream: MediaStream | null = null;

      // --- 核心修改：Electron 静默捕获逻辑 ---
      // @ts-ignore (electronAPI 来自 preload)
      if (window.electronAPI && window.electronAPI.getDesktopSources) {
        try {
          // 1. 直接从主进程获取屏幕列表，不弹窗
          // @ts-ignore
          const sources = await window.electronAPI.getDesktopSources();
          
          // 2. 找到主屏幕 (通常 Windows 下叫 'Entire Screen' 或 'Screen 1')
          // 我们默认取第一个源，通常就是主显示器
          const source = sources[0];
          
          if (source) {
            console.log("Auto-locking to source:", source.name);
            
            // 3. 使用特殊的 Chrome 约束条件来静默连接
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                // 必须有的魔法配置
                // @ts-ignore
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: source.id
                }
              },
              video: {
                // @ts-ignore
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: source.id
                }
              }
            } as any);
          }
        } catch (e) {
          console.error("Electron capture failed:", e);
        }
      }

      // 如果 Electron 捕获失败（或者在纯网页模式），回退到麦克风
      if (!stream) {
        console.warn("Falling back to microphone");
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // --- 信号处理链路 ---
      const source = ctx.createMediaStreamSource(stream);
      const gainNode = ctx.createGain();
      
      // 增益补偿：系统内录通常电平较低，给它放大 6 倍
      gainNode.gain.value = 6.0;

      source.connect(gainNode);
      gainNode.connect(analyser);

      ctxRef.current = ctx;
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
      
      setEngineState('active');
      tick();
    } catch (err) {
      console.error("Pipeline Error:", err);
      setErrorMessage("Audio Access Denied");
    }
  };

  const tick = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx2d = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const data = dataRef.current;
    const audioCtx = ctxRef.current;

    if (!ctx2d || !analyser || !data || !audioCtx) return;

    if (audioCtx.state === 'suspended') audioCtx.resume();

    analyser.getByteFrequencyData(data);

    // 静音检测逻辑
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    
    if (sum < 10) { 
      silenceCounter.current++;
      if (silenceCounter.current > 60) setIsSilent(true);
    } else {
      silenceCounter.current = 0;
      setIsSilent(false);
    }

    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    
    const barCount = data.length;
    // 调整宽度计算，让频谱铺满屏幕
    const barWidth = canvas.width / barCount; 
    const centerY = canvas.height / 2;

    for (let i = 0; i < barCount; i++) {
      let val = data[i];
      
      // 待机呼吸动画
      if (sum < 10) {
        val = (Math.sin(Date.now() * 0.003 + i * 0.1) * 8) + 5;
      }

      const percent = val / 255;
      // 高度缩放，防止爆表
      const height = percent * (canvas.height * 0.6);
      const x = i * barWidth;

      // 赛博朋克配色逻辑
      const hue = 180 + (percent * 60); // 青色(180) -> 蓝色(240)
      
      ctx2d.fillStyle = `hsla(${hue}, 100%, 50%, ${0.3 + percent * 0.7})`;
      ctx2d.shadowBlur = 15 * percent;
      ctx2d.shadowColor = `hsla(${hue}, 100%, 50%, 0.8)`;
      
      // 绘制对称频谱
      ctx2d.fillRect(x, centerY - height / 2, barWidth - 1, height);
    }

    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // 自动启动尝试：虽然 Chrome 策略通常禁止自动播放音频，
    // 但 Electron 环境下配合用户点击通常能更好工作，或者作为自动启动项
    // 这里我们还是保持点击启动，确保稳定性

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafRef.current);
      if (ctxRef.current) ctxRef.current.close();
    };
  }, []);

  return (
    <>
      {/* 渲染层：放在较底层 z-index */}
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 w-full h-full z-[5] pointer-events-none opacity-60 mix-blend-screen" 
      />
      
      {/* 启动按钮层：仅在未激活时显示 */}
      {engineState === 'idle' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto">
          <div className="flex flex-col items-center gap-6 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <Zap size={32} className="text-cyan-400 animate-pulse" />
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-xl font-black text-white uppercase tracking-[0.3em]">Audio Core</h2>
              <p className="text-zinc-500 text-[10px] font-mono">System Link Ready</p>
            </div>

            <button 
              onClick={startAudio}
              className="group relative px-12 py-4 bg-zinc-900 border border-white/10 overflow-hidden rounded-full transition-all hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
            >
              <div className="absolute inset-0 w-full h-full bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"/>
              <span className="relative text-xs font-black text-white uppercase tracking-[0.2em] group-hover:text-cyan-300">
                Initialize
              </span>
            </button>
            
            {errorMessage && (
               <p className="text-red-500 text-xs font-mono mt-4">{errorMessage}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};