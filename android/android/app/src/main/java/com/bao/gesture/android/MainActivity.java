package com.bao.gesture.android;

import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.nfc.NfcAdapter;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 1. 强制使用媒体音量控制流
        setVolumeControlStream(AudioManager.STREAM_MUSIC);

        // 2. [新增] 显式请求音频焦点 (Audio Focus)
        // 这是让 Android 系统显示 MediaStyle 通知栏的关键
        requestAudioFocus();

        // 3. 处理 NFC 冷启动
        fixNfcIntent(getIntent());
        super.onCreate(savedInstanceState);
    }

    private void requestAudioFocus() {
        try {
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build();
                
                AudioFocusRequest focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                        .setAudioAttributes(playbackAttributes)
                        .setAcceptsDelayedFocusGain(true)
                        .setOnAudioFocusChangeListener(focusChange -> {
                            // 暂时忽略焦点丢失处理，保持简单
                        })
                        .build();
                
                audioManager.requestAudioFocus(focusRequest);
            } else {
                // 旧版 Android 兼容
                audioManager.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        // [关键逻辑] 热启动/前台运行时，不要修改 Intent！
        // 让 Reader Mode (插件) 独占处理，避免触发系统弹窗或 Deep Link 冲突
        super.onNewIntent(intent);
    }

    private void fixNfcIntent(Intent intent) {
        if (intent != null && NfcAdapter.ACTION_NDEF_DISCOVERED.equals(intent.getAction())) {
            // 将 NFC 事件伪装成浏览器跳转，骗过 Capacitor 获取 Launch URL
            intent.setAction(Intent.ACTION_VIEW);
        }
    }
}
