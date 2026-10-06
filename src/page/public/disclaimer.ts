import type { PageReply } from '../../protocol/ack.ts'
import { contentText } from '../../protocol/dom.ts'
import type { Selection } from '../../protocol/dom.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import type { PublicPageOptions } from '../../protocol/public-options.ts'
import { publicPageQuery } from '../../protocol/public-options.ts'
import { routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed } from '../../protocol/result.ts'
import { PUBLIC_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type { Observation } from '../../types.ts'

/**
 * Operator contact information retaining line and paragraph boundaries in each field.
 *
 * 运营者联系信息；各字段保留正文的换行与段落边界。
 */
export type PublicDisclaimerPage = Observation & {
  kind: 'publicDisclaimer'
  address: string
  phone: string
  mail: string
  notice: string
}

function blockValue(block: Selection): string {
  const copy = block.clone()
  copy.children('strong').first().remove()
  return contentText(copy)
}

export function readPublicDisclaimer(page: Page): PublicDisclaimerPage {
  const blocks = page.$('.card-body address')
  if (blocks.length !== 4)
    throw new OperationError(ErrorCode.ParseError, 'Missing disclaimer blocks')

  return {
    kind: 'publicDisclaimer',
    ...observation(page),
    address: blockValue(blocks.eq(0)),
    phone: blockValue(blocks.eq(1)),
    mail: blockValue(blocks.eq(2)),
    notice: blockValue(blocks.eq(3)),
  }
}

export function publicDisclaimer(
  session: Session,
  options: PublicPageOptions = {},
): Promise<Observed<PageReply<PublicDisclaimerPage>>> {
  return routePage(
    session,
    PUBLIC_ROUTES.disclaimer,
    { query: publicPageQuery(options) },
    readPublicDisclaimer,
  )
}
