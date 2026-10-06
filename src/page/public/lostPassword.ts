import type { Ack, PageReply } from '../../protocol/ack.ts'
import { requiredText, selectOptions } from '../../protocol/dom.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import type { PublicPageOptions } from '../../protocol/public-options.ts'
import { publicPageQuery } from '../../protocol/public-options.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { PUBLIC_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation } from '../../types.ts'
import { readCaptchaKey } from './register.ts'

export type PublicLostPasswordPage = Observation & {
  kind: 'publicLostPassword'
  info: string
  universes: FormOption[]

  /**
   * Public reCAPTCHA key, or null when captcha is disabled.
   *
   * reCAPTCHA 公钥；未启用验证码时为 null。
   */
  captchaSiteKey: string | null
}

export function readPublicLostPassword(page: Page): PublicLostPasswordPage {
  return {
    kind: 'publicLostPassword',
    ...observation(page),
    info: requiredText(page.$('.card-body > p.card-text'), 'password recovery instructions'),
    universes: selectOptions(page, '#universe'),
    captchaSiteKey: readCaptchaKey(page),
  }
}

export function publicLostPassword(
  session: Session,
  options: PublicPageOptions = {},
): Promise<Observed<PageReply<PublicLostPasswordPage>>> {
  return routePage(
    session,
    PUBLIC_ROUTES.lostPassword,
    { query: publicPageQuery(options) },
    readPublicLostPassword,
  )
}

/**
 * Account ID and one-time key from the recovery email link; the key expires after 30 minutes.
 *
 * 找回邮件链接中的账号 ID 与一次性密钥；密钥有效期为 30 分钟。
 */
export type PublicPasswordRecoveryToken = PublicPageOptions & {
  playerId: number
  key: string
}

/**
 * Redeem the recovery token so the server generates and emails a new password.
 *
 * 使用找回令牌，由服务端生成新密码并发送邮件。
 */
export function publicLostPasswordNew(
  session: Session,
  options: PublicPasswordRecoveryToken,
): Promise<Observed<Ack>> {
  return routeAck(session, PUBLIC_ROUTES.lostPasswordNew, {
    query: publicPageQuery(options),
    method: 'POST',
    body: { u: options.playerId, k: options.key },
  })
}

export type PublicPasswordRecoveryRequest = PublicPageOptions & {
  username: string
  /**
   * The account's permanent email address, stored in the server's email_2 field.
   *
   * 账号的永久邮箱，对应服务端 email_2 字段。
   */
  mail: string

  /**
   * Submit the reCAPTCHA answer when captcha is enabled.
   *
   * 验证码启用时提交 reCAPTCHA 应答。
   */
  captcha?: string
}

export function publicLostPasswordSend(
  session: Session,
  options: PublicPasswordRecoveryRequest,
): Promise<Observed<Ack>> {
  const body: Record<string, string | number> = {
    username: options.username,
    mail: options.mail,
  }
  if (options.captcha !== undefined) body['g-recaptcha-response'] = options.captcha
  return routeAck(session, PUBLIC_ROUTES.lostPasswordSend, {
    query: publicPageQuery(options),
    method: 'POST',
    body,
  })
}
