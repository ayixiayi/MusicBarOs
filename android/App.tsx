import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Visualizer } from './pages/Visualizer';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { storage, auth } from './utils/storage';
import { Song, UserSettings, UserProfile } from './types';
import { GestureVolumeController } from './components/GestureVolumeController';
import { setSystemVolume, initMobileFeatures } from './utils/nativeBridge';
import { useNFCListener } from './hooks/useNFCListener';

import { api } from './services/api';
import { LocalNotifications } from '@capacitor/local-notifications';

const AppContent = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [settings, setSettings] = useState<UserSettings>(storage.getSettings());
  const navigate = useNavigate();
  
  // 防抖：防止重复添加同一首
  const isAddingRef = useRef(false);

  // 初始化用户及权限
  useEffect(() => {
    const initApp = async () => {
        const currentUser = auth.getCurrentUser();
        setUser(currentUser);
        initMobileFeatures();

        // [关键] 请求通知权限 (Android 13+ 必需，否则无法显示媒体卡片)
        try {
            const perm = await LocalNotifications.requestPermissions();
            console.log("[App] Notification Permission:", perm.display);
        } catch (e) {
            console.warn("[App] Failed to request notification permission", e);
        }
    };
    initApp();
  }, []);

  useNFCListener((id) => {
      console.log("[App] NFC Event received:", id);
      
      if (!auth.getCurrentUser()) {
          console.warn("User not logged in, ignoring NFC");
          return;
      }
      
      sessionStorage.setItem('pending_play_id', id);
      
      window.dispatchEvent(new Event('nfc-play-request'));

      if (!location.hash.includes('#/admin')) { 
          navigate('/');
      }
  });

  const handleAutoAddSong = async (id: string) => {
      if (isAddingRef.current) return;
      if (songs.some(s => s.id === id || s.nfcId === id)) return;

      console.log("[App] Auto-adding song:", id);
      isAddingRef.current = true;

      try {
          const res = await api.getSongDetail(id);
          if (res.songs && res.songs.length > 0) {
              const track = res.songs[0];
              const newSong: Song = {
                  id: String(track.id),
                  title: track.name,
                  artist: track.ar?.map((a: any) => a.name).join('/'),
                  album: track.al?.name,
                  coverUrl: track.al?.picUrl,
                  platformUrl: `musicbar://play?id=${track.id}`
              };
              setSongs(prev => [...prev, newSong]);
              console.log("[App] Song added:", newSong.title);
          } else {
              console.warn("[App] Song not found for ID:", id);
              sessionStorage.removeItem('pending_play_id');
              alert(`无法自动添加: ID ${id} 无效或无权访问`);
          }
      } catch (e) {
          console.error("[App] Auto-add failed:", e);
          sessionStorage.removeItem('pending_play_id');
      } finally {
          isAddingRef.current = false;
      }
  };

  // 加载数据
  useEffect(() => {
    if (user) {
      setSongs(storage.getSongs());
      setSettings(storage.getSettings());
    }
  }, [user]);

  useEffect(() => {
    if (user && songs.length > 0) storage.saveSongs(songs);
  }, [songs, user]);

  useEffect(() => {
    if (user) storage.saveSettings(settings);
  }, [settings, user]);

  const handleLogout = () => {
    auth.logout();
    setUser(null);
  };

  const handleVolumeChange = async (rawDelta: number) => {
      return await setSystemVolume(rawDelta);
  };

  return (
    <>
      {user && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
           <GestureVolumeController 
              onVolumeChange={handleVolumeChange} 
              sensitivity={settings.gestureSensitivity || 5}
           />
        </div>
      )}

      <Routes>
        <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Visualizer songs={songs} settings={settings} user={user} onLogout={handleLogout} onAutoAddSong={handleAutoAddSong} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user ? <Admin songs={songs} setSongs={setSongs} settings={settings} setSettings={setSettings} user={user} setUser={setUser} /> : <Navigate to="/login" />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <HashRouter>
        <AppContent />
    </HashRouter>
  );
}

export default App;