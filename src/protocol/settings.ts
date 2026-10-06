import type { FormOption } from '../types.ts'
import { ErrorCode } from '../types.ts'
import type { Selection } from './dom.ts'
import { controlOptions, requiredAttribute } from './dom.ts'
import { formFields } from './forms.ts'
import type { Page } from './page.ts'
import { OperationError } from './result.ts'

export type SettingsValues = {
  avatarUrl: string
  backgroundUrl: string
  timezone: string
  language: string
  planetSort: number
  planetOrder: number
  theme: string
  probeCount: number
  fleetActionLimit: number
  queueMessagesEnabled: boolean
  hideEmptySpyEntries: boolean
  blockPrivateMessages: boolean
  galaxySpyEnabled: boolean
  galaxyMessagesEnabled: boolean
  galaxyBuddyRequestsEnabled: boolean
  galaxyMissilesEnabled: boolean
  adminProtectionEnabled: boolean
}

type SettingsFieldsOf<T> = { [K in keyof T]?: T[K] | undefined }

/**
 * Optional settings patch; an omitted field does not mean clearing it.
 *
 * 设置表单的可选补丁；省略字段不表示清空。
 */
export type SettingsInput = SettingsFieldsOf<SettingsValues>

export type AllianceSettingsValues = {
  tag: string
  name: string
  ownerRankName: string
  websiteUrl: string
  imageUrl: string
  applicationsClosed: boolean
  maximumMembers: number | null
  minimumApplicationPoints: number | null
  showStatistics: boolean
  showDiplomacy: boolean
  eventMissions: number[]
  text: string
}

/**
 * Alliance settings patch; omitted fields retain their values, and numeric fields cannot be cleared with null.
 *
 * 联盟设置补丁；省略字段保留现值，数值字段不能以 null 清空。
 */
export type AllianceSettingsInput = SettingsFieldsOf<
  Omit<AllianceSettingsValues, 'maximumMembers' | 'minimumApplicationPoints'> & {
    maximumMembers: number
    minimumApplicationPoints: number
  }
>

/**
 * Mapping from client setting names to server form fields.
 *
 * 调用方设置名与服务端表单字段的映射。
 */
export const SETTINGS_FIELDS: Readonly<Record<keyof SettingsInput, string>> = {
  avatarUrl: 'foto',
  backgroundUrl: 'background',
  timezone: 'timezone',
  language: 'language',
  planetSort: 'planetSort',
  planetOrder: 'planetOrder',
  theme: 'theme',
  probeCount: 'spycount',
  fleetActionLimit: 'fleetactions',
  queueMessagesEnabled: 'queueMessages',
  hideEmptySpyEntries: 'spyMessagesMode',
  blockPrivateMessages: 'blockPM',
  galaxySpyEnabled: 'galaxySpy',
  galaxyMessagesEnabled: 'galaxyMessage',
  galaxyBuddyRequestsEnabled: 'galaxyBuddyList',
  galaxyMissilesEnabled: 'galaxyMissle',
  adminProtectionEnabled: 'adminprotection',
}

/**
 * Encode only declared account-setting fields.
 *
 * 仅编码账号设置声明的字段。
 */
export function settingsParameters(input: SettingsInput): URLSearchParams {
  return settingParameters([
    [SETTINGS_FIELDS.avatarUrl, input.avatarUrl],
    [SETTINGS_FIELDS.backgroundUrl, input.backgroundUrl],
    [SETTINGS_FIELDS.timezone, input.timezone],
    [SETTINGS_FIELDS.language, input.language],
    [SETTINGS_FIELDS.planetSort, input.planetSort],
    [SETTINGS_FIELDS.planetOrder, input.planetOrder],
    [SETTINGS_FIELDS.theme, input.theme],
    [SETTINGS_FIELDS.probeCount, input.probeCount],
    [SETTINGS_FIELDS.fleetActionLimit, input.fleetActionLimit],
    [SETTINGS_FIELDS.queueMessagesEnabled, input.queueMessagesEnabled],
    [SETTINGS_FIELDS.hideEmptySpyEntries, input.hideEmptySpyEntries],
    [SETTINGS_FIELDS.blockPrivateMessages, input.blockPrivateMessages],
    [SETTINGS_FIELDS.galaxySpyEnabled, input.galaxySpyEnabled],
    [SETTINGS_FIELDS.galaxyMessagesEnabled, input.galaxyMessagesEnabled],
    [SETTINGS_FIELDS.galaxyBuddyRequestsEnabled, input.galaxyBuddyRequestsEnabled],
    [SETTINGS_FIELDS.galaxyMissilesEnabled, input.galaxyMissilesEnabled],
    [SETTINGS_FIELDS.adminProtectionEnabled, input.adminProtectionEnabled],
  ])
}

