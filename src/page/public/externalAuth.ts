import type { Ack } from '../../protocol/ack.ts'
import type { PublicPageOptions } from '../../protocol/public-options.ts'
import { publicPageQuery } from '../../protocol/public-options.ts'
import { routeResponse } from '../../protocol/request.ts'
import { observe } from '../../protocol/result.ts'
import type { Observed } from '../../protocol/result.ts'
import { PUBLIC_ROUTES } from '../../protocol/routes.ts'
import type { LoginData, Session } from '../../session.ts'

export type PublicExternalAuthOptions = PublicPageOptions &
  (
    | {
        method: 'facebook'
        code?: string
        state?: string
        signedRequest?: string
        errorReason?: string
      }
    | { method: 'openid'; identifier: string }
  )

/**
 * Request external authentication and retain the session token when login is confirmed.
 *
 * 请求外部认证；服务端确认登录时保存会话令牌。
 *
 * @returns An observation whose data is LoginData after confirmation or a receipt otherwise, including unfollowed redirects.
 *
 * 观测结果；确认登录时 data 为 LoginData，否则为服务端回执，包括未跟随的跳转。
 */
export async function publicExternalAuth(
  session: Session,
  options: PublicExternalAuthOptions,
): Promise<Observed<Ack | LoginData>> {
  const response = await routeResponse(session, PUBLIC_ROUTES.externalAuth, {
    query: {
      ...publicPageQuery(options),
      method: options.method,
      ...(options.method === 'openid'
        ? { openid_identifier: options.identifier }
        : {
            ...(options.code === undefined ? {} : { code: options.code }),
            ...(options.state === undefined ? {} : { state: options.state }),
            ...(options.signedRequest === undefined
              ? {}
              : { signed_request: options.signedRequest }),
            ...(options.errorReason === undefined ? {} : { error_reason: options.errorReason }),
          }),
    },
    withCookie: false,
  })
  return observe(response, () => session.confirmLogin(response))
}
