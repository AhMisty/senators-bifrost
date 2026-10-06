import type { Ack, PageReply } from '../../protocol/ack.ts'
import type { Selection } from '../../protocol/dom.ts'
import {
  linkUrl,
  requiredAttribute,
  selectOptions,
  selections,
  textContent,
} from '../../protocol/dom.ts'
import { readInteger, readQuantity } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation } from '../../types.ts'
import type { AdminQuickEditorTarget } from './quickEditor.ts'

export type AdminSearchTarget = { type: AdminQuickEditorTarget; id: number }

export type AdminSearchResult = {
  /**
   * Result columns in the order defined for the searched record type.
   *
   * 结果列，顺序取决于所查记录类型。
   */
  values: string[]

  /**
   * Quick-editor target offered by the page, or null when no link is rendered.
   *
   * 页面提供的快捷编辑目标；没有操作链接时为 null。
   */
  edit: AdminSearchTarget | null

  /**
   * Deletion target offered by the page, or null when no link is rendered.
   *
   * 页面提供的删除目标；没有操作链接时为 null。
   */
  remove: AdminSearchTarget | null
}

export type AdminSearchPage = Observation & {
  kind: 'adminSearch'
  term: string
  kinds: FormOption[]
  fields: FormOption[]
  matches: FormOption[]
  limits: FormOption[]
  orders: FormOption[]
  sortFields: FormOption[]

  /**
   * Match count stated by the summary row, or null when no summary is rendered.
   *
   * 汇总行声明的匹配数量；未显示汇总时为 null。
   */
  total: number | null
  results: AdminSearchResult[]
}

const OPEN_EDIT = /openEdit\(\s*'(\d+)'\s*,\s*'(\w+)'\s*\)/

function removeLink(page: Page, row: Selection): AdminSearchResult['remove'] {
  const link = row.find('a[href*="delete="]').first()
  if (link.length === 0) return null
  const url = linkUrl(page, link)
  const kind = url.searchParams.get('delete')
  if (kind !== 'user' && kind !== 'planet') return null
  return {
    type: kind === 'user' ? 'player' : 'planet',
    id: readInteger(url.searchParams.get(kind)),
  }
}

function rowValues(row: Selection): { values: string[]; edit: AdminSearchResult['edit'] } {
  const cells = row.children('td')
  const editLink = row.find('a[href^="javascript:openEdit"]')
  const removeCell = row.find('a[href*="delete="]').length > 0 ? 1 : 0
  const controls = (editLink.length > 0 ? 1 : 0) + removeCell
  const call = editLink.length === 0 ? null : OPEN_EDIT.exec(requiredAttribute(editLink, 'href'))
  return {
    values: selections(cells)
      .slice(0, Math.max(0, cells.length - controls))
      .map((cell) => textContent(cell)),
    edit:
      call === null
        ? null
        : { id: readInteger(call[1]), type: call[2] === 'planet' ? 'planet' : 'player' },
  }
}

export function readAdminSearch(page: Page): AdminSearchPage {
  const summary = page.$('td[colspan="20"]')
  const rows = summary.length
    ? selections(summary.closest('table').find('tr')).filter(
        (row) =>
          row.children('th').length === 0 &&
          row.children('td').length > 0 &&
          row.children('td[colspan]').length === 0,
      )
    : []
  return {
    kind: 'adminSearch',
    ...observation(page),
    term: requiredAttribute(page.one('input[name="key_user"]'), 'value'),
    kinds: selectOptions(page, 'select[name="search"]'),
    fields: selectOptions(page, 'select[name="search_in"]'),
    matches: selectOptions(page, 'select[name="fucki"]'),
    limits: selectOptions(page, 'select[name="limit"]'),
    orders: selectOptions(page, 'select[name="key_acc"]'),
    sortFields: selectOptions(page, 'select[name="key_order"]'),
    total: summary.length ? readQuantity(textContent(summary.first().find('font'))) : null,
    results: rows.map((row) => {
      const values = rowValues(row)
      return {
        values: values.values,
        edit: values.edit,
        remove: removeLink(page, row),
      }
    }),
  }
}

export type AdminSearchRequest = {
  term: string
  kind: string
  field?: string

  /**
   * Match mode offered by the filter; defaults to matching anywhere.
   *
   * 取筛选器提供的匹配方式；默认匹配任意位置。
   */
  match?: string

  /**
   * Page numbers start at 1.
   *
   * 页码从 1 开始。
   */
  page?: number

  /**
   * Rows per page; the server defaults to 25.
   *
   * 每页条数，服务端默认 25。
   */
  limit?: number
  order?: string
  sortBy?: string
}

function searchQuery(request: AdminSearchRequest): Record<string, string | number> {
  const query: Record<string, string | number> = {
    /**
     * The server defaults to its delete branch when delete is absent; searches disable it explicitly.
     *
     * 服务端在缺少 delete 时默认执行删除分支，查询须显式禁用。
     */
    delete: 'none',
    search: request.kind,
    key_user: request.term,
  }
  if (request.field !== undefined) query['search_in'] = request.field
  if (request.match !== undefined) query['fuki'] = request.match
  if (request.page !== undefined) query['side'] = request.page
  if (request.limit !== undefined) query['limit'] = request.limit

  if (request.order !== undefined) query['key_acc'] = request.order
  if (request.sortBy !== undefined) query['key_order'] = request.sortBy
  return query
}

export function adminSearch(
  session: Session,
  options: { request: AdminSearchRequest },
): Promise<Observed<PageReply<AdminSearchPage>>> {
  return routePage(
    session,
    ADMIN_ROUTES.search,
    { query: { ...searchQuery(options.request) } },
    readAdminSearch,
  )
}

export function adminSearchDelete(
  session: Session,
  options: {
    request: AdminSearchRequest
    target: AdminSearchTarget
  },
): Promise<Observed<Ack>> {
  const parameter = options.target.type === 'player' ? 'user' : 'planet'
  return routeAck(session, ADMIN_ROUTES.search, {
    query: {
      ...searchQuery(options.request),
      delete: parameter,
      [parameter]: options.target.id,
    },
  })
}
