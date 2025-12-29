import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Song, UserSettings, UserProfile } from '../types';
import { CoverFlow } from '../components/CoverFlow';
import { AudioSpectrum } from '../components/AudioSpectrum';
import { Settings, User, LogOut, ChevronDown, Monitor } from 'lucide-react';
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

  // --- 关键修复：按键计数器 ---
  // 用来存储当前积累的按键次数，默认为 0
  const stepAccumulator = useRef(0);
  // 用来记录上一次按键的方向，防止方向乱窜时错误积累
  const lastKeyDirection = useRef<'next' | 'prev' | null>(null);

  // 纯粹的切歌动作 (不带逻辑判断)
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. 确定意图方向
      let intendedDirection: 'next' | 'prev' | null = null;

      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
         intendedDirection = settings.invertDirection ? 'prev' : 'next';
      }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
         intendedDirection = settings.invertDirection ? 'next' : 'prev';
      }

      // 如果不是方向键，直接忽略
      if (!intendedDirection) return;

      // 2. 检查是否换方向了
      // 如果上次是往下按，这次往上按，说明用户意图变了，重置计数器
      if (lastKeyDirection.current !== intendedDirection) {
          stepAccumulator.current = 0;
          lastKeyDirection.current = intendedDirection;
      }

      // 3. 计数器 +1
      stepAccumulator.current += 1;

      // 4. 获取设定的阈值 (默认为 1)
      // 这就是你设置的 "stepsPerSong"：需要按几下才能翻一页
      const threshold = Math.max(1, settings.stepsPerSong || 1);

      // console.log(`[Visualizer] 蓄力中: ${stepAccumulator.current} / ${threshold} (方向: ${intendedDirection})`);

      // 5. 达到阈值了吗？
      if (stepAccumulator.current >= threshold) {
          // 触发切歌
          executeNavigation(intendedDirection);
          // 清空计数器，准备下一次蓄力
          stepAccumulator.current = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executeNavigation, settings]); // 依赖 settings，确保 stepsPerSong 变化时生效

  // 如果没有歌曲，重置索引
  useEffect(() => {
     if (songs.length > 0 && currentIndex >= songs.length) {
         setCurrentIndex(0);
     }
  }, [songs, currentIndex]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-black touch-none select-none">
       {/* 1. 底层：音频频谱 */}
       <AudioSpectrum />

       {/* 2. 顶栏 UI */}
       <div className="absolute top-0 left-0 w-full z-[130] p-6 sm:p-8 flex justify-between items-center pointer-events-none">
           {/* 左侧：Logo / 状态 */}
           <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
              <Monitor size={14} className="text-cyan-400" />
              <span className="text-zinc-400 text-[10px] font-mono tracking-widest uppercase">
                  GestureOS Active
              </span>
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

       {/* 3. 中层：CoverFlow 核心展示 */}
       <div className="h-full w-full flex flex-col justify-center items-center relative z-[10]">
           <CoverFlow songs={songs} currentIndex={currentIndex} />
       </div>
    </div>
  );
};