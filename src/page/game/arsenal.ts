import type { PageReply } from '../../protocol/ack.ts'
import { catalogue } from '../../protocol/catalogue.ts'
import type { GrowthEntry } from '../../protocol/catalogue.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

/**
 * Arsenal groups used by the New-Star page filters.
 *
 * New-Star 页面筛选器使用的军械分组。
 */
export const ARSENAL_CATEGORIES: Readonly<Record<number, 'fleet' | 'shield'>> = {
  2001: 'fleet',
  2002: 'fleet',
  2003: 'fleet',
  2005: 'fleet',
  2004: 'shield',
  2006: 'shield',
  2007: 'shield',
  2008: 'shield',
  2009: 'shield',
  2010: 'shield',
}

export type ArsenalEntry = GrowthEntry & {
  category: 'fleet' | 'shield' | null
}

/**
 * Read-only arsenal catalogue; this page exposes no purchase action.
 *
 * 只读军械目录；该页面不提供购买操作。
 */
export type ArsenalPage = Observation & {
  kind: 'arsenal'

  items: ArsenalEntry[]
}

function withCategory(item: GrowthEntry): ArsenalEntry {
  return { ...item, category: ARSENAL_CATEGORIES[item.elementId] ?? null }
}

export function readArsenal(page: Page): ArsenalPage {
  return {
    kind: 'arsenal',
    ...observation(page),

    items: catalogue(page, 'readonly', false).map(withCategory),
  }
}

export function arsenal(session: Session): Promise<Observed<PageReply<ArsenalPage>>> {
  return routePage(session, GAME_ROUTES.arsenal, {}, readArsenal)
}
