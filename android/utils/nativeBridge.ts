import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { StatusBar } from '@capacitor/status-bar';
import { VolumeControl } from '@odion-cloud/capacitor-volume-control';

const isElectron = () => !!(window as any).electronAPI;
const isAndroid = () => Capacitor.getPlatform() === 'android';

export const initMobileFeatures = async () => {
  if (isAndroid()) {
    try {
      await KeepAwake.keepAwake();
      await StatusBar.hide();
    } catch (e) { console.warn('初始化失败', e); }
  }
};

export const getSystemVolume = async (): Promise<number> => {
  if (isAndroid()) {
    try {
      const info = await VolumeControl.getVolumeLevel();
      return info.value; 
    } catch (e) {
      console.warn("Get volume failed", e);
      return 0.5;
    }
  }
  return 0.5;
};

// 修复版：结合了音量量化问题的修复
export const setSystemVolume = async (delta: number): Promise<number> => {
  if (isElectron()) {
    // @ts-ignore
    await window.electronAPI.adjustVolume(delta);
    return 0.5; 
  } else if (isAndroid()) {
    try {
      // 每次都重新读取，以避免缓存不同步的问题
      const info = await VolumeControl.getVolumeLevel(); 
      const currentVol = info.value;

      // 关键修复：安卓系统音量通常只有 15 级，步进约为 0.067
      // 之前的 0.01 太小，导致向上取整失败，卡死在当前级别
      // 现在改为 0.07，确保每次都能跨过一个系统步进
      const change = delta * 0.07; 
      let newVol = currentVol + change;

      // 限制范围
      if (newVol > 1) newVol = 1;
      if (newVol < 0) newVol = 0;

      await VolumeControl.setVolumeLevel({ value: newVol });
      
      // 返回我们期望设置的值
      return newVol;
    } catch (e) {
      console.error("安卓音量调节失败:", e);
      return 0.5; 
    }
  }
  return 0.5;
};