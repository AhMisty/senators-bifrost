// 动作响应判定：#ally_contents 块承载错误/提示信息，各动作的成功规则不同
import type { HTMLElement } from 'node-html-parser'
import type { ActionResult } from '../types'

// 获取 ally 提示块文本；块不存在返回 null
export const extractAllyContents = (root: HTMLElement): string | null => {
  const block = root.querySelector('#ally_contents')
  return block ? block.textContent.trim() : null
}

// 建造类动作（建筑/科研/船坞）成功判定：页面无 ally 块（或块为空文本）即成功
export const checkBuildAction = (root: HTMLElement): ActionResult => {
  const ally = extractAllyContents(root)
  return ally ? { ok: false, error: ally } : { ok: true }
}

// 舰队步骤 2/3 成功判定：与建造相反，ally 块缺失即成功（有块说明被服务器拒绝）
export const checkFleetStep = (root: HTMLElement): ActionResult => {
  const ally = extractAllyContents(root)
  return ally ? { ok: false, error: ally } : { ok: true }
}

// 导弹成功判定：ally 块存在且含 <b> 元素才成功（旧实现对 <b> 的字符串判断在 DOM 下等价为后代元素查询）
export const checkMissle = (root: HTMLElement): ActionResult => {
  const block = root.querySelector('#ally_contents')
  if (!block) return { ok: false, error: '页面缺少 ally_contents 提示块（结构异常）' }
  return block.querySelector('b') ? { ok: true } : { ok: false, error: block.textContent.trim() }
}
