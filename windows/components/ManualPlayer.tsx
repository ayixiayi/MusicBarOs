import React, { useEffect, useRef, useState } from 'react';
import { Song, UserSettings } from '../types';
import { api } from '../services/api';

interface ManualPlayerProps {
  currentSong: Song | undefined;
  settings?: UserSettings;
  onProgress?: (currentTime: number, duration: number) => void;
  isPlaying?: boolean;
  seekTime?: number | null;
  onEnded?: () => void;
}

export const ManualPlayer: React.FC<ManualPlayerProps> = ({ 
  currentSong, 
  settings,
  onProgress, 
  isPlaying = true,
  seekTime,
  onEnded 
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [musicUrl, setMusicUrl] = useState('');
  
  // 监听跳转指令
  useEffect(() => {
    if (audioRef.current && seekTime !== null && seekTime !== undefined) {
       if (isFinite(seekTime)) {
           audioRef.current.currentTime = seekTime;
       }
    }
  }, [seekTime]);

  // 监听播放/暂停状态
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log("Auto-play blocked or error:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, musicUrl]);

  // 监听歌曲变化
  useEffect(() => {
    if (currentSong?.id) {
      playSong(currentSong.id);
    }
  }, [currentSong?.id]);

  const playSong = async (id: string) => {
    try {
      console.log(`[Music Engine] Fetching: ${id}`);
      
      const res = await api.getSongUrl(id, 'lossless');
      
      console.log("[Music Engine] API Response:", res);

      if (res.data && res.data[0]) {
        const songObj = res.data[0];
        
        if (songObj.freeTrialInfo) {
            console.warn("⚠️ 警告：当前获取的是 30s 试听片段");
        }

        if (songObj.url) {
            setMusicUrl(songObj.url);
        } else {
            console.warn("无 URL 字段");
        }
      } 
    } catch (e) {
      console.error("API Error:", e);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && onProgress) {
      onProgress(audioRef.current.currentTime, audioRef.current.duration);
    }
  };

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-0 right-0 w-0 h-0 opacity-0 pointer-events-none">
      <audio 
        ref={audioRef}
        src={musicUrl} 
        controls={false}
        onTimeUpdate={handleTimeUpdate}
        onEnded={onEnded}
        crossOrigin="anonymous"
      />
    </div>
  );
};
