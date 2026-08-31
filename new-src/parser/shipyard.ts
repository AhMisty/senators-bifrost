// 船坞页解析：能源、存储上限、生产队列、已拥有数量（DatatList 的 available 字段）
import { parse } from 'node-html-parser'
import type { ShipyardData } from '../types'
import { parseDatatList, parseEnergy, parseLimits, parseQueue } from './common'

export const parseShipyard = (html: string): ShipyardData => {
  const root = parse(html)
  return {
    energy: parseEnergy(root),
    limits: parseLimits(root),
    queue: parseQueue(root),
    available: parseDatatList(root, 'available'),
  }
}
