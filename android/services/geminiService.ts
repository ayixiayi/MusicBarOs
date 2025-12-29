import { Song } from "../types";

// [Config] User provided cookie for stability
const NETEASE_COOKIE = "_iuqxldmzr_=32; _ntes_nnid=a0f03beb79a1dcd465c6ca935b2110cc,1751374923870; _ntes_nuid=a0f03beb79a1dcd465c6ca935b2110cc; NMTID=00OyFhQRdzw8yLHXkdftUDE9mCf55cAAAGXxhSNJA; WEVNSM=1.0.0; WNMCID=ycikfn.1751374924457.01.0; WM_TID=fbG6dMuyJcJAVUQEVFfCLuFsVmDCEF1Q; ntes_utid=tid._.Sfd6WgmYopRFBgVBFBPXPvFoB3SGBMvQ._.0; sDeviceId=YD-DORlSbnA8%2BdBRwQFEBPGb%2BE9VyWDRY%2FA; nts_mail_user=ayixiyouxiang@163.com:-1:1; NTES_P_UTID=vBFVFnbhou87Mb1obuEQxh6pDfxnjE2R|1759221175; NTES_YD_PASSPORT=fkaQkaqcfyPBWITH0mYLci2ZUhcq83GOHhjbKOzXgyj_Wh3VWELSHa6IwCUL5G0mESHukvOcrNvTnaQGNVw5TDh7WinJ4Zb2U7mFl5NmqMS15iESUcAnWNyrwTFJ5ZF.IWostJA6hRLTPz0vUDsNb7UFaM7oJ7r8aiRH6kE9.rxmat9u0Kyu3iYSlcJIWPw2VMjFBG7Ikef7AAESMy0WnaEjI_6TjqOtk; P_INFO=13512262335|1763379846|1|phoenix_client|00&99|null&null&null#shh&null#10#0|&0||13512262335; timing_user_id=time_cehAZBktFD; WM_NI=zOs8f0BSdA%2BYP98Ti9gtR618aixvna9%2FSIcghWahFW1JpBujU7E4bUuNMXO0Dn%2F81QnUugznL3zcI%2Bz8qJYZ1yiNVT4Tp7zHbI8h%2Bha%2FTt7z11hOTNSTvwayiwamIQzWalE%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6eeabdc43ad8a82d0bc7fa8b08aa2c54b879a9b82c26390a6f88cf943b4baba99e22af0fea7c3b92aba91bdd9e53c828daca2aa5394e7f8b5ec33a5ac9ed7b434a3b7b897ed6bfbf19daae26dac89af89c55df396c0a3f86297e98bd5e15fb79283b9ce3c88b2e1d9b45bae8bbb88f96690edb684cc21bae8bfabdc52f3a7a7afd560f88cc0d8f944a297f889aa64a3f19c95b672f3efa8b0d746918cba98e473aba9af8ecc5bba89af8dc837e2a3; __snaker__id=4iWWEuJI5qZ5n6jX; ntes_kaola_ad=1; JSESSIONID-WYYY=QhQMSHA2FUk6yKrupIPZmndj%5CR%5CRgh4HV64Ouor5ZQVnnUH7%5CXWYYezwF5TmUmlovvS6Gu%2BiCipxDxz3xnET5pvI5sIZ%2BDRhVzBns9uhJ3F9T3U6SMTpvxCUVsgUbN8oHBidKqnU8AM%5CrBoOpWsIWNu%2FecYmzt2%2BsxiINDT7h6rcP%2BXf%3A1764977008668; gdxidpyhxdE=OGMdYAQmopGPMVcoxupKcHCULK3iijOCQBpe7tl7dAEo%2BajyYVkMw%5C85K22vHkRYHbWSH0adg64yA2m83BqByjkT1jaoMQNN0HwCpf8VDDtK%2FH3IqkTNgsJd%2B7ZwxPfZgT5PHSCnOBil0sPlbbI72HC4q1wlEDsqeOAfiB%2BKhR%5CzXqnG%3A1764976115458; MUSIC_U=00BA3FFDC1D8BF0E9D9635F7C410C919BCA47AFE0BFBF17A5FB2EDEFFAFBE493D89320C5368B826E90803364C2FB7FEAEF3FC66813E2DD8E8244E90CCE194FC99B740B6A52B64A3F657CEF4FCF52459CAB55A82B5EA0B07A080C027824E8FCE0224C18B04382A5D457F13B0FE98DF517EEB4A8FA4985F225398DA2B2A745DC6CF751BE2D678EF623D812B06B708A5F5BC54E4D45180413B9012A91110D5AF875EF32731E9A7053A6B531A917B89D6900C2071DDA77F492164E476840CAA6F5BB67CAB28B06D9119F08DE89A22EDD695CBCE5C3DEBF56AB24C1F7C63FC5F8558A20FB07BAA28336FAA94C592D8A7A82400728226DA6D7B6C14592F6403D0E649D5B87680BAB20B78AA35FAFF8DA0AE78666CAC748FEF3E947FAFD6CABE79A5BEF9C706BE60D4D7D1BCD593BC2A0798EC3BDA56A13DD333E414EB2F7118805FD55BEC2B1650ED38BCF841DDE9C2ACB9DC24B250EF10F2903CE884093EE5F57A5C1A6409C20BBFD314319F3BD3294BDE9105FFF2F2FE0A751AA2863822657219EA3091457723C5C3CB78173462972E8187596; __csrf=1226b83b146715c096134cb549f8f110; playerid=86745887";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
const REF = "https://music.163.com/";

