import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Song, UserSettings, UserProfile } from '../types';
import { CoverFlow } from '../components/CoverFlow';
import { CyberBackground } from '../components/CyberBackground';
import { Settings, User, LogOut, ChevronDown, Monitor, Play, Pause, SkipBack, SkipForward, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { CapacitorNfc } from '@capgo/capacitor-nfc';

interface VisualizerProps {
  songs: Song[];
  settings: UserSettings;
  user: UserProfile | null;
  onLogout: () => void;
  onAutoAddSong: (id: string) => void;
}

export const Visualizer: React.FC<VisualizerProps> = ({ songs, settings, user, onLogout, onAutoAddSong }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // --- 切歌逻辑 ---
  const executeNavigation = useCallback((direction: 'next' | 'prev') => {
    if (songs.length === 0) return;
    
    setCurrentIndex(prev => {
       if (direction === 'next') {
           return prev < songs.length - 1 ? prev + 1 : 0;
       } else {
           return prev > 0 ? prev - 1 : songs.length - 1;
       }
    });
  }, [songs]);

  // --- 播放器核心 Hook ---
  const { audioRef, isPlaying, isLoading, togglePlay, play, error, progress, seek } = useAudioPlayer(
    songs, 
    currentIndex, 
    () => executeNavigation('next'),
    () => executeNavigation('prev')
  );

  // --- 原生 NFC 硬件监听 (防止系统弹窗 + 提速) ---
  useEffect(() => {
    let nfcListener: any = null;

    const startNfcReader = async () => {
      try {
        console.log("[Visualizer] Starting Native NFC Reader Mode...");
        
        // 监听硬件事件
        nfcListener = await CapacitorNfc.addListener('nfcEvent', (event) => {
          console.log("[Visualizer] Native NFC Tag detected:", event.tag);
          
          // 震动反馈
          if (navigator.vibrate) navigator.vibrate(50);

          // 提取 ID (逻辑同 Admin: 全 7 字节转 Hex)
          let uid = '';
          if (event.tag.id && Array.isArray(event.tag.id)) {
            uid = (event.tag.id as number[])
              .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2))
              .join('')
              .toUpperCase();
          }

          if (uid) {
            console.log("[Visualizer] Native NFC UID detected:", uid);
            // 存入 session 并触发业务逻辑
            sessionStorage.setItem('pending_play_id', uid);
            window.dispatchEvent(new Event('nfc-play-request'));
          }
        });

        await CapacitorNfc.startScanning();
      } catch (e) {
        console.error("[Visualizer] Failed to init native NFC", e);
      }
    };

    startNfcReader();

    return () => {
      console.log("[Visualizer] Stopping Native NFC Reader...");
      CapacitorNfc.stopScanning().catch(() => {});
      if (nfcListener) nfcListener.remove();
    };
  }, []);

  // --- NFC 响应逻辑 ---
  useEffect(() => {
      const handleNfc = async () => {
          const id = sessionStorage.getItem('pending_play_id');
          if (!id) return;
          
          // [保护] 如果歌单还没加载完，先不消费 ID，等待加载
          if (songs.length === 0) return;

          // 立即移除，防止重复触发 (防抖)
          sessionStorage.removeItem('pending_play_id');
          console.log("[Visualizer] Processing NFC ID:", id);

          // 查找逻辑：优先匹配绑定的 NFC ID，其次匹配原始 ID
          const idx = songs.findIndex(s => String(s.nfcId) === id || String(s.id) === id);
          
          console.log(`[Visualizer Debug] Scanned: ${id}, CurrentIndex: ${currentIndex}`);
          console.log(`[Visualizer Debug] Match Result: Index ${idx}`, idx !== -1 ? songs[idx].title : "No Match");

          if (idx !== -1) {
              console.log("[Visualizer] Song found, playing index:", idx);
              // 1. 设置自动播放意图
              play();
              
              // 2. 如果已经是当前歌曲，手动触发播放
              if (idx === currentIndex) {
                  console.log("[Visualizer] Same song detected, replaying...");
                  if (audioRef.current) {
                      audioRef.current.currentTime = 0;
                      audioRef.current.play().catch(e => console.warn("Same song play failed:", e));
                  }
              } else {
                  // 3. 切换歌曲
                  setCurrentIndex(idx);
              }
          } else {
              // 3. 没找到 -> 触发自动添加
              console.log("[Visualizer] Song not found, triggering Auto-Add");
              onAutoAddSong(id);
          }
      };
      
      window.addEventListener('nfc-play-request', handleNfc);
      handleNfc(); // 挂载时检查一次
      
      return () => window.removeEventListener('nfc-play-request', handleNfc);
  }, [songs, play, onAutoAddSong, currentIndex]);

  // 格式化时间
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- 键盘/手势步进逻辑 ---
  const stepAccumulator = useRef(0);
  const lastKeyDirection = useRef<'next' | 'prev' | null>(null);

  useEffect(() => {
    // [关键修复] 页面挂载时，强制移除所有焦点，防止 HID 回车键误触按钮
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // 排除输入框
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // [暴力美学修正] 拦截所有 ESP32 可能发送的按键，阻止浏览器默认行为
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) {
          e.preventDefault();
          // [核心] 每次按键后强制移除焦点，防止虚线框乱跳
          (document.activeElement as HTMLElement)?.blur?.();
      }

      // 如果是回车键，可能是 ESP32 发来的 NFC 结束符，阻止默认点击行为
      if (e.key === 'Enter') {
          return;
      }

      let intendedDirection: 'next' | 'prev' | null = null;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') intendedDirection = settings.invertDirection ? 'prev' : 'next';
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') intendedDirection = settings.invertDirection ? 'next' : 'prev';
      else if (e.key === ' ') { togglePlay(); return; } // 空格播放暂停

      if (!intendedDirection) return;

      if (lastKeyDirection.current !== intendedDirection) {
          stepAccumulator.current = 0;
          lastKeyDirection.current = intendedDirection;
      }

      stepAccumulator.current += 1;
      const threshold = Math.max(1, settings.stepsPerSong || 1);

      if (stepAccumulator.current >= threshold) {
          executeNavigation(intendedDirection);
          stepAccumulator.current = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executeNavigation, settings, togglePlay]);

  // 如果没有歌曲，重置索引
  useEffect(() => {
     if (songs.length > 0 && currentIndex >= songs.length) {
         setCurrentIndex(0);
     }
  }, [songs, currentIndex]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-black touch-none select-none">
       {/* 1. 底层：深邃环境背景 */}
       <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,#051a1a_0%,#000000_100%)]" />

       {/* 2. 工业氛围遮罩 (Vignette) */}
       <div className="absolute inset-0 z-[5] pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)]"></div>

       {/* 3. 顶栏 UI (恢复) */}
       <div className="absolute top-0 left-0 w-full z-[130] p-6 sm:p-8 flex justify-between items-center pointer-events-none">
           {/* 左侧：状态 */}
           <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                <Monitor size={14} className={isPlaying ? "text-cyan-400 animate-pulse" : "text-zinc-600"} />
                <span className="text-zinc-400 text-[10px] font-mono tracking-widest uppercase">
                    {isLoading ? "Buffering..." : isPlaying ? "Streaming Active" : "Standby"}
                </span>
              </div>
              {error && (
                <div className="flex items-center gap-2 bg-red-500/20 px-4 py-2 rounded-full border border-red-500/30 backdrop-blur-md">
                   <AlertCircle size={14} className="text-red-400" />
                   <span className="text-red-400 text-[10px] font-bold uppercase">{error}</span>
                </div>
              )}
           </div>

           {/* 右侧：用户菜单 */}
           <div className="relative pointer-events-auto">
               <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)} 
                  className="flex items-center space-x-3 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full pl-1 pr-4 py-1 transition-all active:scale-95"
               >
                   <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                      <User size={16} />
                   </div>
                   <span className="hidden sm:block text-sm font-black text-zinc-200 uppercase tracking-tighter">
                      {user?.username || 'Guest'}
                   </span>
                   <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
               </button>

               {/* 下拉菜单 */}
               {isProfileOpen && (
                   <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2 animate-in slide-in-from-top-2 fade-in">
                       <Link to="/admin" className="flex items-center space-x-3 px-5 py-3 hover:bg-white/5 text-zinc-300 transition-colors">
                           <Settings size={16} />
                           <span className="text-xs font-bold uppercase tracking-wider">Settings</span>
                       </Link>
                       <div className="h-px bg-white/5 my-1 mx-4" />
                       <button onClick={onLogout} className="w-full flex items-center space-x-3 px-5 py-3 hover:bg-red-500/10 text-red-400 transition-colors">
                           <LogOut size={16} />
                           <span className="text-xs font-bold uppercase tracking-wider">Logout</span>
                       </button>
                   </div>
               )}
           </div>
       </div>

       {/* 4. 中层：CoverFlow 核心展示 (z-10) */}
       <div className="h-full w-full flex flex-col justify-center items-center relative z-[10]">
           <CoverFlow songs={songs} currentIndex={currentIndex} />
       </div>

       {/* 4. 全息层：赛博几何核心 (覆盖在封面上方) */}
       <div className="absolute inset-0 z-[50] pointer-events-none">
           <CyberBackground isPlaying={isPlaying} />
       </div>

       {/* 5. 顶栏 UI */}

       {/* 🛠️ DEBUG HUD (可选) 
       <div className="fixed top-24 left-4 z-[9999] pointer-events-none p-2 bg-black/80 text-green-400 font-mono text-[10px] rounded border border-green-500/30 opacity-80">
          <p>Load: {isLoading ? 'YES' : 'NO'} | Play: {isPlaying ? 'YES' : 'NO'}</p>
       </div>
       */}

       {/* 4. 底栏：播放器控制器 (移动端友好) */}
       <div className="absolute bottom-12 left-0 w-full z-[130] flex flex-col items-center gap-6 pointer-events-none">
          
          {/* 进度条 (全宽热区 - 消除死区) */}
          <div 
            className="w-full h-14 flex flex-col items-center justify-center pointer-events-auto cursor-pointer touch-none px-4"
            onPointerDown={(e) => {
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                const clientX = e.clientX; 
                const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                
                if (progress.duration > 0) {
                    seek(percent * progress.duration);
                    if (navigator.vibrate) navigator.vibrate(50);
                }
            }}
          >
              {/* 内部视觉容器：为了美观，我们让它看起来没那么宽 */}
              <div className="w-[90%] pointer-events-none">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-2 tracking-widest px-1">
                      <span>{formatTime(progress.current)}</span>
                      <span>{formatTime(progress.duration)}</span>
                  </div>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                      <div 
                        className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-75 ease-out"
                        style={{ width: `${(progress.current / (progress.duration || 1)) * 100}%` }}
                      />
                  </div>
              </div>
          </div>

          {/* 交互控制组 */}
          <div className="flex items-center gap-6 pointer-events-auto bg-black/40 backdrop-blur-2xl border border-white/5 px-8 py-4 rounded-3xl shadow-2xl">
             <button 
                onClick={() => executeNavigation('prev')}
                className="p-3 text-zinc-500 hover:text-white transition-colors active:scale-90"
             >
                <SkipBack size={24} fill="currentColor" />
             </button>

             <button 
                onClick={togglePlay}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
             >
                {isLoading ? (
                  <Loader2 size={28} className="animate-spin" />
                ) : isPlaying ? (
                  <Pause size={28} fill="currentColor" />
                ) : (
                  <Play size={28} className="ml-1" fill="currentColor" />
                )}
             </button>

             <button 
                onClick={() => executeNavigation('next')}
                className="p-3 text-zinc-500 hover:text-white transition-colors active:scale-90"
             >
                <SkipForward size={24} fill="currentColor" />
             </button>
          </div>
       </div>
    </div>
  );
};
