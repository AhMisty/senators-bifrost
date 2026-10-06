import type { PageReply } from '../../protocol/ack.ts'
import { blockLines } from '../../protocol/dom.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type { Observation } from '../../types.ts'

export type AdminInformationPage = Observation & {
  kind: 'adminInformation'

  /**
   * Web server, PHP extensions, and runtime settings in document order.
   *
   * Web 服务、PHP 扩展及运行配置，按页面顺序排列。
   */
  environment: string[]

  /**
   * Game version, database version, and installation addresses.
   *
   * 游戏版本、数据库版本及安装地址。
   */
  installation: string[]
}

export function readAdminInformation(page: Page): AdminInformationPage {
  const paragraphs = page.$('.card-body > p.card-text')
  if (paragraphs.length !== 2)
    throw new OperationError(
      ErrorCode.ParseError,
      `Expected 2 information blocks, found ${paragraphs.length}`,
    )
  return {
    kind: 'adminInformation',
    ...observation(page),
    environment: blockLines(paragraphs.eq(0)),
    installation: blockLines(paragraphs.eq(1)),
  }
}

export function adminInformation(
  session: Session,
): Promise<Observed<PageReply<AdminInformationPage>>> {
  return routePage(session, ADMIN_ROUTES.information, {}, readAdminInformation)
}
