import React, { useEffect, useRef, useState } from 'react';
import { Song } from '../types';

interface ManualPlayerProps {
  currentSong: Song | undefined; // 接收当前封面对应的歌曲
}

export const ManualPlayer: React.FC<ManualPlayerProps> = ({ currentSong }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [musicUrl, setMusicUrl] = useState('');
  
  // 核心逻辑：监听 currentSong 的变化 (iPod 模式)
  useEffect(() => {
    if (currentSong?.id) {
      playSong(currentSong.id);
    }
  }, [currentSong?.id]); // 👈 只要 ID 变了，马上切歌

  const playSong = async (id: string) => {
    try {
      console.log(`[iPod Engine] Switching to: ${id}`);
      // 请求本地 API 获取 MP3 直链
      const res = await fetch(`http://localhost:3000/song/url/v1?id=${id}&level=standard`);
      const data = await res.json();
      
      if (data.data && data.data[0].url) {
        const newUrl = data.data[0].url;
        setMusicUrl(newUrl);
        // React 的 audio 标签在 src 变化后，如果设置了 autoPlay 就会自动播放
        // 但为了保险，我们可以手动 play 一下
        // setTimeout(() => audioRef.current?.play(), 100); 
      } else {
        console.warn("VIP歌曲或无版权，跳过");
      }
    } catch (e) {
      console.error("API Error:", e);
    }
  };

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-0 right-0 w-0 h-0 opacity-0 pointer-events-none">
      {/* 这里是核心：
         1. src={musicUrl}: 绑定 API 返回的 mp3 链接
         2. autoPlay: 只要 src 变了，就自动播放 (实现切歌即播)
         3. volume: 你之前的 gestureController 会控制系统音量，所以这里默认 1.0 即可
      */}
      <audio 
        ref={audioRef}
        src={musicUrl} 
        controls={false}
        autoPlay 
        crossOrigin="anonymous" // 为了让频谱能读到数据
      />
    </div>
  );
};