export const ALLIANCE_SETTINGS_FIELDS: Readonly<Record<keyof AllianceSettingsInput, string>> = {
  tag: 'ally_tag',
  name: 'ally_name',
  ownerRankName: 'owner_range',
  websiteUrl: 'web',
  imageUrl: 'image',
  applicationsClosed: 'request_notallow',
  maximumMembers: 'ally_max_members',
  minimumApplicationPoints: 'request_min_points',
  showStatistics: 'stats',
  showDiplomacy: 'diplo',
  eventMissions: 'events[]',
  text: 'text',
}

/**
 * Encode scalar alliance settings; submission handles the event-mission list separately.
 *
 * 编码联盟标量设置；事件任务列表由提交操作独立处理。
 */
export function allianceSettingsParameters(
  input: SettingsFieldsOf<AllianceSettingsValues>,
): URLSearchParams {
  return settingParameters([
    [ALLIANCE_SETTINGS_FIELDS.tag, input.tag],
    [ALLIANCE_SETTINGS_FIELDS.name, input.name],
    [ALLIANCE_SETTINGS_FIELDS.ownerRankName, input.ownerRankName],
    [ALLIANCE_SETTINGS_FIELDS.websiteUrl, input.websiteUrl],
    [ALLIANCE_SETTINGS_FIELDS.imageUrl, input.imageUrl],
    [ALLIANCE_SETTINGS_FIELDS.applicationsClosed, input.applicationsClosed],
    [
      ALLIANCE_SETTINGS_FIELDS.maximumMembers,
      input.maximumMembers === null ? '' : input.maximumMembers,
    ],
    [
      ALLIANCE_SETTINGS_FIELDS.minimumApplicationPoints,
      input.minimumApplicationPoints === null ? '' : input.minimumApplicationPoints,
    ],
    [ALLIANCE_SETTINGS_FIELDS.showStatistics, input.showStatistics],
    [ALLIANCE_SETTINGS_FIELDS.showDiplomacy, input.showDiplomacy],
    [ALLIANCE_SETTINGS_FIELDS.text, input.text],
  ])
}

function settingParameters(
  fields: readonly (readonly [string, string | number | boolean | undefined])[],
): URLSearchParams {
  const parameters = new URLSearchParams()
  for (const [name, value] of fields) {
    if (value !== undefined) parameters.set(name, settingScalar(value))
  }
  return parameters
}

export type AllianceTextKind = 'external' | 'internal' | 'application'

/**
 * The server names application text apply.
 *
 * 服务端将申请文本类型命名为 apply。
 */
export function allianceTextMode(kind: AllianceTextKind): string {
  return kind === 'application' ? 'apply' : kind
}

export type SettingsFormFields = {
  formFields: URLSearchParams
  formOptions: Record<string, FormOption[]>
}

/**
 * Read form submission values and choices keyed by server field names.
 *
 * 读取表单提交值及选项，以服务端字段名索引。
 */
export function readSettingsForm(page: Page, form: Selection): SettingsFormFields {
  return {
    formFields: formFields(page, form),
    formOptions: Object.fromEntries(
      form
        .find('select[name]')
        .toArray()
        .map((node) => {
          const control = page.$(node)
          return [requiredAttribute(control, 'name'), controlOptions(control)]
        }),
    ),
  }
}

/**
 * Decode a named field, or undefined when the form omits it.
 *
 * 解码指定字段；表单未提供时返回 undefined。
 */
export function readSetting<T>(
  form: SettingsFormFields,
  name: string,
  decode: (value: string) => T,
): T | undefined {
  const value = form.formFields.get(name)
  return value === null ? undefined : decode(value)
}

/**
 * Decode a setting required by the complete form, preserving empty text values.
 *
 * 解码完整表单的必填设置字段，并保留空文本值。
 *
 * @throws {OperationError} The form omits the field, with code ParseError.
 *
 * 表单缺少字段，错误码为 ParseError。
 */
export function requiredSetting<T>(
  form: SettingsFormFields,
  name: string,
  decode: (value: string) => T,
): T {
  const value = form.formFields.get(name)
  if (value === null)
    throw new OperationError(ErrorCode.ParseError, `Missing settings field ${name}`)
  return decode(value)
}

/**
 * Decode choices of a named select, or undefined when absent.
 *
 * 解码指定 select 的选项；控件缺失时返回 undefined。
 */
export function settingChoices<T>(
  form: SettingsFormFields,
  name: string,
  decode: (value: string) => T,
): FormOption<T>[] | undefined {
  const options = Object.hasOwn(form.formOptions, name) ? form.formOptions[name] : undefined
  return options?.map(({ label, value }) => ({ label, value: decode(value) }))
}

/**
 * Decode a form switch value of 1 as true.
 *
 * 将表单开关 1 解码为 true。
 */
export function settingBoolean(value: string): boolean {
  return value === '1'
}

/**
 * Encode boolean switches as 1 or 0 and other values as text.
 *
 * 布尔开关编码为 1 或 0，其余值编码为文本。
 */
export function settingScalar(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? '1' : '0'
  return String(value)
}
