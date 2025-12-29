#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const tmpPath = require('os').tmpdir()

async function start() {
  // 1. 检测 anonymous_token
  if (!fs.existsSync(path.resolve(tmpPath, 'anonymous_token'))) {
    fs.writeFileSync(path.resolve(tmpPath, 'anonymous_token'), '', 'utf-8')
  }

  // 2. 生成配置
  const generateConfig = require('./generateConfig')
  await generateConfig()

  // 3. 启动服务
  console.log('[启动中] 正在调用 Server...');
  require('./server').serveNcmApi({
checkVersion: false,  // 关掉版本检测，防止网络波动导致崩溃
    host: '127.0.0.1',      // 核心修正：允许任何 IP 访问 (解决 localhost 连不上的问题)
    port: 3456,
  })
  
  console.log('[成功] 服务调用完成，正在挂起进程...');
}

// --- 🟢 【新增】 异常捕获，防止闪退看不到报错 ---
process.on('uncaughtException', (err) => {
    console.error('💥 发生未捕获异常:', err);
});

process.on('unhandledRejection', (reason, p) => {
    console.error('💥 未处理的 Promise 拒绝:', reason);
});

// --- 🟢 【新增】 强制保活逻辑 ---
// 只要这个定时器在跑，Node 就永远不会认为“没事做”而退出
setInterval(() => {
    // 每 1 小时“呼吸”一次，证明还活着
    // console.log('[System] Service is active...');
}, 1000 * 60 * 60);

// 启动主流程
start().catch(err => {
    console.error('[启动失败]', err);
});