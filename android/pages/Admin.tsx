import React, { useState, useEffect, useRef } from 'react';
import { Song, UserSettings, UserProfile } from '../types';
import { fetchMusicData, extractCleanTarget } from '../services/geminiService';
import { ArrowLeft, Save, Trash2, Search, User, RefreshCw, ArrowUp, ArrowDown, Edit3, Cookie, ShieldAlert, CheckCircle2, Activity, Download, Upload, FileJson } from 'lucide-react';
import { Link } from 'react-router-dom';
import { storage } from '../utils/storage';
import { api } from '../services/api';
import { CapacitorNfc } from '@capgo/capacitor-nfc';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Helper: Encode string to byte array
const stringToBytes = (str: string) => {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
};

interface AdminProps {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  settings: UserSettings;
  setSettings: (settings: UserSettings) => void;
  user: UserProfile;
  setUser: (user: UserProfile) => void;
}

export const Admin: React.FC<AdminProps> = ({ songs, setSongs, settings, setSettings, user }) => {
  const [activeTab, setActiveTab] = useState<'songs' | 'settings'>('songs');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showManualModal, setShowManualModal] = useState(false);
  const [bindModal, setBindModal] = useState<{ isOpen: boolean; songId: string | null }>({ isOpen: false, songId: null });
  const [manualForm, setManualForm] = useState<Partial<Song>>({
    id: '', title: '', artist: '', album: '', coverUrl: '', platformUrl: ''
  });
  
  // File Input Ref for Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- QR Code Login State ---
  const [qrImg, setQrImg] = useState('');
  const [qrStatus, setQrStatus] = useState<string>(''); 
  const checkIntervalRef = useRef<any>(null);

  // 清理定时器
  useEffect(() => {
      return () => {
          if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      };
  }, []);

  const startQrLogin = async () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      setQrStatus('正在获取二维码...');
      setQrImg('');

      try {
          // 1. 获取 Key
          const keyRes = await api.getQrKey();
          const key = keyRes.data.unikey;

          // 2. 获取二维码图片
          const imgRes = await api.createQrImg(key);
          setQrImg(imgRes.data.qrimg);
          setQrStatus('请使用网易云音乐 App 扫码');

          // 3. 开始轮询 (每 3 秒检查一次)
          checkIntervalRef.current = setInterval(async () => {
              try {
                  const checkRes = await api.checkQrStatus(key);
                  // 注意：api.ts 里的 checkQrStatus 可能返回整个 JSON，code 在里面
                  const code = checkRes.code;

                  if (code === 800) {
                      setQrStatus('二维码已过期，点击刷新');
                      clearInterval(checkIntervalRef.current);
                  } else if (code === 801) {
                      // 等待扫码
                  } else if (code === 802) {
                      setQrStatus('扫码成功，请在手机上确认');
                  } else if (code === 803) {
                      setQrStatus('登录成功！');
                      clearInterval(checkIntervalRef.current);
                      
                      // 保存 Cookie
                      if (checkRes.cookie) {
                          // 保存到 settings，这样 Visualizer 里的播放器就能读到了
                          setSettings({...settings, cookie: checkRes.cookie});
                          alert("登录成功！VIP 身份已激活。");
                      }
                  }
              } catch (e) {
                  console.error("QR Check Failed", e);
              }
          }, 3000);

      } catch (e) {
          setQrStatus('连接服务器失败');
          console.error(e);
      }
  };

  // --- Data Backup & Restore ---
  const handleExportBackup = async () => {
      try {
          const backupData = {
              version: "1.0",
              timestamp: Date.now(),
              device: "MusicBar Android",
              songs: songs,
              settings: settings
          };
          
          const fileName = `musicbar_backup_${new Date().toISOString().slice(0,10)}.json`;
          const jsonStr = JSON.stringify(backupData, null, 2);

          // 1. 写入文件
          const result = await Filesystem.writeFile({
              path: fileName,
              data: jsonStr,
              directory: Directory.Cache, // 使用 Cache 目录，临时且安全
              encoding: Encoding.UTF8
          });

          console.log("[Admin] File written:", result.uri);

          // 2. 分享文件
          await Share.share({
              title: 'MusicBar Config Backup',
              text: `MusicBar 备份数据 (${songs.length} 首歌)`,
              url: result.uri,
              dialogTitle: '保存或发送备份文件'
          });

      } catch (e) {
          console.error("Export failed", e);
          alert("导出失败: " + JSON.stringify(e));
      }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const content = e.target?.result as string;
              const data = JSON.parse(content);

              if (data && Array.isArray(data.songs)) {
                  // 验证通过
                  if (confirm(`检测到备份文件：\n包含 ${data.songs.length} 首歌曲。\n\n是否覆盖当前配置？`)) {
                      setSongs(data.songs);
                      if (data.settings) {
                          setSettings(data.settings);
                      }
                      alert("导入成功！");
                  }
              } else {
                  alert("无效的备份文件格式");
              }
          } catch (err) {
              console.error("Import parsing failed", err);
              alert("文件解析失败");
          }
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  // --- 歌曲处理逻辑 ---
  const handleAddSong = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    let targetInput = extractCleanTarget(searchQuery);
    
    try {
      const generatedSongs = await fetchMusicData(targetInput);
      
      if (generatedSongs && generatedSongs.length > 0) {
        // 数据清洗：把 UUID 替换回 网易云 ID (如果存在)
        const finalSongs = generatedSongs.map(song => {
          const realIdMatch = song.platformUrl?.match(/id=(\d+)/);
          const realId = realIdMatch ? realIdMatch[1] : song.id;
          return { ...song, id: realId };
        });

        setSongs(prev => [...prev, ...finalSongs]);
        setSearchQuery('');
      } else {
        setShowManualModal(true);
      }
    } catch (e) {
      console.error(e);
      setShowManualModal(true);
    } finally {
      setIsSearching(false);
    }
  };

  // --- NFC 录入逻辑 (新增歌曲) ---
  useEffect(() => {
    // 只有当手动添加弹窗打开时，才监听 NFC 事件用于录入
    if (!showManualModal) return;

    const handleNfcInput = (e: Event) => {
        const id = sessionStorage.getItem('pending_play_id');
        if (id) {
            console.log("[Admin] NFC ID Captured for Input:", id);
            setManualForm(prev => ({ ...prev, id: id }));
            sessionStorage.removeItem('pending_play_id');
            alert(`NFC 卡片已捕获！ID: ${id}`);
        }
    };

    window.addEventListener('nfc-play-request', handleNfcInput);
    return () => window.removeEventListener('nfc-play-request', handleNfcInput);
  }, [showManualModal]);

