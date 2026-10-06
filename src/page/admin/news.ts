import type { Ack, PageReply } from '../../protocol/ack.ts'
import { requiredLinkId, tableRows, textContent, requiredAttribute } from '../../protocol/dom.ts'
import { fieldValue } from '../../protocol/forms.ts'
import { readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

export type AdminNewsEntry = {
  id: number
  title: string

  /**
   * Publication time in the server display format.
   *
   * 发布时间，保留服务端显示格式。
   */
  publishedAtText: string
  author: string
}

export type AdminNewsDraft = {
  /**
   * ID of the edited news entry, or null for a new entry.
   *
   * 编辑中的新闻 ID；新增新闻为 null。
   */
  id: number | null
  title: string
  text: string
}

export type AdminNewsPage = Observation & {
  kind: 'adminNews'
  entries: AdminNewsEntry[]

  /**
   * Editor rendered on the page, or null for the list alone.
   *
   * 页面中的编辑表单；仅显示列表时为 null。
   */
  draft: AdminNewsDraft | null
}

export function readAdminNews(page: Page): AdminNewsPage {
  const editor = page.$('form[action*="action=send"]')
  return {
    kind: 'adminNews',
    ...observation(page),
    entries: tableRows(page, 'table tbody tr').flatMap((row) => {
      const link = row.children('td').eq(0).find('a')
      if (link.length === 0) return []
      const cells = row.children('td')
      return [
        {
          id: requiredLinkId(page, link),
          title: textContent(cells.eq(1)),
          publishedAtText: textContent(cells.eq(2)),
          author: textContent(cells.eq(3)),
        },
      ]
    }),

    draft:
      editor.length === 0
        ? null
        : {
            id: editor.find('input[name="id"]').length
              ? readInteger(requiredAttribute(editor.find('input[name="id"]'), 'value'))
              : null,
            title: fieldValue(editor, 'title'),
            text: fieldValue(editor, 'text'),
          },
  }
}

export type AdminNewsRead = { action?: 'create' } | { action: 'edit'; id: number }

export function adminNews(
  session: Session,
  options: AdminNewsRead = {},
): Promise<Observed<PageReply<AdminNewsPage>>> {
  const query: Record<string, string | number> = {}
  if (options.action !== undefined) query['action'] = options.action
  if (options.action === 'edit') query['id'] = options.id
  return routePage(session, ADMIN_ROUTES.news, { query }, readAdminNews)
}

/**
 * Save news; a null draft.id publishes a new entry.
 *
 * 保存新闻；draft.id 为 null 时发布新条目。
 */
export function adminNewsSave(
  session: Session,
  options: { draft: AdminNewsDraft },
): Promise<Observed<Ack>> {
  const { draft } = options
  return routeAck(session, ADMIN_ROUTES.news, {
    query: { action: 'send', key: draft.id === null ? 2 : 1 },
    method: 'POST',
    body: {
      ...(draft.id === null ? {} : { id: draft.id }),
      title: draft.title,
      text: draft.text,
    },
  })
}

export function adminNewsDelete(
  session: Session,
  options: { newsId: number },
): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.news, {
    query: { action: 'delete', id: options.newsId },
  })
}
