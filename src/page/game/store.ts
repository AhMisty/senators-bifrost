import type { PageReply } from '../../protocol/ack.ts'
import { isOwnAddress, linkUrl, selections, textContent } from '../../protocol/dom.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'
import { ErrorCode } from '../../types.ts'

export type StoreShop = {
  page: string
  name: string
}

export type StorePage = Observation & {
  kind: 'store'
  shops: StoreShop[]
}

export function readStore(page: Page): StorePage {
  page.one('#market')
  return {
    kind: 'store',
    ...observation(page),
    shops: selections(page.$('#market .market_element a[href]')).map((link) => {
      const target = linkUrl(page, link)
      const shop = target.searchParams.get('page')
      if (!shop || !isOwnAddress(page, target))
        throw new OperationError(ErrorCode.ParseError, 'Unexpected store destination')
      return { page: shop, name: textContent(link) }
    }),
  }
}

export function store(session: Session): Promise<Observed<PageReply<StorePage>>> {
  return routePage(session, GAME_ROUTES.store, {}, readStore)
}
