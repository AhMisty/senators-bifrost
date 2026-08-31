// 真实服务器读取测试：登录 ol.lstyxl.com 后跑 4 个状态方法并打印摘要（只读，不发送任何动作）。
// 若临时目录存在同日抓取的 fixtures（%TEMP%/bifrost-fixtures），一并解析对照，验证解析器对真实页面的兼容性。
// 凭据只从环境变量读取（BIFROST_USER / BIFROST_PASSWORD / BIFROST_UNIVERSE）。
// 运行：NODE_TLS_REJECT_UNAUTHORIZED=0 BIFROST_USER=... BIFROST_PASSWORD=... npx tsx new-src/probe/live.ts
import { readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GameClient } from '../session'
import { parseControl } from '../parser/control'
import { parseResearch } from '../parser/research'
import { parseBuildings } from '../parser/buildings'
import { parseShipyard } from '../parser/shipyard'

const BASE = 'https://ol.lstyxl.com'
const UNIVERSE = Number(process.env.BIFROST_UNIVERSE ?? '1')
const USER = process.env.BIFROST_USER
const PASSWORD = process.env.BIFROST_PASSWORD
if (!USER || !PASSWORD) {
  console.error('请先设置环境变量 BIFROST_USER 与 BIFROST_PASSWORD')
  process.exit(1)
}

// fixtures 对照解析：存在则解析并打印，供与实时数据人工比对
const fixture = (name: string) => {
  const path = join(tmpdir(), 'bifrost-fixtures', name)
  if (!existsSync(path)) return null
  return readFileSync(path, 'utf8')
}

const game = new GameClient({ base: BASE, universe: UNIVERSE, username: USER, password: PASSWORD })
const login = await game.login()
if (!login.ok) {
  console.error('登录失败:', login.reason, 'status:', login.response.status)
  process.exit(1)
}
console.log('登录成功, token:', login.token)

const control = await game.getControl()
console.log(
  'control 实时:',
  JSON.stringify({
    playerId: control.playerId,
    resources: control.resources,
    planets: control.planets.map((p) => ({
      id: p.id,
      type: p.type,
      name: p.name,
      coordinate: p.coordinate,
      used: p.used,
      size: p.size,
      elementCount: p.elements.size,
    })),
    elementCount: control.elements.size,
  }),
)
const controlFixture = fixture('control.html')
if (controlFixture) {
  const f = parseControl(controlFixture)
  console.log(
    'control fixtures:',
    JSON.stringify({
      playerId: f.playerId,
      resources: f.resources,
      planets: f.planets.map((p) => ({
        id: p.id,
        type: p.type,
        name: p.name,
        coordinate: p.coordinate,
        used: p.used,
        size: p.size,
        elementCount: p.elements.size,
      })),
      elementCount: f.elements.size,
    }),
  )
}

const research = await game.getResearch()
console.log(
  'research 实时:',
  JSON.stringify({ levels: [...research.levels.entries()].slice(0, 8), queue: research.queue }),
)
const researchFixture = fixture('research.html')
if (researchFixture) {
  const f = parseResearch(researchFixture)
  console.log(
    'research fixtures:',
    JSON.stringify({ levels: [...f.levels.entries()].slice(0, 8), queue: f.queue }),
  )
}

const firstPlanet = control.planets[0]
if (!firstPlanet) throw new Error('账号无星球')
const buildings = await game.getBuildings(firstPlanet.id)
console.log(
  'buildings 实时:',
  JSON.stringify({
    energy: buildings.energy,
    limits: buildings.limits,
    queue: buildings.queue,
    levels: [...buildings.levels.entries()].slice(0, 8),
  }),
)
const buildingsFixture = fixture('buildings.html')
if (buildingsFixture) {
  const f = parseBuildings(buildingsFixture)
  console.log(
    'buildings fixtures:',
    JSON.stringify({
      energy: f.energy,
      limits: f.limits,
      queue: f.queue,
      levels: [...f.levels.entries()].slice(0, 8),
    }),
  )
}

const shipyard = await game.getShipyard(firstPlanet.id)
console.log(
  'shipyard 实时:',
  JSON.stringify({
    energy: shipyard.energy,
    limits: shipyard.limits,
    queue: shipyard.queue,
    available: [...shipyard.available.entries()].slice(0, 8),
  }),
)
const shipyardFixture = fixture('shipyard.html')
if (shipyardFixture) {
  const f = parseShipyard(shipyardFixture)
  console.log(
    'shipyard fixtures:',
    JSON.stringify({
      energy: f.energy,
      limits: f.limits,
      queue: f.queue,
      available: [...f.available.entries()].slice(0, 8),
    }),
  )
}
