
import { Song, UserSettings, UserProfile } from "../types";

const KEYS = {
  USERS: 'musicbar_users',
  CURRENT_USER: 'musicbar_session',
  DATA_PREFIX: 'musicbar_data_'
};
// ... 前面代码不变 ...

const DEFAULT_SETTINGS: UserSettings = {
  stepsPerSong: 1,          // 默认翻页按 1 下
  gestureSensitivity: 2.0,  // [新增] 默认音量倍率 2.0
  invertDirection: false,
  cookie: ''
};

// ... 后面代码不变 ...
const TECH_OF_RELIEF_COVER = "https://p2.music.126.net/9sK2UThfiGQWka0Hnc_0uQ==/109951163968184186.jpg?param=1300y1300";

const DEFAULT_SONGS: Song[] = [
  { 
    id: '31245737', 
    title: '救済の技法', 
    artist: '平沢進', 
    album: '救済の技法', 
    coverUrl: TECH_OF_RELIEF_COVER,
    platformUrl: 'https://music.163.com/#/song?id=31245737'
  }
];

interface UserData {
  songs: Song[];
  settings: UserSettings;
}

const getUsers = (): UserProfile[] => {
  const u = localStorage.getItem(KEYS.USERS);
  return u ? JSON.parse(u) : [];
};

const saveUsers = (users: UserProfile[]) => {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

const getUserData = (userId: string): UserData => {
  const data = localStorage.getItem(KEYS.DATA_PREFIX + userId);
  if (data) return JSON.parse(data);
  return { songs: DEFAULT_SONGS, settings: DEFAULT_SETTINGS };
};

const saveUserData = (userId: string, data: UserData) => {
  localStorage.setItem(KEYS.DATA_PREFIX + userId, JSON.stringify(data));
};

export const auth = {
  login: (username: string, password: string): UserProfile | null => {
    const users = getUsers();
    const user = users.find(u => u.username === username && u.passwordHash === btoa(password));
    if (user) {
      const sessionUser = { ...user, isLoggedIn: true };
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(sessionUser));
      return sessionUser;
    }
    return null;
  },

  register: (username: string, password: string): UserProfile | null => {
    const users = getUsers();
    if (users.find(u => u.username === username)) return null;

    const newUser: UserProfile = {
      id: crypto.randomUUID(),
      username,
      passwordHash: btoa(password),
      isLoggedIn: true
    };

    users.push(newUser);
    saveUsers(users);
    saveUserData(newUser.id, { songs: DEFAULT_SONGS, settings: DEFAULT_SETTINGS });
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(newUser));
    return newUser;
  },

  logout: () => {
    localStorage.removeItem(KEYS.CURRENT_USER);
  },

  getCurrentUser: (): UserProfile | null => {
    const u = localStorage.getItem(KEYS.CURRENT_USER);
    return u ? JSON.parse(u) : null;
  }
};

export const storage = {
  getSongs: (): Song[] => {
    const user = auth.getCurrentUser();
    if (!user) return [];
    return getUserData(user.id).songs;
  },
  saveSongs: (songs: Song[]) => {
    const user = auth.getCurrentUser();
    if (!user) return;
    const currentData = getUserData(user.id);
    saveUserData(user.id, { ...currentData, songs });
  },
  getSettings: (): UserSettings => {
    const user = auth.getCurrentUser();
    if (!user) return DEFAULT_SETTINGS;
    return getUserData(user.id).settings;
  },
  saveSettings: (settings: UserSettings) => {
    const user = auth.getCurrentUser();
    if (!user) return;
    const currentData = getUserData(user.id);
    saveUserData(user.id, { ...currentData, settings });
  },
  exportBackup: (): string => {
    const user = auth.getCurrentUser();
    if (!user) return '';
    const data = getUserData(user.id);
    return JSON.stringify(data, null, 2);
  },
  importBackup: (jsonString: string): boolean => {
    const user = auth.getCurrentUser();
    if (!user) return false;
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.songs && Array.isArray(parsed.songs) && parsed.settings) {
        saveUserData(user.id, parsed);
        return true;
      }
    } catch (e) {
      console.error("Import failed", e);
    }
    return false;
  }
};