// ... (imports moved to top)

// ... (component starts)

  // --- NFC 绑定 & 写卡逻辑 (现有歌曲) ---
  useEffect(() => {
    if (!bindModal.isOpen || !bindModal.songId) return;

    let nfcListener: any = null;
    let isProcessing = false; 
    
    const initNfcWrite = async () => {
        try {
            console.log("[Admin] Checking NFC Status...");
            const status = await CapacitorNfc.getStatus();
            if (status.status === 'NFC_DISABLED') {
                alert("请先在手机设置中开启 NFC");
                CapacitorNfc.showSettings().catch(() => {});
                return;
            } else if (status.status === 'NO_NFC') {
                alert("此设备不支持 NFC");
                return;
            }

            try { await (CapacitorNfc as any).removeAllListeners(); } catch(e) {}
            
            nfcListener = await CapacitorNfc.addListener('nfcEvent', async (event) => {
                if (isProcessing) return;
                isProcessing = true; // 锁定

                console.log("[Admin] Tag discovered:", event.tag);
                if (navigator.vibrate) navigator.vibrate(50);
                
                const tag = event.tag;
                const songId = bindModal.songId!;

                // A. 尝试写入 (URI Record)
                let writeSuccess = false;
                try {
                    const uri = `musicbar://play?id=${songId}`;
                    const uriBytes = stringToBytes(uri);
                    const payload = [0x00, ...uriBytes]; 

                    await CapacitorNfc.write({
                        allowFormat: true, // 尝试格式化
                        records: [{ tnf: 1, type: [85], id: [], payload: payload }]
                    });
                    writeSuccess = true;
                    console.log("[Admin] Write success");
                } catch (writeErr: any) {
                    console.warn("[Admin] Write failed (common for non-standard cards):", writeErr);
                    writeSuccess = false;
                }

                // B. 读取 UID 并绑定
                let uid = '';
                if (tag.id && Array.isArray(tag.id)) {
                    // 转换逻辑：将所有字节转换为完整的 Hex 字符串 (例如 04A23C...)
                    // 这对于 7 字节的 NTAG213 是唯一且标准的识别方式
                    uid = (tag.id as number[])
                        .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2))
                        .join('')
                        .toUpperCase();
                }

                if (uid) {
                    // 互斥绑定：先清除其他歌曲中可能存在的此 UID
                    setSongs(prev => prev.map(s => {
                        if (s.nfcId === uid && s.id !== songId) {
                            return { ...s, nfcId: undefined };
                        }
                        if (s.id === songId) {
                            return { ...s, nfcId: uid };
                        }
                        return s;
                    }));

                    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                    
                    if (writeSuccess) {
                        alert(`✅ 制卡并绑定成功！\n卡号 (HEX): ${uid}\n\n该卡现已支持冷启动唤醒 App。`);
                    } else {
                        alert(`✅ 绑定成功 (只读模式)\n卡号 (HEX): ${uid}\n\n卡片不支持数据写入，但您仍可以在 App 打开时刷卡播放。`);
                    }
                    
                    // 延迟一点再停止，防止过早断开连接导致 write 回调未触发
                    setTimeout(async () => {
                        await CapacitorNfc.stopScanning();
                        setBindModal({ isOpen: false, songId: null });
                        isProcessing = false;
                    }, 500);
                } else {
                    alert("未能获取卡片 UID，请重试");
                    isProcessing = false;
                }
            });

            await CapacitorNfc.startScanning();
            console.log("[Admin] NFC Scanning started...");

        } catch (err) {
            console.error("[Admin] Failed to start NFC:", err);
            alert("NFC 启动失败: " + JSON.stringify(err));
        }
    };

    initNfcWrite();

    // 同时保留被动监听 (兼容 ESP32 读卡器模拟输入)
    const handlePassiveBind = (e: Event) => {
        const id = sessionStorage.getItem('pending_play_id');
        if (id) {
            console.log(`[Admin] Passive Binding ID ${id} to Song ${bindModal.songId}`);
            setSongs(prev => prev.map(s => s.id === bindModal.songId ? { ...s, nfcId: id } : s));
            sessionStorage.removeItem('pending_play_id');
            alert(`绑定成功 (仅ID)！\n卡号: ${id}`);
            setBindModal({ isOpen: false, songId: null });
        }
    };
    window.addEventListener('nfc-play-request', handlePassiveBind);

    return () => {
        CapacitorNfc.stopScanning().catch(() => {});
        try { (CapacitorNfc as any).removeAllListeners().catch(() => {}); } catch(e) {}
        if (nfcListener) nfcListener.remove();
        window.removeEventListener('nfc-play-request', handlePassiveBind);
    };
  }, [bindModal, setSongs]);

  const handleManualSubmit = () => {
        if (!manualForm.title || !manualForm.id) {
            alert("请填写标题和网易云ID");
            return;
        }
        setSongs(prev => [...prev, { 
            ...manualForm, 
            id: manualForm.id || Date.now().toString(), 
            coverUrl: manualForm.coverUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(manualForm.title)}&background=27272a&color=fff` 
        } as Song]);
        setShowManualModal(false);
        setManualForm({ id: '', title: '', artist: '', album: '', coverUrl: '', platformUrl: '' });
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      setSelectedIds(newSet);
  };

  const moveSong = (index: number, direction: 'up' | 'down') => {
    const newSongs = [...songs];
    if (direction === 'up' && index > 0) [newSongs[index], newSongs[index - 1]] = [newSongs[index - 1], newSongs[index]];
    else if (direction === 'down' && index < songs.length - 1) [newSongs[index], newSongs[index + 1]] = [newSongs[index + 1], newSongs[index]];
    setSongs(newSongs);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 p-4 sm:p-12 relative overflow-x-hidden font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
                <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft className="text-zinc-400" /></Link>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">控制台</h1>
            </div>
            <div className="hidden sm:flex items-center space-x-3 bg-zinc-900 border border-white/10 rounded-full pl-1 pr-4 py-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-inner"><User size={16} /></div>
                <span className="text-sm font-mono font-bold text-zinc-300">{user.username}</span>
            </div>
        </div>

        <div className="flex space-x-1 bg-zinc-900/50 p-1 rounded-xl mb-8 w-fit border border-white/5 backdrop-blur-sm">
            {['songs', 'settings'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-zinc-800 text-white shadow-lg ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    {tab === 'songs' ? '歌单管理' : '高级设置'}
                </button>
            ))}
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-4 sm:p-8 min-h-[500px] shadow-2xl">
            {activeTab === 'songs' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 group">
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="粘贴歌曲链接或 ID..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 pl-10 text-white focus:ring-2 focus:ring-blue-500/50 transition-all group-hover:border-zinc-700" onKeyDown={(e) => e.key === 'Enter' && handleAddSong()}/>
                            <Search className="absolute left-3 top-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" size={18} />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleAddSong} disabled={isSearching} className="flex-1 sm:flex-none bg-white text-black px-6 rounded-xl font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50 shadow-lg shadow-white/5">{isSearching ? <RefreshCw className="animate-spin" size={18}/> : '添加'}</button>
                            <button onClick={() => setShowManualModal(true)} className="bg-zinc-800 text-white border border-zinc-700 px-4 rounded-xl font-medium hover:bg-zinc-700 transition-colors"><Edit3 size={18}/></button>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {songs.length === 0 && (<div className="text-center py-20 text-zinc-600"><p className="text-sm">暂无歌曲</p></div>)}
                        {songs.map((song, index) => (
                            <div key={song.id} onClick={() => toggleSelection(song.id)} className={`flex items-center p-3 rounded-xl border transition-all cursor-pointer group ${selectedIds.has(song.id) ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                                <div className="flex flex-col mr-3 space-y-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => moveSong(index, 'up')} disabled={index === 0} className="text-zinc-500 hover:text-white disabled:opacity-20"><ArrowUp size={14}/></button>
                                    <button onClick={() => moveSong(index, 'down')} disabled={index === songs.length - 1} className="text-zinc-500 hover:text-white disabled:opacity-20"><ArrowDown size={14}/></button>
                                </div>
                                <img src={song.coverUrl} className="w-12 h-12 rounded-lg object-cover bg-zinc-800" alt="" />
                                <div className="ml-4 flex-1 overflow-hidden">
                                    <h3 className="font-bold text-zinc-200 truncate text-sm">
                                        {song.title}
                                        {song.nfcId && <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">NFC</span>}
                                    </h3>
                                    <p className="text-xs text-zinc-500 truncate font-mono">{song.artist}</p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setBindModal({ isOpen: true, songId: song.id }); }} className="p-2 flex items-center gap-1 text-zinc-600 hover:text-blue-400 transition-colors" title="绑定实体卡">
                                    <Activity size={16}/>
                                    <span className="text-xs font-bold">绑定</span>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setSongs(prev => prev.filter(s => s.id !== song.id)); }} className="p-2 text-zinc-600 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    
                    {/* Backup & Restore Module */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileJson className="text-emerald-500" size={20}/> <span>数据备份与迁移</span></h3>
                        <div className="p-4 bg-zinc-900/80 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <div className="flex gap-4">
                                <button 
                                    onClick={handleExportBackup}
                                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-xl transition-colors border border-white/5"
                                >
                                    <Upload size={18} className="text-emerald-400" />
                                    <div className="text-left">
                                        <div className="text-sm font-bold">导出配置</div>
                                        <div className="text-[10px] text-zinc-500">保存 JSON 备份</div>
                                    </div>
                                </button>
                                
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-xl transition-colors border border-white/5"
                                >
                                    <Download size={18} className="text-blue-400" />
                                    <div className="text-left">
                                        <div className="text-sm font-bold">导入配置</div>
                                        <div className="text-[10px] text-zinc-500">恢复歌单与绑定</div>
                                    </div>
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleImportBackup} 
                                    accept=".json" 
                                    className="hidden" 
                                />
                            </div>
                        </div>
                    </section>

                    {/* Netease Login Module */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><Cookie className="text-amber-500" size={20}/> <span>网易云账号</span></h3>
                        <div className="p-1 bg-gradient-to-b from-white/5 to-transparent rounded-2xl border border-white/10">
                            <div className="bg-zinc-900/80 rounded-xl p-6 space-y-6 backdrop-blur-sm">
                                
                                {settings.cookie && settings.cookie.includes('MUSIC_U') ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                                                <CheckCircle2 className="text-green-500" size={24} />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold">已登录</p>
                                                <p className="text-xs text-zinc-500 font-mono">VIP Cookie Active</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                if(confirm("确定要清除登录信息吗？")) setSettings({...settings, cookie: ''});
                                            }}
                                            className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            注销
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6 flex flex-col items-center justify-center py-4">
                                        <div className="flex items-start gap-3 w-full mb-2">
                                            <ShieldAlert className="text-zinc-500 shrink-0 mt-1" size={16} />
                                            <div className="space-y-1"><p className="text-sm font-medium text-zinc-300">身份凭证</p><p className="text-[11px] text-zinc-500">推荐使用扫码登录，安全且成功率高。</p></div>
                                        </div>
                                        
                                        {/* 二维码显示区 */}
                                        <div className="relative group">
                                            <div className={`w-48 h-48 bg-white rounded-2xl p-2 flex items-center justify-center shadow-2xl overflow-hidden transition-all ${!qrImg ? 'animate-pulse' : ''}`}>
                                                {qrImg ? (
                                                    <img src={qrImg} alt="QR Code" className="w-full h-full object-contain" />
                                                ) : (
                                                    <div className="text-zinc-400 text-xs text-center px-4">
                                                        {qrStatus.includes('过期') ? '点击刷新' : '点击生成二维码'}
                                                    </div>
                                                )}
                                                
                                                {/* 覆盖层 */}
                                                {qrStatus.includes('过期') && (
                                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                                        <RefreshCw className="text-white w-8 h-8" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 状态文字 */}
                                        <p className={`text-sm font-mono font-bold ${qrStatus.includes('成功') ? 'text-green-400' : (qrStatus.includes('确认') ? 'text-blue-400' : 'text-zinc-400')}`}>
                                            {qrStatus || '准备就绪'}
                                        </p>

                                        {/* 操作按钮 */}
                                        <button 
                                            onClick={startQrLogin}
                                            className="px-8 py-3 bg-white text-black font-black rounded-xl hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-2"
                                        >
                                            <Activity size={18} />
                                            <span>{qrImg ? '刷新二维码' : '生成二维码'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* --- 交互设置模块 --- */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><Activity className="text-cyan-500" size={20}/> <span>交互控制</span></h3>
                        <div className="grid grid-cols-1 gap-4">
                            
                            {/* 1. 音量手势灵敏度 */}
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <span className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                                        音量灵敏度 (倍率)
                                        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">手势</span>
                                    </span>
                                    <p className="text-xs text-zinc-500">控制挥手调节音量的快慢。</p>
                                </div>
                                <div className="flex items-center space-x-3 bg-black/40 rounded-full p-1 border border-white/5">
                                    <button onClick={() => setSettings({...settings, gestureSensitivity: Math.max(0.5, (settings.gestureSensitivity || 2) - 0.5)})} className="w-8 h-8 rounded-full hover:bg-zinc-700 flex items-center justify-center transition-colors">-</button>
                                    <span className="font-mono text-cyan-400 w-12 text-center text-sm">{(settings.gestureSensitivity || 2).toFixed(1)}x</span>
                                    <button onClick={() => setSettings({...settings, gestureSensitivity: (settings.gestureSensitivity || 2) + 0.5})} className="w-8 h-8 rounded-full hover:bg-zinc-700 flex items-center justify-center transition-colors">+</button>
                                </div>
                            </div>

                            {/* 2. UI 翻页步进 */}
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <span className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                                        翻页步进 (次数)
                                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">UI</span>
                                    </span>
                                    <p className="text-xs text-zinc-500">每次切歌/滚动模拟按键的次数。</p>
                                </div>
                                <div className="flex items-center space-x-3 bg-black/40 rounded-full p-1 border border-white/5">
                                    <button onClick={() => setSettings({...settings, stepsPerSong: Math.max(1, settings.stepsPerSong - 1)})} className="w-8 h-8 rounded-full hover:bg-zinc-700 flex items-center justify-center transition-colors">-</button>
                                    <span className="font-mono text-purple-400 w-12 text-center text-sm">{settings.stepsPerSong}次</span>
                                    <button onClick={() => setSettings({...settings, stepsPerSong: settings.stepsPerSong + 1})} className="w-8 h-8 rounded-full hover:bg-zinc-700 flex items-center justify-center transition-colors">+</button>
                                </div>
                            </div>

                            {/* 方向反转 */}
                            <button onClick={() => setSettings({...settings, invertDirection: !settings.invertDirection})} className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${settings.invertDirection ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                                <span className={`text-sm font-medium ${settings.invertDirection ? 'text-cyan-100' : 'text-zinc-300'}`}>反转切歌方向</span>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${settings.invertDirection ? 'bg-cyan-500' : 'bg-zinc-700'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all transform ${settings.invertDirection ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </div>
                            </button>
                        </div>
                    </section>

                    <div className="flex justify-end pt-6 border-t border-white/10">
                        <button onClick={() => { storage.saveSettings(settings); alert("配置已更新！"); }} className="flex items-center space-x-2 bg-white text-black px-8 py-4 rounded-2xl font-black transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                            <Save size={20} />
                            <span>保存配置</span>
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Modal */}
        {showManualModal && (
             <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md space-y-4">
                    <h3 className="text-lg font-bold text-white">手动添加歌曲</h3>
                    <div className="space-y-3">
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="text-xs text-zinc-500 ml-1">网易云音乐 ID (必填)</label>
                                <input className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-white font-mono text-sm focus:border-blue-500 outline-none" placeholder="例如: 31245737" value={manualForm.id} onChange={e => setManualForm({...manualForm, id: e.target.value})}/>
                            </div>
                            <button className="h-[46px] px-3 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center gap-2 text-zinc-400" title="请直接刷卡或扫描 NFC 标签">
                                <Activity size={18} className="animate-pulse" />
                                <span className="text-xs font-bold">扫描</span>
                            </button>
                        </div>
                        <input className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-white text-sm" placeholder="歌曲标题" value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value})}/>
                        <input className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-white text-sm" placeholder="歌手" value={manualForm.artist} onChange={e => setManualForm({...manualForm, artist: e.target.value})}/>
                        <input className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-white text-sm" placeholder="封面图片 URL (可选)" value={manualForm.coverUrl} onChange={e => setManualForm({...manualForm, coverUrl: e.target.value})}/>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowManualModal(false)} className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors">取消</button>
                        <button onClick={handleManualSubmit} className="flex-1 py-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition-colors">确认添加</button>
                    </div>
                </div>
            </div>
        )}

        {/* Bind NFC Modal */}
        {bindModal.isOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-sm text-center space-y-6 shadow-2xl">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <Activity className="text-blue-500" size={40} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">请靠近 NFC 标签...</h3>
                        <p className="text-sm text-zinc-400">
                            正在为 <span className="text-white font-bold">
                                {songs.find(s => s.id === bindModal.songId)?.title}
                            </span> 写入数据并绑定
                        </p>
                        <p className="text-xs text-zinc-500 pt-2">
                            支持: 手机 NFC 写入 / 读卡器扫码
                        </p>
                    </div>
                    <button onClick={() => setBindModal({ isOpen: false, songId: null })} className="w-full py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors">取消</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};