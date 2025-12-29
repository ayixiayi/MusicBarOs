import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Song, UserSettings, UserProfile } from '../types';
import { CoverFlow } from '../components/CoverFlow';
import { AudioSpectrum } from '../components/AudioSpectrum';
import { ManualPlayer } from '../components/ManualPlayer';
import { Settings, User, LogOut, ChevronDown, Monitor, Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface VisualizerProps {
  songs: Song[];
  settings: UserSettings;
  user: UserProfile | null;
  onLogout: () => void;
}

export const Visualizer: React.FC<VisualizerProps> = ({ songs, settings, user, onLogout }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // --- 播放器状态 ---
  // 默认不自动播放
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState({ current: 0, total: 0 });
  const [seekRequest, setSeekRequest] = useState<number | null>(null); // 👈 新增：跳转指令状态

  // --- 交互逻辑：按键计数器 ---
  const stepAccumulator = useRef(0);
  const lastKeyDirection = useRef<'next' | 'prev' | null>(null);

  const executeNavigation = useCallback((direction: 'next' | 'prev') => {
    if (songs.length === 0) return;
    
    setCurrentIndex(prev => {
      if (direction === 'next') {
        return prev < songs.length - 1 ? prev + 1 : 0;
      } else {
        return prev > 0 ? prev - 1 : songs.length - 1;
      }
    });
    // setIsPlaying(true); // 移除自动播放，保持上一首歌的状态
  }, [songs]);

  // 格式化时间
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 键盘监听逻辑
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPlaying(!isPlaying);
        return;
      }

      let intendedDirection: 'next' | 'prev' | null = null;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
         intendedDirection = settings.invertDirection ? 'prev' : 'next';
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
         intendedDirection = settings.invertDirection ? 'next' : 'prev';
      }

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
  }, [executeNavigation, settings, isPlaying]);

  useEffect(() => {
     if (songs.length > 0 && currentIndex >= songs.length) {
         setCurrentIndex(0);
     }
  }, [songs, currentIndex]);

  const activeSong = songs[currentIndex];

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-black touch-none select-none">
      
      <AudioSpectrum />

      <ManualPlayer 
        currentSong={activeSong} 
        settings={settings} // 👈 传入设置，以便获取 Cookie
        isPlaying={isPlaying}
        seekTime={seekRequest} // 👈 传入跳转指令
        onProgress={(cur, tot) => setPlaybackProgress({ current: cur, total: tot })}
        onEnded={() => executeNavigation('next')}
      />

      {/* 3. 顶栏 UI */}
      <div className="absolute top-0 left-0 w-full z-[130] p-6 sm:p-8 flex justify-between items-center pointer-events-none">
          <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
              <Monitor size={14} className="text-cyan-400" />
              <span className="text-zinc-400 text-[10px] font-mono tracking-widest uppercase">
                  GestureOS Active
              </span>
          </div>

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

      {/* 4. 中层：CoverFlow */}
      <div className="h-full w-full flex flex-col justify-center items-center relative z-[10]">
          <CoverFlow songs={songs} currentIndex={currentIndex} />
      </div>

      {/* 5. 底栏播放控制 UI [新增] */}
      <div className="absolute bottom-12 left-0 w-full z-[130] px-8 flex flex-col items-center gap-6">
          {/* 进度条容器 */}
          <div 
            className="w-full max-w-2xl group cursor-pointer py-2" // 增加点击区域
            onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                const time = percent * (playbackProgress.total || 0);
                if (isFinite(time)) setSeekRequest(time); // 触发跳转
            }}
          >
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-widest">
                  <span>{formatTime(playbackProgress.current)}</span>
                  <span className="text-zinc-600">Lossless Audio Stream</span>
                  <span>{formatTime(playbackProgress.total)}</span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5 relative">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-100 ease-linear" // 动画改为 linear 防止卡顿
                    style={{ width: `${(playbackProgress.current / (playbackProgress.total || 1)) * 100}%` }}
                  />
                  {/* 增加一个指示球，hover时显示 */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ left: `${(playbackProgress.current / (playbackProgress.total || 1)) * 100}%`, transform: 'translate(-50%, -50%)' }}
                  />
              </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center gap-8 pointer-events-auto">
              <button 
                onClick={() => executeNavigation('prev')}
                className="p-3 text-zinc-400 hover:text-white transition-colors active:scale-90"
              >
                  <SkipBack size={24} fill="currentColor" />
              </button>

              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-110 active:scale-95 transition-all"
              >
                  {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
              </button>

              <button 
                onClick={() => executeNavigation('next')}
                className="p-3 text-zinc-400 hover:text-white transition-colors active:scale-90"
              >
                  <SkipForward size={24} fill="currentColor" />
              </button>
          </div>
      </div>
    </div>
  );
};