import type { Ack, PageReply } from '../../protocol/ack.ts'
import { selectOptions } from '../../protocol/dom.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation } from '../../types.ts'

export type AdminDumpPage = Observation & {
  kind: 'adminDump'
  tables: FormOption[]
}

export function readAdminDump(page: Page): AdminDumpPage {
  return {
    kind: 'adminDump',
    ...observation(page),
    tables: selectOptions(page, 'select[name="dbtables[]"]'),
  }
}

export function adminDump(session: Session): Promise<Observed<PageReply<AdminDumpPage>>> {
  return routePage(session, ADMIN_ROUTES.dump, {}, readAdminDump)
}

/**
 * Write a SQL backup of the selected tables on the server.
 *
 * 在服务端写入所选表的 SQL 备份。
 */
export function adminDumpBackup(
  session: Session,
  options: { tables: readonly string[] },
): Promise<Observed<Ack>> {
  const body = new URLSearchParams({ action: 'dump' })
  for (const table of options.tables) body.append('dbtables[]', table)
  return routeAck(session, ADMIN_ROUTES.dump, {
    method: 'POST',
    body,
  })
}
