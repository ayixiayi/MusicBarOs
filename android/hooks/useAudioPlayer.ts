import { useState, useRef, useEffect, useCallback } from 'react';
import { Song } from '../types';
import { api } from '../services/api';

export const useAudioPlayer = (songs: Song[], currentIndex: number, onNext: () => void, onPrev?: () => void) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // 播放进度状态
  const [progress, setProgress] = useState({ current: 0, duration: 0 });
  
  // 核心：记录用户期望的播放状态
  const shouldPlayRef = useRef(false);
  
  // 使用 Ref 保存回调，避免 Effect 闭包问题
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  useEffect(() => { 
      onNextRef.current = onNext; 
      onPrevRef.current = onPrev;
  }, [onNext, onPrev]);

  // 初始化 Audio 对象
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audioRef.current = audio;

    const handleEnded = () => {
      setIsPlaying(false);
      if (onNextRef.current) onNextRef.current(); 
    };
    
    const handleError = (e: Event) => {
        console.error("Audio Error:", e);
        setError("播放失败");
        setIsLoading(false);
        shouldPlayRef.current = false;
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleProgress = () => {
        if (audio.currentTime > 0.1) setIsLoading(false);
        setProgress({ 
            current: audio.currentTime, 
            duration: audio.duration || 0 
        });
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleProgress);
    audio.addEventListener('loadedmetadata', handleProgress);

    // 绑定 Web MediaSession (系统级播放暂停监听)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
            shouldPlayRef.current = true;
            audio.play().catch(() => {});
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            shouldPlayRef.current = false;
            audio.pause();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            if (onPrevRef.current) onPrevRef.current();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            if (onNextRef.current) onNextRef.current();
        });
    }

    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleProgress);
      audio.removeEventListener('loadedmetadata', handleProgress);
    };
  }, []); 

  // 当当前歌曲索引变化时，加载新歌
  useEffect(() => {
    const loadSong = async () => {
      if (!songs[currentIndex]) return;
      const song = songs[currentIndex];
      
      if (audioRef.current) {
          audioRef.current.pause();
      }

      // 设置 Web MediaSession 元数据
      if ('mediaSession' in navigator) {
          try {
              navigator.mediaSession.metadata = new MediaMetadata({
                  title: song.title || 'Unknown Title',
                  artist: song.artist || 'Unknown Artist',
                  album: song.album || 'MusicBar',
                  artwork: song.coverUrl ? [{ src: song.coverUrl, sizes: '512x512', type: 'image/jpeg' }] : []
              });
          } catch (e) {
              console.warn("MediaSession metadata failed", e);
          }
      }

      setIsLoading(true);
      setError(null);
      setProgress({ current: 0, duration: 0 });
      
      try {
        let url = '';
        if (song.id && /^\d+$/.test(song.id.trim())) {
            try {
                const res = await api.getSongUrl(song.id.trim(), 'lossless');
                if (res.data && res.data[0]) {
                    const data = res.data[0];
                    if (data.url) url = data.url;
                    else if (data.fee === 1) setError("VIP 歌曲无法播放");
                    else setError(`资源无效 (Code: ${data.code})`);
                }
            } catch (err: any) {
                console.warn("API Fetch failed:", err);
                setError(`API Error: ${err.message}`);
            }
        } 
        
        if (!url && song.platformUrl && song.platformUrl.match(/\.(mp3|wav|ogg)$/i)) {
            url = song.platformUrl;
        }

        if (url) {
            // 兼容性修复：强制 HTTPS
            if (url.startsWith('http:')) url = url.replace('http:', 'https:');
            setCurrentUrl(url);
            
            if (audioRef.current) {
                audioRef.current.src = url;
                if (shouldPlayRef.current) {
                    try {
                        await audioRef.current.play();
                    } catch (e) {
                        console.warn("Autoplay interrupted:", e);
                    }
                }
            }
        } else {
            if (!error) setError("无法获取播放链接");
        }

      } catch (e) {
          console.error("Load song failed:", e);
          setError("加载异常");
      } finally {
          setIsLoading(false);
      }
    };

    loadSong();
  }, [currentIndex, songs]);

  const seek = useCallback((time: number) => {
      if (audioRef.current && isFinite(time)) {
          audioRef.current.currentTime = time;
          setProgress(p => ({ ...p, current: time }));
      }
  }, []);

  const play = useCallback(() => {
    if (!audioRef.current) return;
    shouldPlayRef.current = true;
    if (audioRef.current.src) {
        audioRef.current.play().catch((e) => {
            console.warn("[Player] Play failed:", e);
        });
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      play();
    } else {
      shouldPlayRef.current = false;
      audioRef.current.pause();
    }
  }, [play]);

  return { audioRef, isPlaying, isLoading, togglePlay, play, error, currentUrl, progress, seek };
};