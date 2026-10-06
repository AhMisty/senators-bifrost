import type { PageReply } from '../../protocol/ack.ts'
import { contentText, requiredText, selectOptions } from '../../protocol/dom.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import type { PublicPageOptions } from '../../protocol/public-options.ts'
import { publicPageQuery } from '../../protocol/public-options.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { PUBLIC_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation } from '../../types.ts'

export type PublicIndexPage = Observation & {
  kind: 'publicIndex'
  headline: string
  description: string
  loginInfo: string
  universes: FormOption[]

  /**
   * Homepage announcement, or null when no nonempty announcement is rendered.
   *
   * 首页公告；未显示非空公告时为 null。
   */
  newsFrame: string | null

  /**
   * Login-error text from the homepage alert, or null when absent.
   *
   * 首页弹窗中的登录错误文本；没有弹窗时为 null。
   */
  loginError: string | null
}

export function readPublicIndex(page: Page): PublicIndexPage {
  /**
   * Identify the announcement card by its news link to avoid localized titles.
   *
   * 通过新闻链接定位公告卡，避免依赖本地化标题。
   */
  const newsFrame = contentText(page.$('.card-body:has(a[href$="page=news"]) > p.card-text'))

  const alerts = page.scripts.calls('alert')
  const loginError = alerts.length === 1 ? alerts[0]![0] : undefined
  return {
    kind: 'publicIndex',
    ...observation(page),
    headline: requiredText(page.$('.jumbotron h1'), 'page headline'),
    description: requiredText(page.$('.jumbotron p.lead'), 'page description'),
    loginInfo: requiredText(page.$('#login ~ div span.small'), 'login information'),
    universes: selectOptions(page, '#universe'),
    newsFrame: newsFrame === '' ? null : newsFrame,
    loginError: typeof loginError === 'string' ? loginError : null,
  }
}

export function publicIndex(
  session: Session,
  options: PublicPageOptions & { referralId?: number; errorCode?: number } = {},
): Promise<Observed<PageReply<PublicIndexPage>>> {
  return routePage(
    session,
    PUBLIC_ROUTES.index,
    {
      query: {
        ...publicPageQuery(options),
        ...(options.referralId === undefined ? {} : { ref: options.referralId }),
        ...(options.errorCode === undefined ? {} : { code: options.errorCode }),
      },
    },
    readPublicIndex,
  )
}
