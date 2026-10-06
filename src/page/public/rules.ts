import type { PageReply } from '../../protocol/ack.ts'
import { contentText, requiredText } from '../../protocol/dom.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import type { PublicPageOptions } from '../../protocol/public-options.ts'
import { publicPageQuery } from '../../protocol/public-options.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { PUBLIC_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

export type PublicRulesPage = Observation & {
  kind: 'publicRules'
  rules: string
}

export function readPublicRules(page: Page): PublicRulesPage {
  const rules = page.one('.card-body #rules')
  requiredText(rules, 'rules')
  return {
    kind: 'publicRules',
    ...observation(page),
    rules: contentText(rules),
  }
}

export function publicRules(
  session: Session,
  options: PublicPageOptions = {},
): Promise<Observed<PageReply<PublicRulesPage>>> {
  return routePage(
    session,
    PUBLIC_ROUTES.rules,
    { query: publicPageQuery(options) },
    readPublicRules,
  )
}
