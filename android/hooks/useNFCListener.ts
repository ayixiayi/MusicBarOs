import { useEffect, useRef } from 'react';
import { App, URLOpenListenerEvent } from '@capacitor/app';

/**
 * 统一 NFC 监听 Hook
 * Path 1 (内建): 通过 Deep Link (musicbar://) 监听
 * Path 2 (外接): 通过 HID 键盘模拟监听 (ESP32 / 蓝牙读卡器)
 */
export const useNFCListener = (onPlayId: (id: string) => void) => {
  const bufferRef = useRef('');
  const lastKeyTime = useRef(0);

  useEffect(() => {
    console.log("[NFC] Initializing listeners...");

    // --- Path 1: 内建 NFC (Deep Link) ---
    const handleUrlOpen = (data: URLOpenListenerEvent) => {
        console.log("[DeepLink] Triggered:", data.url);
        if (data.url.includes('musicbar')) {
            const idMatch = data.url.match(/id=(\d+)/);
            if (idMatch) {
                const songId = idMatch[1];
                console.log("[NFC] DeepLink detected song:", songId);
                onPlayId(songId);
            }
        }
    };
    
    App.addListener('appUrlOpen', handleUrlOpen);

    App.getLaunchUrl().then(launchUrl => {
        if (launchUrl && launchUrl.url) {
            handleUrlOpen(launchUrl);
        }
    });

    // --- Path 2: 外接 HID 模拟 (ESP32 / 扫描枪) ---
    const handleKeyDown = (e: KeyboardEvent) => {
        // 忽略输入框
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        const now = Date.now();
        // 放宽到 300ms 以兼容蓝牙传输长 Hex 字符串
        if (now - lastKeyTime.current > 300) {
            bufferRef.current = '';
        }
        lastKeyTime.current = now;

        if (e.key === 'Enter') {
            const input = bufferRef.current.trim();
            if (input.length > 0) {
                console.log("[HID] Scanner Input:", input);
                
                // 1. 尝试匹配完整 Scheme
                if (input.includes('musicbar')) {
                     const idMatch = input.match(/id=(\d+)/);
                     if (idMatch) {
                         onPlayId(idMatch[1]);
                         bufferRef.current = '';
                         return;
                     }
                } 
                
                // 2. 尝试匹配 Hex ID (ESP32 发送的 UID)
                // 允许 A-F, a-f, 0-9，长度至少 4 位
                if (/^[0-9A-Fa-f]{4,}$/.test(input)) {
                     console.log("[HID] Valid Hex ID detected:", input);
                     onPlayId(input.toUpperCase());
                     bufferRef.current = '';
                     return;
                }
            }
            bufferRef.current = '';
        } else {
            // 只要是单个字符(数字/字母)就记录
            if (e.key.length === 1) {
                bufferRef.current += e.key;
            }
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        App.removeAllListeners();
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onPlayId]);
};