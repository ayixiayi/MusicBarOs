export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  platformUrl?: string;
}

export interface UserSettings {
  // 1. UI 交互步进：控制切歌/翻页时，模拟按键的次数 (你提到的“按几下上下键”)
  stepsPerSong: number;     

  // 2. [新增] 手势灵敏度：控制音量调节的倍率 (数值越大，音量变化越快)
  gestureSensitivity: number; 

  invertDirection: boolean; 
  cookie: string;
}

export interface UserProfile {
  id: string;
  username: string;
  passwordHash?: string;
  isLoggedIn?: boolean;
  avatar?: string;
}