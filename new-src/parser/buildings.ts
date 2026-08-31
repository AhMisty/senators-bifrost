// 建筑页解析：能源、存储上限、建造队列、建筑等级（DatatList 的 level 字段）
import { parse } from 'node-html-parser'
import type { BuildingsData } from '../types'
import { parseDatatList, parseEnergy, parseLimits, parseQueue } from './common'

export const parseBuildings = (html: string): BuildingsData => {
  const root = parse(html)
  return {
    energy: parseEnergy(root),
    limits: parseLimits(root),
    queue: parseQueue(root),
    levels: parseDatatList(root, 'level'),
  }
}
