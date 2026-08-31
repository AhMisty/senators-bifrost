// 抓取脚本：登录 ol.lstyxl.com 并把 4 个游戏页面保存到临时目录，供解析器选择器核对与回归使用。
// 页面包含账号名等账号数据，禁止入库——fixtures 只放系统临时目录（%TEMP%/bifrost-fixtures）。
// 凭据只从环境变量读取（BIFROST_USER / BIFROST_PASSWORD / BIFROST_UNIVERSE），禁止硬编码。
// 运行：NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx new-src/probe/capture.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Account } from '../account'

const BASE = 'https://ol.lstyxl.com'
const UNIVERSE = Number(process.env.BIFROST_UNIVERSE ?? '1')
const USER = process.env.BIFROST_USER
const PASSWORD = process.env.BIFROST_PASSWORD
if (!USER || !PASSWORD) {
  console.error('请先设置环境变量 BIFROST_USER 与 BIFROST_PASSWORD')
  process.exit(1)
}

const fixturesDir = join(tmpdir(), 'bifrost-fixtures')
mkdirSync(fixturesDir, { recursive: true })

const account = new Account({ base: BASE, universe: UNIVERSE, username: USER, password: PASSWORD })
const login = await account.login()
if (!login.ok) {
  console.error('登录失败:', login.reason, 'status:', login.response.status)
  process.exit(1)
}
console.log('登录成功, token:', login.token)

// 抓取页面：带会话 Cookie 直接 GET；页面过小视为被重定向到登录页，拒绝保存
const save = async (path: string, filename: string, minSize = 20000) => {
  const response = await fetch(new URL(path, BASE), {
    headers: { Cookie: `${account.cookieName}=${login.token};` },
  })
  const text = await response.text()
  if (text.length < minSize) {
    console.error(`页面过小（疑似登录重定向页），放弃保存: ${path} (${text.length} bytes)`)
    process.exit(1)
  }
  writeFileSync(join(fixturesDir, filename), text)
  console.log(`已保存 ${filename}: ${text.length} bytes`)
}

await save('/game.php?page=control', 'control.html')
await save('/game.php?page=research', 'research.html')

// 从 control 页提取第一个星球 id，用于 buildings/shipyard 的 cp 参数
const control = await (
  await fetch(new URL('/game.php?page=control', BASE), {
    headers: { Cookie: `${account.cookieName}=${login.token};` },
  })
).text()
const cp = control.match(/cp=(\d+)/)?.[1]
if (!cp) {
  console.error('未能从 control 页提取星球 id')
  process.exit(1)
}
console.log('星球 id:', cp)
await save(`/game.php?page=buildings&cp=${cp}`, 'buildings.html')
await save(`/game.php?page=shipyard&cp=${cp}`, 'shipyard.html')
