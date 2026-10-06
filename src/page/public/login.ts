import type { Ack } from '../../protocol/ack.ts'
import type { Observed } from '../../protocol/result.ts'
import type { LoginArguments, LoginData, Session, SessionOptions } from '../../session.ts'

/**
 * Log in and retain the server-confirmed session token.
 *
 * 登录并保存服务端确认的会话令牌。
 *
 * @returns An observation whose data is LoginData after confirmation or a server receipt otherwise.
 *
 * 观测结果；确认登录时 data 为 LoginData，否则为服务端回执。
 */
export function publicLogin<Defaults extends SessionOptions>(
  session: Session<Defaults>,
  ...options: LoginArguments<Defaults>
): Promise<Observed<Ack | LoginData>> {
  return session.login(...options)
}
