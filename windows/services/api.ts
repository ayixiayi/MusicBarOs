// services/api.ts
export const API_BASE_URL = 'http://124.223.200.38:3000';

interface ApiResponse<T = any> {
  code: number;
  data?: T;
  [key: string]: any;
}

/**
 * 通用请求封装
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

  // 构造带 Cookie 的 URL
  const separator = endpoint.includes('?') ? '&' : '?';
  const urlWithCookie = cookie 
    ? `${url}${separator}cookie=${encodeURIComponent(cookie)}` 
    : url;

  try {
    const response = await fetch(urlWithCookie, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
       console.warn(`HTTP Error ${response.status} for ${url}`);
    }
    
    // 如果是 404 等错误，response.json() 可能会报错，所以加个 try
    try {
        const data = await response.json();
        return data as T;
    } catch (jsonErr) {
        return {} as T; // 或者是 null
    }

  } catch (error) {
    console.error(`API Request Failed [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // --- 歌曲相关 ---
  getSongUrl: async (id: string, level = 'lossless') => {
    return request<any>(`/song/url/v1?id=${id}&level=${level}`);
  },

  getSongDetail: async (ids: string) => {
    return request<any>(`/song/detail?ids=${ids}`);
  },

  getAlbum: async (id: string) => {
    return request<any>(`/album?id=${id}`);
  },

  // --- 扫码登录相关 ---
  getQrKey: async () => {
    return request<any>(`/login/qr/key?timestamp=${Date.now()}`);
  },

  createQrImg: async (key: string) => {
    return request<any>(`/login/qr/create?key=${key}&qrimg=true&timestamp=${Date.now()}`);
  },

  checkQrStatus: async (key: string) => {
    return request<any>(`/login/qr/check?key=${key}&timestamp=${Date.now()}`);
  }
};
