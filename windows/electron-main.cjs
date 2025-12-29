const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
      webSecurity: false,
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
  }
}

app.whenReady().then(() => {
  // 移除 startBackend()，只启动窗口
  createWindow()

  // --- ⚡️ 内核级音量控制 (user32.dll) ⚡️ ---
  ipcMain.handle('adjust-volume', async (event, delta) => {
    // 1. 过滤抖动
    if (Math.abs(delta) < 0.1) return

    // 2. 确定方向
    // 0xAF = VK_VOLUME_UP (音量加)
    // 0xAE = VK_VOLUME_DOWN (音量减)
    const vkCode = delta > 0 ? '0xAF' : '0xAE'
    
    // 3. 计算按键次数
    let pressCount = Math.ceil(Math.abs(delta))
    if (pressCount > 5) pressCount = 5 

    // console.log(`内核级调用: 方向=${delta > 0 ? 'UP' : 'DOWN'}, 次数=${pressCount}`)

    // 4. 关键：不使用 SendKeys，而是直接定义 C# 类调用 user32.dll
    // 这种方式模拟的是物理硬件中断，绝对不会触发菜单栏！
    const psScript = `
      $source = @"
        using System;
        using System.Runtime.InteropServices;
        public class AudioCtrl {
            [DllImport("user32.dll")]
            public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);
            
            public static void Press(byte vk) {
                // 0 = KeyDown, 2 = KeyUp
                keybd_event(vk, 0, 0, 0); // 按下
                keybd_event(vk, 0, 2, 0); // 抬起
            }
        }
"@;
      Add-Type -TypeDefinition $source -Language CSharp;
      
      for($i=0; $i -lt ${pressCount}; $i++) { 
          [AudioCtrl]::Press(${vkCode}) 
      }
    `

    // 执行
    const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-command', psScript])
    
    child.on('error', (err) => {
      console.error(`❌ 调用失败: ${err.message}`)
    })
  })

  // 屏幕源获取
  ipcMain.handle('get-desktop-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen'] })
      return sources.map(s => ({ id: s.id, name: s.name }))
    } catch (error) {
      console.error('屏幕获取失败: ' + error.message)
      return []
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
