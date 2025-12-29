
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
  cookie: '_iuqxldmzr_=32; _ntes_nnid=a0f03beb79a1dcd465c6ca935b2110cc,1751374923870; _ntes_nuid=a0f03beb79a1dcd465c6ca935b2110cc; NMTID=00OyFhQRdzw8yLHXkdftUDE9mCf55cAAAGXxhSNJA; WEVNSM=1.0.0; WNMCID=ycikfn.1751374924457.01.0; WM_TID=fbG6dMuyJcJAVUQEVFfCLuFsVmDCEF1Q; ntes_utid=tid._.Sfd6WgmYopRFBgVBFBPXPvFoB3SGBMvQ._.0; sDeviceId=YD-DORlSbnA8%2BdBRwQFEBPGb%2BE9VyWDRY%2FA; nts_mail_user=ayixiyouxiang@163.com:-1:1; timing_user_id=time_cehAZBktFD; __snaker__id=4iWWEuJI5qZ5n6jX; ntes_kaola_ad=1; Hm_lvt_1483fb4774c02a30ffa6f0e2945e9b70=1766123876; HMACCOUNT=DBFF4C04BC10F9C9; __csrf=1226b83b146715c096134cb549f8f110; WM_NI=9abnnD1dXtbrk2f8a3VrgckclkNuY%2FmnyOL5g8go3JfbNW99Utgy%2FmHfdK03kVBCBYcz8hHkdfLet%2FPx8id6N84u%2BU94JOcrrQHJ5vgbj3ZGFcMVgE0qGFekkthOaUZaVmc%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6eea7c841899ac0a3c73f86bc8ba2c85b828e9fb0db72aa8da08ece6894ec9db4d02af0fea7c3b92afbbfae8fed50f3bc9895e17aa9eeaad9e43996aea984ea69b0b58296dc25afb2b7b0cf3fa5e8a990b242a6be82b8bc3397aca99aae678cbaacacb339a98a8ea4c153a1a6f889cb61a8ba8486f72594a8f88ae73e8ee8fc96aa5ffbec86b0e27ab28f88abb87ea5bea6d4d94d86bd83b7e64ff4af89a7e861a9aca8b0e45f9abf9a8ee237e2a3; gdxidpyhxdE=ZglmavNpEvVQkJr60cud1ed%2FLIGyzBneP%2FylsTGzZR2NUGCL1DtMimhegwYX%2Fb%2BBJbAJvEZMPoJ9hR3Qt85UMlqX9P%2FRfkaWr1bSgGtbB8GVpyZtu4oHGoTjbu2BK1iCwhuRC8vq6GcvWbt7M%2BofNs8HaW8eiB%5Cqu7wgJHurdmjjUNtY%3A1766502882015; NTES_P_UTID=vBFVFnbhou87Mb1obuEQxh6pDfxnjE2R|1766501992; NTES_SESS=7glZfb_IByx_3eYcxnMk7njqs.zFcm67WtitCF8Ea3I1Z2qhZLps8NKBGwb_P19QRZb4Y0IpNch146GG4ZUmZDrG7ZahQsHNfmS_viLjRKM35ftis45FqbgATa8tPs1bkjNNuI2LJfwHTx_Y3Rwu4Zpv9bpD.rU55juQkd8WwqHsWbftiOpN2CLQADFeqklINDw07QELvpJtN; S_INFO=1766501992|0|3&80##|ayixiyouxiang; P_INFO=ayixiyouxiang@163.com|1766501992|0|music|00&99|shh&1761617526&carddav#shh&null#10#0#0|&0|ntesgod_app&phoenix_client|ayixiyouxiang@163.com; __remember_me=true; __csrf=02cac6809d3ae2ee53d0c8cf93c9aa8e; MUSIC_U=00E2CECB522E342A53D6C2C8A05D00C9F3A7DA781C29BBF9C6C18317A2505A901CFFBC0283AA87870F248B085AF96A4F5CD96E385A8F7FE4B4717B4EBAB40451D9AEF8A549DB02D2FB2EA08427DDEA408A687B20C5203CD2E453C9A2D7B3EE24ED391E783B7A08BA7D0F7C73E023A08D136DF3C9AF2B49B3AB687944407FFD0F27639599314C4F22C90B174A7499E918E03110B9CAC7144ED17F41568A9EF019963F91BE1D11AF412941CF5B286239757E14C070CB86C27928372F6011E6D89EB6A49B97094A5DD34C875C27E54CF28E9B86D0DA3EB47DC4B7A72432ACC46EB85B822484586737D113D99995FAE1BC926E8900F68BFCA4BB724432D57ADD5CB1E46358FE7442BF1AB1DBA40E4B215EB3D3BAF90E84B6A2D2C4CA2CA57A8CD9150147981ADB62CC335F3EAB9612FB42456E7CD3E86ABB69AF4C8642695063C0BB17731FB86F66A23410D60C6D9E0C783306D880C7046BA68E58A07EE7B2857D26AD2F9F2452C27C3EB49E68128E93322524165A9483BB19B5112EC2A3D50C629809ADCBD0A8D9475DE69A6402897F5DA4D4; JSESSIONID-WYYY=NXRqoVghPHvQaej6jFQVWGfw9iWS8OU%2F7UebuB8wGkEEbCy1SQz1yMVpb6tMOs9eOsl8Vo0Z4F%2FoAw7d0Vjg%2FDdhfJ83hd96GdHdt11S2RglwtAbYB9DNS%5CzwD6H%2F3oGaTPTzsI7%5C0uVVUvk3TmebOvRmYZ1JO91uDZWiHZ8Xp1t%5CnfJ%3A1766508289210; Hm_lpvt_1483fb4774c02a30ffa6f0e2945e9b70=1766506915; playerid=32501754'
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
