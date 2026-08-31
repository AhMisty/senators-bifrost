// 舰队流程解析：fleetStep1 响应中的 CSRF token（hidden input）
import type { HTMLElement } from 'node-html-parser'

// 提取舰队表单 token；缺失返回 null
export const parseFleetToken = (root: HTMLElement): string | null =>
  root.querySelector('input[name="token"]')?.getAttribute('value') ?? null
