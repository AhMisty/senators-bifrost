// 冒烟测试：注入 mock fetch + 与真实页面（ol.lstyxl.com 的 New-Star 主题）结构等价的合成 HTML，
// 无网络验证 Account 全流程：登录、状态读取、会话过期自动重登重试、全部动作协议与成功/失败判定。
// 运行：npx tsx new-src/probe/smoke.ts
import { Account } from '../account'
import type { Fetch } from '../client'
import { FleetMission, FleetSpeed, FleetStaytime } from '../fleet'

let passed = 0
const ok = (name: string, cond: boolean, extra = '') => {
  if (!cond) throw new Error(`FAIL: ${name} ${extra}`)
  passed++
  console.log(`PASS: ${name}`)
}

// ---------- 合成页面（结构对齐真实捕获页） ----------

// 161 个 gebaeude 图标序列：前 12 个对齐真实主题（901-916 资源区 + 9/10/11 槽的 901/902/903 每小时产量图标），后 149 个为 1-149
const iconSequence = [
  901,
  902,
  903,
  911,
  912,
  913,
  914,
  915,
  916,
  901,
  902,
  903,
  ...Array.from({ length: 149 }, (_, i) => i + 1),
]
const iconsHtml = () =>
  iconSequence.map((id) => `<img src="./styles/theme/nsc/gebaeude/${id}.gif">`).join('')
const cellsHtml = (values: number[]) =>
  values.map((v) => `<div class="imper_block_td">${v}</div>`).join('')
const totalValues = Array.from({ length: 161 }, (_, i) => i + 1)
const planetValues = Array.from({ length: 161 }, (_, i) => (i + 1) * 10)

const controlHtml = `<!DOCTYPE html><html><head><title>全局面板</title></head><body><div id="content">
  ${iconsHtml()}
  <div class="imper_block_vertical">
    <div class="imper_block_image" style="background-image:url(./styles/theme/nsc/planeten/small/s_wasserplanet08.jpg);">
      <div class="imper_block_info_text"><a href="game.php?page=overview&amp;cp=15492">母星</a></div>
      <div class="imper_block_info_text"><a href="game.php?page=galaxy&amp;galaxy=3&amp;system=11">[3:11:10]</a></div>
      <div class="imper_block_info_text">5 / 163</div>
      <a class="ico_rows_planet imper_go_planet" href="game.php?page=overview&amp;cp=15492"></a>
    </div>
    <div class="imper_block_th"></div>
    ${cellsHtml(planetValues)}
  </div>
  <div class="imper_block_vertical" id="sigma">
    <div class="imper_block_image"><div class="gradient_block_image">Σ</div><div class="imper_block_info_text">数量</div></div>
    <div class="imper_block_th"></div>
    ${cellsHtml(totalValues)}
  </div>
  <span onclick="return Dialog.Playercard(773, 'AhMisty');"></span>
  <div id="res_block_darkmatter"><span class='colore921' id="current_darkmatter" name="1.152" data-real="1152">1,2&nbsp;K</span></div>
  <span id="current_antimatter" name="66"></span>
  <span id="current_stardust" name="7"></span>
  <!-- data-real 与 name 语义不同（3.9 vs 3）：断言锁定读精准值 data-real -->
  <span id="current_container" name="3" data-real="3.9"></span>
</div></body></html>`

// research：DatatList 含尾随逗号（验证清洗逻辑）；队列含 1 项；有进度条
const researchHtml = `<!DOCTYPE html><html><head></head><body><div id="content">
  <script type="text/javascript">DatatList\t\t= { "106":{ "id":"106","elvl":"0 ","level":"6","maxLevel":"255", }, "108":{ "id":"108","level":"1" }, "109":{ "level":"0" } };</script>
  <div id="fildes_band"><div id="fildes_band_proc" style="width:50.5%;"></div></div>
  <div id="build_process"><div class="item"><img src="./styles/theme/nsc/gebaeude/106.gif"><a class="onlistremov ">7</a></div></div>
</div></body></html>`

const buildingsHtml = `<!DOCTYPE html><html><head></head><body><div id="content">
  <!-- name 属性是模板产物 2×产能+消耗（-48），文本才是净能源（-24）；断言锁定读文本 -->
  <div id="current_energy" name="-48" data-real="-48">-24</div>
  <script type="text/javascript">
    resourceTicker({ available: "219498818.027778", limit: [0, "54000"], production: 0 });
    resourceTicker({ available: "299116062", limit: [0, "55000"], production: 0 });
    resourceTicker({ available: "313683943", limit: [0, "56000"], production: 0 });
    DatatList\t\t= { "1":{ "level":"2", "maxLevel":"255", }, "2":{ "level":"4" } };
  </script>
  <div id="fildes_band"><div id="fildes_band_proc" style="width:3.0674846625767%;"></div></div>
  <div id="build_process"></div>
</div></body></html>`

