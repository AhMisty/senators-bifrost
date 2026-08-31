// 科研页解析：科研队列与科技等级（DatatList 的 level 字段）
import { parse } from 'node-html-parser'
import type { ResearchData } from '../types'
import { parseDatatList, parseQueue } from './common'

export const parseResearch = (html: string): ResearchData => {
  const root = parse(html)
  return {
    queue: parseQueue(root),
    levels: parseDatatList(root, 'level'),
  }
}
