import type { Session } from '../session.ts'
import type { ElementMap, PlanetObservation, PlanetReference } from '../types.ts'
import type { Ack } from './ack.ts'
import { LITERAL_LEVEL_MODULES, catalogue } from './catalogue.ts'
import type { GrowthEntry, GrowthKind, GrowthModule } from './catalogue.ts'
import { headerBalances } from './context.ts'
import { planetObservation } from './page.ts'
import type { Page } from './page.ts'
import { routeAck } from './request.ts'
import type { Observed, PlanetData } from './result.ts'
import { GROWTH_MODULES } from './routes.ts'
import type { PageRoute } from './routes.ts'

/**
 * Growth catalogue and observed stocks; selectedElementId is null when unreported.
 *
 * 成长目录及响应中的库存；未标明选中项时 selectedElementId 为 null。
 */
export type GrowthDocument<K extends GrowthModule> = PlanetObservation & {
  kind: K

  controlKind: GrowthKind

  selectedElementId: number | null
  items: GrowthEntry[]

  resources: ElementMap
}

function growthItems(page: Page, module: GrowthModule): GrowthEntry[] {
  const kind = GROWTH_MODULES[module].kind
  const items = catalogue(page, kind, LITERAL_LEVEL_MODULES.has(module), module === 'ideologies')
  if (kind !== 'choice') return items
  const name = page.$('.gray_flettab > strong').text().trim()
  const selected = name ? items.filter((item) => item.name === name) : []
  const [only] = selected
  const element = selected.length === 1 ? only!.elementId : null
  for (const item of items) item.isSelected = element === null ? null : item.elementId === element
  return items
}

/**
 * Read the catalogue and control behavior of a growth module.
 *
 * 按指定成长模块读取目录和控件行为。
 */
export function readGrowth<K extends GrowthModule>(page: Page, module: K): GrowthDocument<K> {
  const items = growthItems(page, module)
  return {
    kind: module,
    controlKind: GROWTH_MODULES[module].kind,
    ...planetObservation(page),
    selectedElementId: items.find((item) => item.isSelected)?.elementId ?? null,
    items,
    resources: headerBalances(page),
  }
}

/**
 * Submit a purchase quantity for one growth entry.
 *
 * 提交一个成长条目的购买数量。
 */
export function upgradeGrowth(
  session: Session,
  route: PageRoute,
  options: PlanetReference & { elementId: number; amount?: number },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, route, {
    planetId: options.planetId,
    method: 'POST',
    body: {
      id: options.elementId,
      ...(options.amount === undefined ? {} : { amount: options.amount }),
    },
  })
}
