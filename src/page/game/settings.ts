import type { Ack, PageReply } from '../../protocol/ack.ts'
import { oneIn, requiredAttribute } from '../../protocol/dom.ts'
import { isDisabled } from '../../protocol/forms.ts'
import { readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { SettingsInput, SettingsValues } from '../../protocol/settings.ts'
import {
  SETTINGS_FIELDS,
  settingsParameters,
  readSetting,
  requiredSetting,
  readSettingsForm,
  settingBoolean,
  settingChoices,
  settingScalar,
} from '../../protocol/settings.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation, PlanetReference } from '../../types.ts'

type SettingsObservation = Observation & {
  kind: 'settings'

  /**
   * Rendered checkbox only; New-Star shadows the deletion timestamp, so this cannot confirm the stored schedule.
   *
   * 仅表示复选框显示状态；New-Star 覆盖了删除时间戳，无法据此确认实际删除计划。
   */
  accountDeletionChecked: boolean
}

/**
 * Complete preferences; language, theme and administrator protection are conditional controls.
 *
 * 完整偏好设置；语言、主题与管理员保护控件按服务端条件显示。
 */
export type AccountSettingsPage = SettingsObservation &
  Omit<SettingsValues, 'language' | 'theme' | 'adminProtectionEnabled'> &
  Pick<SettingsInput, 'language' | 'theme' | 'adminProtectionEnabled'> & {
    onVacation: false
    hasLeaveVacationControl: false
    email: string

    /**
     * Editable username; absent while name changes are unavailable.
     *
     * 可修改的用户名；不允许改名时不提供。
     */
    username?: string | undefined
    choices: {
      [K in 'timezone' | 'language' | 'planetSort' | 'planetOrder' | 'theme']?:
        | FormOption<SettingsValues[K]>[]
        | undefined
    }
  }

/**
 * Vacation settings allow only vacation exit and the explicit account deletion choice.
 *
 * 休假设置仅提供退出休假与明确的账号删除选项。
 */
export type VacationSettingsPage = SettingsObservation & {
  onVacation: true
  hasLeaveVacationControl: boolean
}

export type SettingsPage = AccountSettingsPage | VacationSettingsPage

export function readSettings(page: Page): SettingsPage {
  const element = page.one('form[action*="page=settings"]')
  const vacation = oneIn(element, 'input[name="vacation"][type="checkbox"]')
  const deletion = oneIn(element, 'input[name="delete"][type="checkbox"]')
  const accountDeletionChecked = deletion.is(':checked')
  if (element.find('#skils1 input[name="vacation"]').length)
    return {
      kind: 'settings',
      ...observation(page),
      onVacation: true,
      hasLeaveVacationControl: !isDisabled(page, vacation),
      accountDeletionChecked,
    }

  const form = readSettingsForm(page, element)
  const fields = form.formFields
  element.find('input[type="checkbox"][name]').each((_index, node) => {
    const item = page.$(node)
    if (isDisabled(page, item)) return
    const name = requiredAttribute(item, 'name')
    if (!fields.has(name)) fields.set(name, '0')
  })
  return {
    kind: 'settings',
    ...observation(page),
    onVacation: false,
    hasLeaveVacationControl: false,
    accountDeletionChecked,
    email: requiredSetting(form, 'email', String),
    username: readSetting(form, 'username', String),
    avatarUrl: requiredSetting(form, SETTINGS_FIELDS.avatarUrl, String),
    backgroundUrl: requiredSetting(form, SETTINGS_FIELDS.backgroundUrl, String),
    timezone: requiredSetting(form, SETTINGS_FIELDS.timezone, String),
    language: readSetting(form, SETTINGS_FIELDS.language, String),
    planetSort: requiredSetting(form, SETTINGS_FIELDS.planetSort, readInteger),
    planetOrder: requiredSetting(form, SETTINGS_FIELDS.planetOrder, readInteger),
    theme: readSetting(form, SETTINGS_FIELDS.theme, String),
    probeCount: requiredSetting(form, SETTINGS_FIELDS.probeCount, readInteger),
    fleetActionLimit: requiredSetting(form, SETTINGS_FIELDS.fleetActionLimit, readInteger),
    queueMessagesEnabled: requiredSetting(
      form,
      SETTINGS_FIELDS.queueMessagesEnabled,
      settingBoolean,
    ),
    hideEmptySpyEntries: requiredSetting(form, SETTINGS_FIELDS.hideEmptySpyEntries, settingBoolean),
    blockPrivateMessages: requiredSetting(
      form,
      SETTINGS_FIELDS.blockPrivateMessages,
      settingBoolean,
    ),
    galaxySpyEnabled: requiredSetting(form, SETTINGS_FIELDS.galaxySpyEnabled, settingBoolean),
    galaxyMessagesEnabled: requiredSetting(
      form,
      SETTINGS_FIELDS.galaxyMessagesEnabled,
      settingBoolean,
    ),
    galaxyBuddyRequestsEnabled: requiredSetting(
      form,
      SETTINGS_FIELDS.galaxyBuddyRequestsEnabled,
      settingBoolean,
    ),
    galaxyMissilesEnabled: requiredSetting(
      form,
      SETTINGS_FIELDS.galaxyMissilesEnabled,
      settingBoolean,
    ),
    adminProtectionEnabled: readSetting(
      form,
      SETTINGS_FIELDS.adminProtectionEnabled,
      settingBoolean,
    ),
    choices: {
      timezone: settingChoices(form, SETTINGS_FIELDS.timezone, String),
      language: settingChoices(form, SETTINGS_FIELDS.language, String),
      planetSort: settingChoices(form, SETTINGS_FIELDS.planetSort, readInteger),
      planetOrder: settingChoices(form, SETTINGS_FIELDS.planetOrder, readInteger),
      theme: settingChoices(form, SETTINGS_FIELDS.theme, String),
    },
  }
}

export function settings(session: Session): Promise<Observed<PageReply<SettingsPage>>> {
  return routePage(session, GAME_ROUTES.settings, {}, readSettings)
}

/**
 * Every settings write requires an explicit deletion choice because the rendered checkbox is unreliable.
 *
 * 每次设置提交都必须明确选择是否删除账号，因为页面复选框不能可靠反映实际状态。
 */
export type SettingsSubmission<Form extends SettingsPage = SettingsPage> = {
  form: Form

  /**
   * True starts the deletion period at submission time; false cancels it.
   *
   * true 从本次提交时刻开始计算删除期限，false 取消删除。
   */
  accountDeletionEnabled: boolean
}

function settingsChange(
  session: Session,
  options: SettingsSubmission,
  patch: Readonly<Record<string, string>>,
  planetId: number,
): Promise<Observed<PlanetData<Ack>>>
function settingsChange(
  session: Session,
  options: SettingsSubmission,
  patch: Readonly<Record<string, string>>,
  planetId?: number,
): Promise<Observed<Ack>>
function settingsChange(
  session: Session,
  options: SettingsSubmission,
  patch: Readonly<Record<string, string>>,
  planetId?: number,
): Promise<Observed<Ack>> {
  const body = options.form.onVacation ? new URLSearchParams() : settingsParameters(options.form)
  body.set('delete', settingScalar(options.accountDeletionEnabled))
  for (const [name, value] of Object.entries(patch)) body.set(name, value)
  return routeAck(session, GAME_ROUTES.settingsSend, {
    planetId,
    method: 'POST',
    body,
  })
}

export function settingsSend(
  session: Session,
  options: SettingsSubmission<AccountSettingsPage> & { patch: SettingsInput },
): Promise<Observed<Ack>> {
  return settingsChange(session, options, Object.fromEntries(settingsParameters(options.patch)))
}

/**
 * Submit the vacation control; entering or leaving depends on the current server state.
 *
 * 提交休假控件；进入还是退出由服务端当前状态决定。
 */
export function settingsVacation(
  session: Session,
  options: PlanetReference & SettingsSubmission,
): Promise<Observed<PlanetData<Ack>>> {
  return settingsChange(session, options, { vacation: '1' }, options.planetId)
}

export function settingsAccountDeletion(
  session: Session,
  options: { form: SettingsPage; enabled: boolean },
): Promise<Observed<Ack>> {
  return settingsChange(
    session,
    { form: options.form, accountDeletionEnabled: options.enabled },
    {},
  )
}

/**
 * Change email with the current password required by the server.
 *
 * 使用服务端要求的当前密码修改邮箱。
 */
export function settingsEmail(
  session: Session,
  options: SettingsSubmission<AccountSettingsPage> & { email: string; password: string },
): Promise<Observed<Ack>> {
  return settingsChange(session, options, {
    email: options.email,
    password: options.password,
  })
}

/**
 * Change the password; success ends the current game session and requires login with the new password.
 *
 * 修改密码；成功后当前游戏会话结束，需要使用新密码登录。
 */
export function settingsPassword(
  session: Session,
  options: SettingsSubmission<AccountSettingsPage> & {
    currentPassword: string
    newPassword: string
  },
): Promise<Observed<Ack>> {
  return settingsChange(session, options, {
    password: options.currentPassword,
    newpassword: options.newPassword,
    newpassword2: options.newPassword,
  })
}

/**
 * Change the username; success ends the current game session and requires login with the new name.
 *
 * 修改用户名；成功后当前游戏会话结束，需要使用新用户名登录。
 */
export function settingsUsername(
  session: Session,
  options: SettingsSubmission<AccountSettingsPage> & { username: string },
): Promise<Observed<Ack>> {
  return settingsChange(session, options, { username: options.username })
}
