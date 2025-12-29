import { Song, UserProfile } from '../types';

// ⚠️ 部署后端后，请将此处的 IP 替换为你的服务器公网 IP
// 例如: 'http://123.45.67.89:3000'
// 如果在本地局域网调试，请填写电脑的局域网 IP，如 'http://192.168.1.5:3000'
export const API_BASE_URL = 'http://124.223.200.38:3000';

interface ApiResponse<T = any> {
  code: number;
  data?: T;
  [key: string]: any;
}

/**
 * 通用请求封装
 * 自动携带 cookie，处理基础错误
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // 1. 尝试从当前登录用户的 Session 获取 ID
  const sessionStr = localStorage.getItem('musicbar_session');
  let cookie = '';
  
  if (sessionStr) {
      try {
          const session = JSON.parse(sessionStr);
          if (session.id) {
              // 2. 根据 ID 读取用户数据
              const dataStr = localStorage.getItem(`musicbar_data_${session.id}`);
              if (dataStr) {
                  const userData = JSON.parse(dataStr);
                  // 3. 提取 Cookie
                  if (userData.settings && userData.settings.cookie) {
                      cookie = userData.settings.cookie;
                  }
              }
          }
      } catch (e) {
          console.warn("[API] Failed to parse local storage for cookie", e);
      }
  }

  const defaultHeaders = {
    'Content-Type': 'application/json',
    // 某些网易云接口需要这个 Content-Type
  };

  // 如果是 GET 请求，把 cookie 拼接到 query 参数里 (NeteaseCloudMusicApi 的特性)
  // 如果是 POST，通常也支持 query 传参，或者 body
  // 为了简单起见，我们统一把 cookie 放在 query string 里传给后端
  // 后端中间件会处理它
  const separator = endpoint.includes('?') ? '&' : '?';
  const urlWithCookie = cookie 
    ? `${url}${separator}cookie=${encodeURIComponent(cookie)}` 
    : url;

  // 对于 POST 请求，我们也可能需要在 body 里带上 cookie，视后端实现而定
  // 目前 NeteaseCloudMusicApi 支持 query 参数透传 cookie，这最稳妥

  try {
    const response = await fetch(urlWithCookie, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    
    // 网易云 API 通常返回 code: 200 表示成功
    if (data.code !== 200) {
       console.warn(`API Warning [${endpoint}]:`, data);
       // 不一定抛错，有些业务错误需要前端处理
    }

    return data as T;
  } catch (error) {
    console.error(`API Request Failed [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  /**
   * 手机号登录
   */
  loginCellphone: async (phone: string, password: string) => {
    // 这里的 timestamp 是为了防止缓存
    return request<any>(`/login/cellphone?phone=${phone}&password=${password}&timestamp=${Date.now()}`);
  },

  /**
   * 邮箱登录
   */
  loginEmail: async (email: string, password: string) => {
    return request<any>(`/login?email=${email}&password=${password}&timestamp=${Date.now()}`);
  },

  /**
   * 获取登录状态
   */
  getLoginStatus: async () => {
    // 必须带上 cookie 才能查到状态
    return request<any>(`/login/status?timestamp=${Date.now()}`, { method: 'POST' });
  },

  /**
   * 获取用户歌单列表
   */
  getUserPlaylist: async (uid: string) => {
    return request<any>(`/user/playlist?uid=${uid}&limit=30&timestamp=${Date.now()}`);
  },

  /**
   * 获取歌单所有歌曲
   */
  getPlaylistTrackAll: async (id: string) => {
    // limit=1000 应该够用了，不够再分页
    return request<any>(`/playlist/track/all?id=${id}&limit=1000&offset=0&timestamp=${Date.now()}`);
  },

  /**
   * 获取歌曲详情 (包括封面等)
   */
  getSongDetail: async (ids: string) => {
    return request<any>(`/song/detail?ids=${ids}`);
  },

  /**
   * 获取歌曲播放 URL (核心!)
   * level: standard, higher, exhigh, lossless, hires, jyeffect, sky, dolby, jymaster
   */
  getSongUrl: async (id: string, level = 'lossless', unblock = false) => {
    return request<any>(`/song/url/v1?id=${id}&level=${level}${unblock ? '&unblock=true' : ''}`);
  },

  /**
   * 获取歌词
   */
  getLyric: async (id: string) => {
    return request<any>(`/lyric?id=${id}`);
  },

  // --- 二维码登录相关 ---
  
  /** 1. 生成二维码 Key */
  getQrKey: async () => {
    return request<any>(`/login/qr/key?timestamp=${Date.now()}`);
  },

  /** 2. 根据 Key 生成二维码图片 (Base64) */
  createQrImg: async (key: string) => {
    return request<any>(`/login/qr/create?key=${key}&qrimg=true&timestamp=${Date.now()}`);
  },

  /** 3. 轮询二维码状态 800:过期 801:等待 802:待确认 803:成功 */
  checkQrStatus: async (key: string) => {
    return request<any>(`/login/qr/check?key=${key}&timestamp=${Date.now()}`);
  },
  
  /** 获取用户详情 */
  getUserDetail: async (uid: string) => {
    return request<any>(`/user/detail?uid=${uid}&timestamp=${Date.now()}`);
  }
};