const shipyardHtml = `<!DOCTYPE html><html><head></head><body><div id="content">
  <!-- 文本为 shortly_number 缩写格式（1,2 K = 1200），验证 parseShortNumber -->
  <div id="current_energy" name="246" data-real="246">1,2 K</div>
  <script type="text/javascript">
    resourceTicker({ available: "10", limit: [0, "54000"], production: 0 });
    resourceTicker({ available: "10", limit: [0, "55000"], production: 0 });
    resourceTicker({ available: "10", limit: [0, "56000"], production: 0 });
    DatatList\t\t= { "210":{ "id":"210","available":"0" }, "212":{ "id":"212","available":"5" } };
  </script>
  <div id="fildes_band"></div>
</div></body></html>`

// 动作响应页
const page = (body: string) => `<!DOCTYPE html><html><head></head><body>${body}</body></html>`
const buildSuccessHtml = page('<div id="content"><div id="build_elements"></div></div>')
const buildFailHtml = page('<div id="ally_contents">资源不足，无法建造</div>')
const fleetStep1Html = page('<form><input type="hidden" name="token" value="csrf123"></form>')
const fleetStepOkHtml = page('<div id="content"></div>')
const missileOkHtml = page('<div id="ally_contents"><b>导弹已发射</b></div>')

// ---------- mock fetch（记录 URL 与 POST body） ----------
const calls: string[] = []
const postBodies: string[] = []
let loginCount = 0
let researchRequests = 0

const html = (body: string) =>
  new Response(body, { status: 200, headers: { 'Content-Type': 'text/html' } })

const mockFetch: Fetch = async (input, init) => {
  const url = String(input)
  const method = (init?.method ?? 'GET').toUpperCase()
  calls.push(`${method} ${url}`)
  if (method === 'POST') postBodies.push(String(init?.body ?? ''))
  if (url.endsWith('page=login')) {
    loginCount++
    return new Response(null, {
      status: 302,
      headers: { 'Set-Cookie': `2Moons=tok${loginCount}; path=/` },
    })
  }
  if (url.includes('page=control')) return html(controlHtml)
  if (url.includes('page=research') && method === 'GET') {
    // 会话过期重登场景：首次 GET 返回 302 指向登录页，重试后返回正常页
    if (researchRequests === 0) {
      researchRequests++
      return new Response(null, { status: 302, headers: { Location: '/index.php?page=login' } })
    }
    return html(researchHtml)
  }
  if (url.includes('page=research') && method === 'POST') {
    // buildResearch 用于验证失败路径；cancelResearch 走成功路径
    return String(init?.body ?? '').includes('cmd=cancel')
      ? html(buildSuccessHtml)
      : html(buildFailHtml)
  }
  if (url.includes('page=buildings') && method === 'GET') return html(buildingsHtml)
  if (url.includes('page=buildings') && method === 'POST') return html(buildSuccessHtml)
  if (url.includes('page=shipyard') && method === 'GET') return html(shipyardHtml)
  if (url.includes('page=shipyard') && method === 'POST') return html(buildSuccessHtml)
  if (url.includes('page=fleetStep1')) return html(fleetStep1Html)
  if (url.includes('page=fleetStep2')) return html(fleetStepOkHtml)
  if (url.includes('page=fleetStep3')) return html(fleetStepOkHtml)
  if (url.includes('page=fleetMissile')) return html(missileOkHtml)
  if (url.includes('page=logout')) return html('<html></html>')
  throw new Error(`mock fetch 未覆盖的 URL: ${method} ${url}`)
}

// ---------- 测试 ----------
// fetch 是传输层唯一注入点，直接平铺在 AccountOptions 上
const game = new Account({
  base: 'https://ol.lstyxl.com',
  universe: 1,
  username: 'user',
  password: 'pass',
  fetch: mockFetch,
})

// 登录
const login = await game.login()
ok('登录成功', login.ok === true && login.token === 'tok1')
ok('token 已写入', game.token === 'tok1')

// control 解析
const control = await game.getControl()
ok('玩家 id', control.playerId === 773)
ok(
  '特殊资源(读 data-real 精准值)',
  control.resources.darkmatter === 1152 &&
    control.resources.antimatter === 66 &&
    control.resources.stardust === 7 &&
    control.resources.container === 4,
)
ok('元素映射(158 真实元素)', control.elements.size === 158 && control.elements.get(901) === 1 && !control.elements.has(931))
ok(
  '每小时产量已命名化(production)',
  control.production.metal === 10 && control.production.crystal === 11 && control.production.deuterium === 12,
)
ok(
  '星球信息',
  control.planets.length === 1 &&
    control.planets[0].id === 15492 &&
    control.planets[0].name === '母星' &&
    control.planets[0].type === 'planet',
)
ok(
  '星球坐标与面积',
  control.planets[0].coordinate.galaxy === 3 &&
    control.planets[0].coordinate.system === 11 &&
    control.planets[0].coordinate.position === 10 &&
    control.planets[0].used === 5 &&
    control.planets[0].size === 163,
)
ok(
  '星球元素映射与产量',
  control.planets[0].elements.size === 158 &&
    control.planets[0].elements.get(1) === 130 &&
    control.planets[0].production.metal === 100,
)

