import type { Ack, PageReply } from '../../protocol/ack.ts'
import { ADMIN_RIGHT_FIELDS } from '../../protocol/admin-fields.ts'
import type { AdminRightKey } from '../../protocol/admin-fields.ts'
import { adminMenuCards } from '../../protocol/admin-forms.ts'
import { selectOptions, tableRows, textContent } from '../../protocol/dom.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation } from '../../types.ts'
import { ErrorCode } from '../../types.ts'

export type AdminRightsSection = 'menu' | 'rights' | 'users'

const GROUP_VALUES = {
  administrator: 'adm',
  operator: 'ope',
  moderator: 'mod',
  player: 'pla',
} as const

export type AdminRightsGroup = keyof typeof GROUP_VALUES

function groupFromParameter(value: string | null | undefined): AdminRightsGroup {
  switch (value ?? 'adm') {
    case 'adm':
      return 'administrator'
    case 'ope':
      return 'operator'
    case 'mod':
      return 'moderator'
    case 'pla':
      return 'player'
    default:
      throw new OperationError(ErrorCode.ParseError, 'Unknown administrative group')
  }
}

export type AdminRightsGrant = {
  /**
   * Administrative page class governed by the grant.
   *
   * 权限对应的管理页面类名。
   */
  page: string
  granted: boolean
}

export type AdminRightsPage = Observation & {
  kind: 'adminRights'
  section: AdminRightsSection
  menu: string[]
  accounts: FormOption[]
  group: AdminRightsGroup

  /**
   * Account named by the grants table, or null when no table is rendered.
   *
   * 权限表所属账号名；没有权限表时为 null。
   */
  account: string | null
  grants: AdminRightsGrant[]
  levels: FormOption[]
}

function menuDocuments(page: Page, section: AdminRightsSection): string[] {
  if (section !== 'menu') return []
  return adminMenuCards(page, 'key').map(({ value }) => value)
}

export function readAdminRights(page: Page, section: AdminRightsSection): AdminRightsPage {
  const grants = tableRows(page, 'table tbody tr')
  const group = page.parameters.get('get')
  return {
    kind: 'adminRights',
    ...observation(page),
    section,
    menu: menuDocuments(page, section),
    accounts: selectOptions(page, 'select[name="id_1"]'),
    group: groupFromParameter(group),
    account: grants.length ? textContent(page.$('table thead th').first()) : null,
    grants: grants.map((row) => {
      const cells = row.children('td')
      return {
        page: textContent(cells.eq(0)),
        granted: cells.eq(1).find('input:checked').attr('value') === '1',
      }
    }),
    levels: selectOptions(page, 'select[name="authlevel"]'),
  }
}

export function adminRights(
  session: Session,
  options: { section?: 'rights' | 'users'; group?: AdminRightsGroup } = {},
): Promise<Observed<PageReply<AdminRightsPage>>> {
  const query: Record<string, string | number> = {}
  if (options.section !== undefined) query['key'] = options.section
  if (options.group !== undefined) query['get'] = GROUP_VALUES[options.group]
  return routePage(session, ADMIN_ROUTES.rights, { query }, (page) =>
    readAdminRights(page, options.section ?? 'menu'),
  )
}

export function adminRightsLookup(
  session: Session,
  options: { playerId: number },
): Promise<Observed<PageReply<AdminRightsPage>>> {
  return routePage(
    session,
    ADMIN_ROUTES.rights,
    {
      query: { key: 'rights' },
      method: 'POST',
      body: { id_1: options.playerId },
    },
    (page) => readAdminRights(page, 'rights'),
  )
}

/**
 * Replace all page grants for an account; omitted grants are revoked.
 *
 * 替换账号的全部页面权限；未列出的权限被撤销。
 */
export function adminRightsSave(
  session: Session,
  options: { playerId: number; grants: Readonly<Partial<Record<AdminRightKey, boolean>>> },
): Promise<Observed<Ack>> {
  const body: Record<string, string | number> = { action: 'send', id_1: options.playerId }
  for (const page of ADMIN_RIGHT_FIELDS) {
    const granted = options.grants[page]
    if (granted !== undefined) body[`rights[${page}]`] = granted ? 1 : 0
  }
  return routeAck(session, ADMIN_ROUTES.rights, {
    query: { key: 'rights' },
    method: 'POST',
    body,
  })
}

export function adminRightsSetLevel(
  session: Session,
  options: { playerId: number; level: number },
): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.rights, {
    query: { key: 'users' },
    method: 'POST',
    body: { id_1: options.playerId, authlevel: options.level },
  })
}
