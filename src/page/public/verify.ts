import type { Ack } from '../../protocol/ack.ts'
import type { PublicPageOptions } from '../../protocol/public-options.ts'
import { publicPageQuery } from '../../protocol/public-options.ts'
import { routeAck, routeResponse } from '../../protocol/request.ts'
import { observe } from '../../protocol/result.ts'
import type { Observed } from '../../protocol/result.ts'
import { PUBLIC_ROUTES } from '../../protocol/routes.ts'
import type { LoginData, Session } from '../../session.ts'

export type PublicVerificationToken = PublicPageOptions & { verificationId: number; key: string }

/**
 * Activate the account named by the verification link and retain its confirmed login token.
 *
 * 激活验证链接指定的账号；服务端确认登录时保存会话令牌。
 *
 * @returns An observation whose data is LoginData after confirmation or a server receipt otherwise.
 *
 * 观测结果；确认登录时 data 为 LoginData，否则为服务端回执。
 */
export async function publicVerify(
  session: Session,
  options: PublicVerificationToken,
): Promise<Observed<Ack | LoginData>> {
  const response = await routeResponse(session, PUBLIC_ROUTES.verify, {
    query: { ...publicPageQuery(options), i: options.verificationId, k: options.key },
    withCookie: false,
  })
  return observe(response, () => session.confirmLogin(response))
}

/**
 * Activate the account without creating a login session.
 *
 * 激活账号，此接口不创建登录会话。
 *
 * @returns An observation whose data is a JSON receipt on success or the server receipt otherwise.
 *
 * 观测结果；成功时 data 为 JSON 回执，其他情况保留服务端回执。
 */
export function publicVerifyJson(
  session: Session,
  options: PublicVerificationToken,
): Promise<Observed<Ack>> {
  return routeAck(session, PUBLIC_ROUTES.verifyJson, {
    query: { ...publicPageQuery(options), i: options.verificationId, k: options.key },
    withCookie: false,
  })
}