// research：首次请求触发 302 → 自动重登 → 重试
const research = await game.getResearch()
ok('自动重登后 token 更新', game.token === 'tok2')
ok(
  'research 重试恰好一次',
  calls.filter((c) => c === 'GET https://ol.lstyxl.com/game.php?page=research').length === 2,
)
ok(
  '科研等级(DatatList)',
  research.levels.get(106) === 6 &&
    research.levels.get(108) === 1 &&
    research.levels.get(109) === 0,
)
ok(
  '科研队列项与进度',
  research.queue.items.length === 1 &&
    research.queue.items[0].element === 106 &&
    research.queue.items[0].count === 7 &&
    research.queue.progress === 50.5,
)

// buildings / shipyard 解析
const buildings = await game.getBuildings(15492)
ok(
  '建筑等级与能源',
  buildings.levels.get(1) === 2 && buildings.levels.get(2) === 4 && buildings.energy === -24,
)
ok(
  '存储上限三资源',
  buildings.limits.metal === 54000 &&
    buildings.limits.crystal === 55000 &&
    buildings.limits.deuterium === 56000,
)
ok(
  '建筑队列(空)与进度',
  buildings.queue.items.length === 0 && Math.abs(buildings.queue.progress - 3.067) < 0.001,
)
const shipyard = await game.getShipyard(15492)
ok(
  '船坞数量与能源(缩写格式)',
  shipyard.available.get(210) === 0 && shipyard.available.get(212) === 5 && shipyard.energy === 1200,
)

// 动作：建造成功 / 科研失败（ally 错误块）
const build = await game.buildBuilding({ planetId: 15492, element: 1, count: 1 })
ok('建造成功判定', build.ok === true)
ok(
  '建造请求体字段',
  postBodies.some((b) => b === 'cmd=insert&building=1&lvlup=1'),
)
const researchAction = await game.buildResearch({ planetId: 15492, element: 106, count: 1 })
ok(
  '科研失败判定(ally 错误块)',
  researchAction.ok === false && researchAction.error === '资源不足，无法建造',
)
ok(
  '科研请求体字段 tech',
  postBodies.some((b) => b === 'cmd=insert&tech=106&lvlup=1'),
)
const cancel = await game.cancelResearch({ planetId: 15492 })
ok('取消科研成功', cancel.ok === true)
ok(
  '取消科研请求体',
  postBodies.some((b) => b === 'cmd=cancel'),
)

// 船坞：请求体为中括号转义后的原始串
const shipyardAction = await game.buildShipyard({ planetId: 15492, elements: new Map([[212, 5]]) })
ok('船坞生产成功', shipyardAction.ok === true)
ok(
  '船坞请求体 fmenge 转义',
  postBodies.some((b) => b === 'fmenge%5B212%5D=5'),
)

// 舰队三步：step1 取 token，step2/3 提交；step1 请求体为 ship<id>=<count>
const fleet = await game.sendFleet({
  origin: 15492,
  target: { galaxy: 3, system: 11, planet: 10, type: 1 },
  mission: FleetMission.Transport,
  speed: FleetSpeed.Ten,
  staytime: FleetStaytime.One,
  metal: 100,
  crystal: 200,
  deuterium: 50,
  ships: new Map([[202, 3]]),
})
ok('舰队三步成功', fleet.ok === true)
ok(
  '舰队 step1 请求体',
  postBodies.some((b) => b === 'ship202=3'),
)
ok(
  '舰队 step2/3 请求体含 token',
  postBodies.some((b) => b.includes('token=csrf123') && b.includes('mission=3')),
)

// 导弹：ally 块含 <b> 成功
const missle = await game.sendMissle({
  origin: 15492,
  target: { galaxy: 3, system: 11, planet: 10, type: 1 },
  count: 1,
  firstTarget: 2,
})
ok('导弹成功判定', missle.ok === true)
ok(
  '导弹请求体',
  postBodies.some((b) => b === 'galaxy=3&system=11&planet=10&type=1&SendMI=1&Target=2'),
)

// 登出
await game.logout()
ok('登出后 token 清空', game.token === '')

console.log(`\nALL ${passed} CHECKS PASSED`)
process.exit(0)
