import type { Ack, PageReply } from '../../protocol/ack.ts'
import { requiredAttribute, requiredText, selections, selectOptions } from '../../protocol/dom.ts'
import { fieldValue } from '../../protocol/forms.ts'
import { readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import type { PublicPageOptions } from '../../protocol/public-options.ts'
import { publicPageQuery } from '../../protocol/public-options.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { PUBLIC_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation, RequestParameters } from '../../types.ts'

export type PublicRegistrationReferral = {
  id: number
  name: string
}

export type PublicExternalAuthIdentity = {
  account: string
  method: string
}

export type PublicRegisterPage = Observation & {
  kind: 'publicRegister'
  universes: FormOption[]

  /**
   * Available languages; empty when only one is served.
   *
   * 可选语言；只有一种语言时为空。
   */
  languages: FormOption[]

  /**
   * Referring account resolved by the server, or null when none matches.
   *
   * 服务端确认的邀请账号；没有匹配账号时为 null。
   */
  referral: PublicRegistrationReferral | null

  /**
   * External-auth form fields; account is the string 0 when no identity is supplied.
   *
   * 注册表单的外部认证字段；无外部身份时 account 为字符串 0。
   */
  externalAuth: PublicExternalAuthIdentity

  /**
   * Public reCAPTCHA key, or null when captcha is disabled.
   *
   * reCAPTCHA 公钥；未启用验证码时为 null。
   */
  captchaSiteKey: string | null
}

/**
 * Read the captcha widget's public key.
 *
 * 读取验证码控件的公钥。
 *
 * @returns The public key, or null when no captcha widget is rendered.
 *
 * 公钥；页面没有验证码控件时为 null。
 */
export function readCaptchaKey(page: Page): string | null {
  const captcha = page.$('.g-recaptcha')
  return captcha.length === 0 ? null : requiredAttribute(captcha, 'data-sitekey')
}

export function readPublicRegister(page: Page): PublicRegisterPage {
  const form = page.one('#registerForm')
  /**
   * Referral details are the only form group without an input control.
   *
   * 邀请人信息是表单中唯一不含输入控件的字段组。
   */
  const groups = selections(form.find('.form-group'))
  const referral = groups.filter((group) => group.find('input,select,textarea').length === 0)
  return {
    kind: 'publicRegister',
    ...observation(page),
    universes: selectOptions(page, '#universe'),
    languages: selectOptions(page, '#language'),
    referral:
      referral.length === 0
        ? null
        : {
            id: readInteger(fieldValue(form, 'referralID')),
            name: requiredText(referral[0]!.find('span.inputDesc'), 'referring account name'),
          },
    externalAuth: {
      account: fieldValue(form, 'externalAuth[account]'),
      method: fieldValue(form, 'externalAuth[method]'),
    },
    captchaSiteKey: readCaptchaKey(page),
  }
}

export type PublicRegistrationForm = {
  username: string
  password: string
  passwordReplay: string
  email: string
  emailReplay: string
  rules: boolean
  language?: string

  /**
   * Referring account ID from the registration form referral.
   *
   * 从注册表单 referral 读取的邀请账号 ID。
   */
  referralId?: number

  /**
   * Return the registration form external-auth fields unchanged.
   *
   * 原样回传注册表单的外部认证字段。
   */
  externalAuth?: PublicExternalAuthIdentity

  /**
   * Submit the reCAPTCHA answer when captcha is enabled.
   *
   * 验证码启用时提交 reCAPTCHA 应答。
   */
  captcha?: string
}

function registrationBody(form: PublicRegistrationForm): RequestParameters {
  const body: Record<string, string | number> = {
    username: form.username,
    password: form.password,
    passwordReplay: form.passwordReplay,
    email: form.email,
    emailReplay: form.emailReplay,
  }
  if (form.rules) body.rules = 1
  if (form.language !== undefined) body.lang = form.language
  if (form.referralId !== undefined) body.referralID = form.referralId
  if (form.externalAuth !== undefined) {
    body['externalAuth[account]'] = form.externalAuth.account
    body['externalAuth[method]'] = form.externalAuth.method
  }
  if (form.captcha !== undefined) body['g-recaptcha-response'] = form.captcha
  return body
}

export function publicRegister(
  session: Session,
  options: PublicPageOptions & {
    referralId?: number
    /**
     * Identity fields supplied by the external-auth redirect.
     *
     * 外部认证跳转提供的身份字段。
     */
    externalAuth?: PublicExternalAuthIdentity
  } = {},
): Promise<Observed<PageReply<PublicRegisterPage>>> {
  return routePage(
    session,
    PUBLIC_ROUTES.register,
    {
      query: {
        ...publicPageQuery(options),
        ...(options.referralId === undefined ? {} : { referralID: options.referralId }),
        ...(options.externalAuth === undefined
          ? {}
          : {
              'externalAuth[account]': options.externalAuth.account,
              'externalAuth[method]': options.externalAuth.method,
            }),
      },
    },
    readPublicRegister,
  )
}

export function publicRegisterSend(
  session: Session,
  options: PublicRegistrationForm,
): Promise<Observed<Ack>> {
  return routeAck(session, PUBLIC_ROUTES.registerSend, {
    method: 'POST',
    body: registrationBody(options),
  })
}
