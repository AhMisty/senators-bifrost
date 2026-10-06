import type { Ack, PageReply } from '../../protocol/ack.ts'
import {
  MOON_EDITOR_FIELDS,
  MOON_ONLY_BUILDING_FIELDS,
  PLAYER_EDITOR_FIELDS,
  PLANET_EDITOR_FIELDS,
} from '../../protocol/admin-fields.ts'
import type {
  AdminMoonEditorKey,
  AdminPlayerEditorKey,
  AdminPlanetEditorKey,
} from '../../protocol/admin-fields.ts'
import { adminFormFields } from '../../protocol/admin-forms.ts'
import type { AdminFormField } from '../../protocol/admin-forms.ts'
import { fixedFields, requireCompleteRecord } from '../../protocol/fixed-fields.ts'
import { readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import { readChoice } from '../../protocol/values.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type { Observation } from '../../types.ts'

/**
 * Server editor endpoints; planet reads both planets and moons.
 *
 * 服务端编辑入口；planet 同时读取星球和月球。
 */
export type AdminQuickEditorTarget = 'player' | 'planet'

type EditorPage<Kind extends string, Key extends string> = Observation & {
  kind: 'adminQuickEditor'
  editor: Kind

  /**
   * Record ID from the request URL.
   *
   * 请求地址指定的记录 ID。
   */
  recordId: number
  /**
   * Preserve form strings to avoid numeric-conversion loss during submission.
   *
   * 表单字符串原样保留，避免回写时引入数值转换误差。
   */
  values: Readonly<Record<Key, string>>
}

export type AdminPlayerEditorPage = EditorPage<'player', AdminPlayerEditorKey> & {
  canChangePassword: boolean

  /**
   * Shared-IP flag shown by the page, or null when access to the control is restricted.
   *
   * 页面显示的共享 IP 标记；无权查看该控件时为 null。
   */
  multi: boolean | null
}
export type AdminPlanetEditorPage = EditorPage<'planet', AdminPlanetEditorKey>
export type AdminMoonEditorPage = EditorPage<'moon', AdminMoonEditorKey>

type EditorPages = {
  player: AdminPlayerEditorPage
  planet: AdminPlanetEditorPage | AdminMoonEditorPage
}
export type AdminQuickEditorPage<T extends AdminQuickEditorTarget = AdminQuickEditorTarget> =
  EditorPages[T]

function editorValues<Key extends string>(
  names: readonly Key[],
  fields: readonly AdminFormField[],
): Record<Key, string> {
  const values: Record<string, string> = {}
  for (const field of fields) {
    if (!names.some((name) => name === field.name)) continue
    if (Object.hasOwn(values, field.name) || typeof field.value !== 'string')
      throw new OperationError(ErrorCode.ParseError, `Expected one scalar ${field.name} form field`)
    values[field.name] = field.value
  }
  requireCompleteRecord(names, values)
  return values
}

export function readAdminQuickEditor<T extends AdminQuickEditorTarget>(
  page: Page,
  editor: T,
): AdminQuickEditorPage<T>
export function readAdminQuickEditor(
  page: Page,
  editor: AdminQuickEditorTarget,
): AdminQuickEditorPage {
  const fields = adminFormFields(page.one('form#userform'))
  const recordId = readInteger(page.parameter('id'), 1)
  if (editor === 'player') {
    const canChangePassword = fields.some(
      (field) => field.name === 'password' || field.name === 'multi',
    )
    const optional = canChangePassword ? editorValues(['password', 'multi'], fields) : null
    return {
      kind: 'adminQuickEditor',
      ...observation(page),
      editor: 'player',
      recordId,
      values: editorValues(PLAYER_EDITOR_FIELDS, fields),
      canChangePassword,
      multi: optional === null ? null : readChoice(optional.multi, [0, 1], 'shared-IP flag') === 1,
    }
  }
  if (fields.some((field) => MOON_ONLY_BUILDING_FIELDS.some((name) => name === field.name)))
    return {
      kind: 'adminQuickEditor',
      ...observation(page),
      editor: 'moon',
      recordId,
      values: editorValues(MOON_EDITOR_FIELDS, fields),
    }
  return {
    kind: 'adminQuickEditor',
    ...observation(page),
    editor: 'planet',
    recordId,
    values: editorValues(PLANET_EDITOR_FIELDS, fields),
  }
}

export function adminQuickEditor<T extends AdminQuickEditorTarget>(
  session: Session,
  options: { editor: T; recordId: number },
): Promise<Observed<PageReply<AdminQuickEditorPage<T>>>> {
  return routePage(
    session,
    ADMIN_ROUTES.quickEditor,
    { query: { edit: options.editor, id: options.recordId } },
    (page) => readAdminQuickEditor(page, options.editor),
  )
}

export type AdminQuickEditorSave =
  | {
      record: AdminPlayerEditorPage
      patch: Readonly<Partial<Record<AdminPlayerEditorKey, string>>>
      password?: string

      /**
       * Explicit shared-IP flag; the server rewrites it even when the control is hidden.
       *
       * 显式指定共享 IP 标记；服务端会重写该值，即使页面未显示控件。
       */
      multi: boolean

      /**
       * Explicit administrator attack-protection state; the server form omits this field.
       *
       * 明确指定管理员攻击保护状态；服务端表单未提供该字段。
       */
      authorizationAttack: boolean
    }
  | {
      record: AdminPlanetEditorPage
      patch: Readonly<Partial<Record<AdminPlanetEditorKey, string>>>
    }
  | { record: AdminMoonEditorPage; patch: Readonly<Partial<Record<AdminMoonEditorKey, string>>> }

/**
 * Submit all applicable fields; body edits round numeric values and clear inapplicable buildings on the server.
 *
 * 回写全部适用字段；天体编辑由服务端对数值取整，并清零不适用的建筑。
 */
export function adminQuickEditorSave(
  session: Session,
  options: AdminQuickEditorSave,
): Promise<Observed<Ack>> {
  const { record, patch } = options
  const fields = {
    player: PLAYER_EDITOR_FIELDS,
    planet: PLANET_EDITOR_FIELDS,
    moon: MOON_EDITOR_FIELDS,
  }
  const body = fixedFields(fields[record.editor], { ...record.values, ...patch })
  if ('authorizationAttack' in options) {
    body.multi = options.multi ? 1 : 0
    if (options.authorizationAttack) body.authattack = 'on'
    if (options.password !== undefined) body.password = options.password
  }
  return routeAck(session, ADMIN_ROUTES.quickEditor, {
    query: {
      edit: record.editor === 'player' ? 'player' : 'planet',
      id: record.recordId,
      action: 'send',
    },
    method: 'POST',
    body,
  })
}
