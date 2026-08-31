// 动作响应判定：#ally_contents 块承载错误/提示信息，各动作的成功规则不同
import type { HTMLElement } from 'node-html-parser'
import type { ActionResult } from '../types'

// 获取 ally 提示块文本；块不存在返回 null
export const extractAllyContents = (root: HTMLElement): string | null => {
  const block = root.querySelector('#ally_contents')
  return block ? block.textContent.trim() : null
}

// 建造类动作（建筑/科研/船坞）与舰队 step2/3 的成功判定相同：出现 ally 块即被服务器拒绝（块文本即错误信息）
export const checkAllyError = (root: HTMLElement): ActionResult => {
  const ally = extractAllyContents(root)
  return ally ? { ok: false, error: ally } : { ok: true }
}

// 导弹成功判定：与建造相反，ally 块存在且含 <b> 元素才成功
export const checkMissle = (root: HTMLElement): ActionResult => {
  const block = root.querySelector('#ally_contents')
  if (!block) return { ok: false, error: '页面缺少 ally_contents 提示块（结构异常）' }
  return block.querySelector('b') ? { ok: true } : { ok: false, error: block.textContent.trim() }
}
