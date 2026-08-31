// 结构核对脚本：对抓取的 fixtures 逐项转储旧标记对应 DOM 结构的真实形态，核实解析器选择器。
// 运行：npx tsx new-src/probe/inspect.ts
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse } from 'node-html-parser'

// 抓取脚本把页面存到系统临时目录（页面含账号数据，禁止入库）
const fixturesDir = join(tmpdir(), 'bifrost-fixtures')
const read = (name: string) => readFileSync(join(fixturesDir, name), 'utf8')

const count = (text: string, key: string) => text.split(key).length - 1
const ctx = (text: string, key: string, width = 120) => {
  const i = text.indexOf(key)
  return i === -1
    ? '(未找到)'
    : text
        .slice(Math.max(0, i - 60), i + width)
        .replaceAll('\n', '\\n')
        .replaceAll('\t', '\\t')
}

const header = (name: string, text: string) => {
  console.log(`\n=== ${name} (${text.length} bytes) ===`)
}

// ---------- control ----------
{
  const text = read('control.html')
  header('control.html', text)
  console.log(
    'Playercard 出现次数:',
    count(text, 'Playercard('),
    '| 上下文:',
    ctx(text, 'Playercard('),
  )
  console.log('gebaeude/ 出现次数:', count(text, 'gebaeude/'))
  console.log('darkmatter 上下文:', ctx(text, 'darkmatter'))
  console.log('antimatter 上下文:', ctx(text, 'antimatter'))
  console.log('stardust 上下文:', ctx(text, 'stardust'))
  console.log('container 上下文:', ctx(text, 'container'))
  console.log('"sigma" 上下文:', ctx(text, '"sigma"'))
  console.log('ally_content 出现次数:', count(text, 'ally_content'))

  const root = parse(text)
  const imperRows = root.querySelectorAll('[imper_f],[imper_moon]')
  console.log('[imper_f]/[imper_moon] 行数:', imperRows.length)
  if (imperRows[0]) console.log('首行 HTML 样例:', imperRows[0].outerHTML.slice(0, 600))
  const sigma = root.querySelector('#sigma')
  console.log(
    '#sigma 存在:',
    sigma !== null,
    '| td.block_td 数量:',
    sigma?.querySelectorAll('td.block_td').length,
  )
  const icons = root.querySelectorAll('img[src*="gebaeude/"]')
  console.log('gebaeude 图标数量:', icons.length)
  if (icons[0]) console.log('首个图标 src:', icons[0].getAttribute('src'))
  for (const id of ['darkmatter', 'antimatter', 'stardust', 'container']) {
    const el = root.querySelector(`[id="${id}"]`)
    console.log(
      `#${id}: 存在=${el !== null}`,
      el ? `name 属性=${el.getAttribute('name')} tag=${el.tagName}` : '',
    )
  }
}

// ---------- research ----------
{
  const text = read('research.html')
  header('research.html', text)
  console.log(
    'DatatList 出现次数:',
    count(text, 'DatatList'),
    '| 上下文:',
    ctx(text, 'DatatList', 200),
  )
  console.log('build_process 出现次数:', count(text, 'build_process'))
  const root = parse(text)
  const bp = root.querySelector('#build_process')
  console.log('#build_process 存在:', bp !== null)
  if (bp) {
    console.log('  内部 gebaeude 图标数:', bp.querySelectorAll('img[src*="gebaeude/"]').length)
    console.log('  内部 onlistremov 数:', bp.querySelectorAll('a[class*="onlistremov"]').length)
    const a = bp.querySelector('a[class*="onlistremov"]')
    if (a) console.log('  队列项样例:', a.outerHTML.slice(0, 200))
  }
}

// ---------- buildings ----------
{
  const text = read('buildings.html')
  header('buildings.html', text)
  const root = parse(text)
  const energy = root.querySelector('#current_energy')
  console.log(
    '#current_energy: 存在=',
    energy !== null,
    energy ? `name=${energy.getAttribute('name')}` : '',
  )
  console.log('resourceTicker 上下文:', ctx(text, 'resourceTicker', 160))
  const limits = [...text.matchAll(/limit:\s*\[\s*0\s*,\s*"(\d+)"\s*\]/g)]
    .slice(0, 3)
    .map((m) => m[1])
  console.log('limit 匹配(前3):', limits)
  const blocks = root.querySelectorAll('.btn_build_border')
  console.log('.btn_build_border 块数:', blocks.length)
  if (blocks[0]) {
    const inputs = blocks[0].querySelectorAll('input[type="hidden"]')
    console.log(
      '首块 hidden input 数:',
      inputs.length,
      '| values:',
      inputs.map((i) => i.getAttribute('value')).slice(0, 5),
    )
  }
  const bp = root.querySelector('#build_process')
  console.log('#build_process 存在:', bp !== null)
  if (bp) {
    const icons = bp.querySelectorAll('img[src*="gebaeude/"]')
    const removes = bp.querySelectorAll('a[class*="onlistremov"]')
    console.log('  队列项: gebaeude 图标数=', icons.length, 'onlistremov 数=', removes.length)
    if (removes[0]) console.log('  队列移除锚文本:', JSON.stringify(removes[0].textContent.trim()))
  }
}

// ---------- shipyard ----------
{
  const text = read('shipyard.html')
  header('shipyard.html', text)
  console.log('"Queue": 上下文:', ctx(text, '"Queue":', 260))
  const q = text.match(/"Queue":(\[\[[\s\S]*?\]\])/)
  console.log('Queue JSON 匹配:', q ? q[1].slice(0, 200) : '(未找到)')
  const root = parse(text)
  const bp = root.querySelector('#build_process')
  console.log('#build_process 存在:', bp !== null)
  if (bp) {
    console.log('  队列项: gebaeude 图标数=', bp.querySelectorAll('img[src*="gebaeude/"]').length)
  }
}

console.log('\n=== 完成 ===')
