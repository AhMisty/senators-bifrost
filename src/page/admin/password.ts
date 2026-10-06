import type { PageReply } from '../../protocol/ack.ts'
import { requiredAttribute } from '../../protocol/dom.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

export type AdminPasswordPage = Observation & {
  kind: 'adminPassword'
  text: string

  /**
   * Server-generated password hash; omitting text hashes the empty string.
   *
   * 服务端生成的密码哈希；省略文本时计算空字符串的哈希。
   */
  hash: string
}

function echoedValue(page: Page, name: string): string {
  return requiredAttribute(page.one(`input[name="${name}"]`), 'value')
}

export function readAdminPassword(page: Page): AdminPasswordPage {
  return {
    kind: 'adminPassword',
    ...observation(page),
    text: echoedValue(page, 'md5q'),
    hash: echoedValue(page, 'md5w'),
  }
}

export function adminPassword(
  session: Session,
  options: { text?: string } = {},
): Promise<Observed<PageReply<AdminPasswordPage>>> {
  if (options.text === undefined)
    return routePage(session, ADMIN_ROUTES.password, {}, readAdminPassword)
  return routePage(
    session,
    ADMIN_ROUTES.password,
    {
      method: 'POST',
      body: { md5q: options.text },
    },
    readAdminPassword,
  )
}
