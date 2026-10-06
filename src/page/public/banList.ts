import type { PageReply } from '../../protocol/ack.ts'
import {
  requiredAttribute,
  requiredHtml,
  requiredText,
  selections,
  selectOptions,
  tableRows,
  textContent,
} from '../../protocol/dom.ts'
import { displayed, readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import type { PublicPageOptions } from '../../protocol/public-options.ts'
import { publicPageQuery } from '../../protocol/public-options.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { PUBLIC_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation } from '../../types.ts'

export type PublicBannedPlayer = {
  playerName: string

  /**
   * Ban reason; the server permits an empty value.
   *
   * 封禁理由，服务端允许为空。
   */
  reason: string

  /**
   * Ban start in the server display format.
   *
   * 封禁开始时间，保留服务端显示格式。
   */
  startsAtText: string

  /**
   * Ban expiry in the server display format.
   *
   * 封禁结束时间，保留服务端显示格式。
   */
  expiresAtText: string
  administrator: string

  /**
   * Administrator contact link, including its scheme such as mailto:.
   *
   * 管理员联系链接，保留 mailto: 等协议前缀。
   */
  contact: string
}

export type PublicBanListPage = Observation & {
  kind: 'publicBanList'

  /**
   * Available universes; empty when only one exists.
   *
   * 可选宇宙；只有一个宇宙时为空。
   */
  universes: FormOption[]

  /**
   * Page numbers start at 1, including an empty list.
   *
   * 页码从 1 开始；空列表也为第 1 页。
   */
  page: number

  /**
   * Page count; zero when there are no bans.
   *
   * 列表页数；没有封禁记录时为 0。
   */
  pageCount: number

  /**
   * Ban count stated by the page, or null when absent or ambiguous.
   *
   * 页面声明的封禁数量；未显示或无法唯一识别时为 null。
   */
  total: number | null
  bans: PublicBannedPlayer[]
}

export function readPublicBanList(page: Page): PublicBanListPage {
  page.one('table.table-dark tbody td[colspan]')

  const buttons = selections(page.$('.card-footer button.btn'))
  const current = buttons.find((button) => button.hasClass('active'))
  const pages = buttons.map((button) => textContent(button)).filter((label) => /^\d+$/.test(label))
  const summary = textContent(page.$('tbody td[colspan]')).match(/\d[\d.]*/g) ?? []
  return {
    kind: 'publicBanList',
    ...observation(page),
    universes: selectOptions(page, '#universe'),
    page: current === undefined ? 1 : readInteger(textContent(current), 1),
    pageCount: pages.length,
    total: summary.length === 1 ? displayed(summary[0]) : null,
    bans: tableRows(page, 'table tbody tr').map((row) => {
      const cells = row.children('td')
      const mail = row.find('a')
      const reason = cells.eq(4)
      requiredHtml(reason, 'ban reason')
      return {
        playerName: requiredText(cells.eq(2), 'banned player'),
        reason: textContent(reason),
        startsAtText: requiredText(cells.eq(0), 'ban start'),
        expiresAtText: requiredText(cells.eq(1), 'ban end'),
        administrator: requiredText(cells.eq(3), 'banning administrator'),
        contact: requiredAttribute(mail, 'href'),
      }
    }),
  }
}

export function publicBanList(
  session: Session,
  options: PublicPageOptions & { page?: number } = {},
): Promise<Observed<PageReply<PublicBanListPage>>> {
  return routePage(
    session,
    PUBLIC_ROUTES.banList,
    {
      query: {
        ...publicPageQuery(options),
        ...(options.page === undefined ? {} : { side: options.page }),
      },
    },
    readPublicBanList,
  )
}
