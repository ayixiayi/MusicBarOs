import { Song } from "../types";
import { api } from "./api";

// 纯工具：提取干净的目标
export const extractCleanTarget = (input: string): string => {
    if (!input) return '';
    return input.replace(/['"]/g, '').trim();
};

// UUID 生成 (为了给专辑里的每首歌生成唯一 Key，虽然我们推荐用网易云 ID)
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString();
};

/**
 * 新版 fetchMusicData
 * 支持单曲和专辑解析
 */
export const fetchMusicData = async (query: string): Promise<Song[]> => {
  let cleanInput = extractCleanTarget(query);
  
  // 1. 尝试提取 ID
  let id = '';
  const idMatch = cleanInput.match(/(?:id=|\/)(\d+)/);
  if (idMatch) {
      id = idMatch[1];
  } else if (/^\d+$/.test(cleanInput)) {
      id = cleanInput;
  }

  if (!id) {
      console.warn("无法解析 ID");
      return [];
  }

  // 2. 简单的类型推断
  let type: 'song' | 'album' = 'song';
  if (cleanInput.includes('album')) {
      type = 'album';
  }

  console.log(`[MusicService] Resolving via API: ${id} (Type: ${type})`);

  try {
      // --- 策略 A: 如果明确是专辑，或者作为备选 ---
      if (type === 'album') {
          return await fetchAlbum(id);
      }

      // --- 策略 B: 默认为单曲 ---
      const res = await api.getSongDetail(id);
      if (res.songs && res.songs.length > 0) {
          const s = res.songs[0];
          return [{
              id: s.id.toString(),
              title: s.name,
              artist: s.ar.map((a: any) => a.name).join(' / '),
              album: s.al.name,
              coverUrl: s.al.picUrl,
              platformUrl: `https://music.163.com/#/song?id=${s.id}`
          }];
      } else {
          // 如果单曲解析失败，试试是不是专辑 ID 填错了位置？
          console.log("[MusicService] Song resolve failed, trying Album...");
          return await fetchAlbum(id);
      }

  } catch (e) {
      console.error("[MusicService] API Resolve Failed", e);
  }

  return [];
};

// 辅助函数：获取专辑
async function fetchAlbum(id: string): Promise<Song[]> {
    try {
        const res = await api.getAlbum(id);
        if (res.code === 200 && res.album && res.songs) {
             const albumName = res.album.name;
             const albumCover = res.album.picUrl;
             
             console.log(`[MusicService] Album found: ${albumName} (${res.songs.length} tracks)`);

             return res.songs.map((s: any) => ({
                 id: s.id.toString(),
                 title: s.name,
                 artist: s.ar.map((a: any) => a.name).join(' / '),
                 album: albumName,
                 coverUrl: albumCover,
                 platformUrl: `https://music.163.com/#/song?id=${s.id}`
             }));
        }
    } catch (e) {
        console.warn("[MusicService] Album fetch error", e);
    }
    return [];
}