// UUID Polyfill
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/**
 * Fetch Data via Proxy with fallbacks
 */
const fetchViaProxy = async (targetUrl: string, headers: Record<string, string> = {}): Promise<string | null> => {
    const proxies = [
        (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&timestamp=${Date.now()}`
    ];

    try {
        const res = await fetch(targetUrl, { headers });
        if (res.ok) return await res.text();
    } catch (e) { /* continue */ }

    for (const proxyGen of proxies) {
        const proxyUrl = proxyGen(targetUrl);
        try {
            const isAllOrigins = proxyUrl.includes('allorigins');
            const res = await fetch(proxyUrl, { headers: isAllOrigins ? undefined : headers });
            
            if (res.ok) {
                if (isAllOrigins) {
                    const json = await res.json();
                    return json.contents;
                }
                const text = await res.text();
                if (text && !text.includes('Proxy Error') && !text.includes('Too Many Requests')) {
                    return text;
                }
            }
        } catch (e) {
            console.warn(`[Proxy] Failed: ${proxyUrl}`, e);
        }
    }
    return null;
};

export const extractCleanTarget = (input: string): string => {
    if (!input) return '';
    return input.replace(/['"]/g, '').trim();
};

/**
 * Resolves short links (e.g. 163cn.tv) to full URLs.
 * Optimized: Only resolves if necessary.
 */
export const resolveSmartLink = async (input: string): Promise<string> => {
    // Fast Path: If it's already a music.163.com link with an ID, skip resolution.
    if (input.includes('music.163.com') && (input.includes('id=') || /\/\d+/.test(input))) {
        return input;
    }

    console.log(`[LinkResolver] Resolving short/alias link: ${input}`);
    const html = await fetchViaProxy(input);
    if (html) {
        const ogUrlMatch = html.match(/<meta\s+(?:property|name)=["']og:url["']\s+content=["'](.*?)["']/i);
        if (ogUrlMatch && ogUrlMatch[1]) return ogUrlMatch[1];
        
        const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i);
        if (canonicalMatch && canonicalMatch[1]) return canonicalMatch[1];
    }
    return input;
};

// Types for internal logic
type MusicType = 'album' | 'song' | 'unknown';

interface ParsedTarget {
    id: string;
    type: MusicType;
}

/**
 * Parses ID and Type from a URL string
 */
const parseTargetFromUrl = (url: string): ParsedTarget | null => {
    // 1. Check for Album
    const albumMatch = url.match(/album\?id=(\d+)/) || url.match(/\/album\/(\d+)/);
    if (albumMatch && albumMatch[1]) {
        return { id: albumMatch[1], type: 'album' };
    }
    
    // 2. Check for Song
    const songMatch = url.match(/song\?id=(\d+)/) || url.match(/\/song\/(\d+)/);
    if (songMatch && songMatch[1]) {
        return { id: songMatch[1], type: 'song' };
    }

    // 3. Check for generic ID (often song, but treated as unknown to be safe if ambiguous)
    // Note: If the URL is explicitly like music.163.com/#/m/12345, it is ambiguous
    const genericMatch = url.match(/[?&]id=(\d+)/) || url.match(/\/(\d{5,})/);
    if (genericMatch && genericMatch[1]) {
         return { id: genericMatch[1], type: 'unknown' };
    }

    return null;
};

export const fetchMusicData = async (query: string): Promise<Song[]> => {
  let cleanInput = extractCleanTarget(query);
  let targetId: string | null = null;
  let targetType: MusicType = 'unknown';

  // --- STEP 1: FAST PATH (Static Extraction) ---
  // Try to parse ID/Type directly from input to avoid network request
  const fastParse = parseTargetFromUrl(cleanInput);
  if (fastParse && cleanInput.includes('music.163.com')) {
      // High confidence standard URL
      targetId = fastParse.id;
      targetType = fastParse.type;
      console.log(`[MusicService] ⚡ Fast Path Hit: ${targetType} ID ${targetId}`);
  } else {
      // --- STEP 2: RESOLUTION (Network) ---
      // Only resolve if it looks like a URL but NOT a standard one we already parsed
      if (cleanInput.includes('http')) {
          cleanInput = await resolveSmartLink(cleanInput);
          // Parse again after resolution
          const resolvedParse = parseTargetFromUrl(cleanInput);
          if (resolvedParse) {
              targetId = resolvedParse.id;
              targetType = resolvedParse.type;
          }
      } else if (/^\d+$/.test(cleanInput)) {
          // Pure ID input
          targetId = cleanInput;
          targetType = 'unknown'; 
      }
  }

  if (!targetId) {
      console.error("[MusicService] No valid ID found.");
      return [];
  }

  console.log(`[MusicService] Processing: ID=${targetId}, Type=${targetType}`);

  // --- STEP 3: API EXECUTION ---
  
  const fetchAlbum = async (id: string) => {
      const api = `https://music.163.com/api/album/${id}?ext=true&id=${id}&offset=0&total=true`;
      const raw = await fetchViaProxy(api, { 'User-Agent': UA, 'Referer': REF, 'Cookie': NETEASE_COOKIE });
      if (raw) {
          const data = JSON.parse(raw);
          if (data.code === 200 && data.album && data.album.songs) {
              const albumName = data.album.name;
              const albumCover = data.album.picUrl;
              return data.album.songs.map((s: any) => ({
                  id: generateUUID(),
                  title: s.name,
                  artist: s.artists.map((a: any) => a.name).join(' / '),
                  album: albumName,
                  coverUrl: albumCover, 
                  platformUrl: `https://music.163.com/#/song?id=${s.id}`
              }));
          }
      }
      return [];
  };

  const fetchSong = async (id: string) => {
      const api = `https://music.163.com/api/song/detail/?id=${id}&ids=%5B${id}%5D`;
      const raw = await fetchViaProxy(api, { 'User-Agent': UA, 'Referer': REF, 'Cookie': NETEASE_COOKIE });
      if (raw) {
          const data = JSON.parse(raw);
          if (data.songs && data.songs.length > 0) {
              const s = data.songs[0];
              return [{
                  id: generateUUID(),
                  title: s.name,
                  artist: s.artists.map((a: any) => a.name).join(' / '),
                  album: s.album.name,
                  coverUrl: s.album.picUrl,
                  platformUrl: `https://music.163.com/#/song?id=${id}`
              }];
          }
      }
      return [];
  };

  // Execution Strategy based on Type
  let songs: Song[] = [];

  if (targetType === 'album') {
      songs = await fetchAlbum(targetId);
  } else if (targetType === 'song') {
      songs = await fetchSong(targetId);
  } else {
      // Unknown type (Ambiguous ID): Try Album first, then Song
      console.log("[MusicService] Type unknown, trying Album API first...");
      songs = await fetchAlbum(targetId);
      if (songs.length === 0) {
          console.log("[MusicService] Album failed, trying Song API...");
          songs = await fetchSong(targetId);
      }
  }

  if (songs.length > 0) return songs;

  // --- STEP 4: HTML SCRAPER FALLBACK (Last Resort) ---
  console.log("[MusicService] All APIs failed. Engaging HTML Scraper Fallback...");
  
  // Construct fallback URL. If type is song, use song URL, otherwise default to album scraper as it's more robust for lists
  const fallbackUrl = targetType === 'song' 
      ? `https://music.163.com/song?id=${targetId}`
      : `https://music.163.com/album?id=${targetId}`;

  const html = await fetchViaProxy(fallbackUrl);
  if (html) {
      // 1. Try Album textarea extraction
      const textareaMatch = html.match(/<textarea id="song-list-pre-data"[^>]*>(.*?)<\/textarea>/s);
      if (textareaMatch && textareaMatch[1]) {
          try {
              const json = JSON.parse(textareaMatch[1]);
              const albumName = html.match(/<meta property="og:title" content="(.*?)"/i)?.[1] || "Unknown Album";
              const coverMatch = html.match(/<meta property="og:image" content="(.*?)"/i);
              let albumCover = coverMatch ? coverMatch[1] : "";
              if (albumCover) albumCover = albumCover.replace(/\?param=\d+y\d+/, '?param=500y500');

              if (Array.isArray(json)) {
                  return json.map((s: any) => ({
                      id: generateUUID(),
                      title: s.name,
                      artist: s.artists ? s.artists.map((a: any) => a.name).join(' / ') : "Unknown",
                      album: s.album ? s.album.name : albumName,
                      coverUrl: s.album && s.album.picUrl ? s.album.picUrl : albumCover,
                      platformUrl: `https://music.163.com/#/song?id=${s.id}`
                  }));
              }
          } catch (e) {}
      }

      // 2. Try Single Song Meta Tags
      const ogTitle = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["'](.*?)["']/i);
      const ogImage = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["'](.*?)["']/i);
      
      if (ogTitle && ogTitle[1]) {
           let title = ogTitle[1];
           let artist = "Unknown Artist";
           if (title.includes(' - ')) {
               const parts = title.split(' - ');
               title = parts[0];
               artist = parts[1];
           }
           return [{
               id: generateUUID(),
               title: title,
               artist: artist,
               album: "Web Source",
               coverUrl: ogImage ? ogImage[1] : "",
               platformUrl: fallbackUrl
           }];
      }
  }

  return [];
};