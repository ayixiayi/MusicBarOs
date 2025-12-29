import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Visualizer } from './pages/Visualizer';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { storage, auth } from './utils/storage';
import { Song, UserSettings, UserProfile } from './types';
import { GestureVolumeController } from './components/GestureVolumeController';

function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [settings, setSettings] = useState<UserSettings>(storage.getSettings());

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    setUser(currentUser);
  }, []);

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

  // --- 音量逻辑修正 ---
  const handleVolumeChange = async (rawDelta: number) => {
    // @ts-ignore
    if (window.electronAPI) {
      // 1. 获取【手势灵敏度】 (注意：这里用 gestureSensitivity，不再混用 stepsPerSong)
      // 默认为 2.0 倍率
      const sensitivity = settings.gestureSensitivity || 2.0;
      
      // 2. 计算倍率：基准为 2.0
      // 设为 4.0 就是 2倍速，设为 1.0 就是 0.5倍速
      const multiplier = sensitivity / 2.0;

      // 3. 应用倍率
      const adjustedDelta = rawDelta * multiplier;

      // console.log(`[Gesture] 原始: ${rawDelta.toFixed(2)} x 倍率(${multiplier}) = ${adjustedDelta.toFixed(2)}`);

      // @ts-ignore
      await window.electronAPI.adjustVolume(adjustedDelta);
    }
  };

  return (
    <HashRouter>
      {user && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
           <GestureVolumeController onVolumeChange={handleVolumeChange} />
        </div>
      )}

      <Routes>
        <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Visualizer songs={songs} settings={settings} user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user ? <Admin songs={songs} setSongs={setSongs} settings={settings} setSettings={setSettings} user={user} setUser={setUser} /> : <Navigate to="/login" />} />
      </Routes>
    </HashRouter>
  );
}

export default App;