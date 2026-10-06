import type { Ack, PageReply } from '../../protocol/ack.ts'
import { linkUrl, tableRows, textContent } from '../../protocol/dom.ts'
import { readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

export type AdminModuleEntry = {
  id: number

  /**
   * Module name in the server language.
   *
   * 模块名称，按服务端语言显示。
   */
  name: string
  active: boolean
}

export type AdminModulePage = Observation & {
  kind: 'adminModule'
  modules: AdminModuleEntry[]
}

export function readAdminModule(page: Page): AdminModulePage {
  return {
    kind: 'adminModule',
    ...observation(page),
    modules: tableRows(page, 'table tbody tr').map((row) => {
      const cells = row.children('td')
      const control = cells.eq(3).find('a')
      return {
        id: readInteger(textContent(cells.eq(0))),
        name: textContent(cells.eq(1)),
        active: linkUrl(page, control).searchParams.get('act') === 'deaktiv',
      }
    }),
  }
}

export function adminModule(session: Session): Promise<Observed<PageReply<AdminModulePage>>> {
  return routePage(session, ADMIN_ROUTES.module, {}, readAdminModule)
}

export function adminModuleSet(
  session: Session,
  options: { moduleId: number; active: boolean },
): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.module, {
    query: {
      act: options.active ? 'aktiv' : 'deaktiv',
      id: options.moduleId,
    },
  })
}
