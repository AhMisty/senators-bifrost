import type { Ack, PageReply } from '../../protocol/ack.ts'
import { UNIVERSE_FIELDS } from '../../protocol/admin-fields.ts'
import type { AdminUniverseSettingKey } from '../../protocol/admin-fields.ts'
import { requiredAttribute, selections } from '../../protocol/dom.ts'
import { fixedFields, requireCompleteRecord } from '../../protocol/fixed-fields.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { OperationError } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'
import { ErrorCode } from '../../types.ts'

export type AdminUniverseSettingsSetting = {
  /**
   * Configuration group corresponding to the page pane ID.
   *
   * 配置分组，对应页面面板 ID。
   */
  section: string
  /**
   * Original form value, without number conversion for large integers or decimals.
   *
   * 表单原值，包含大整数或小数时也不转换为 number。
   */
  value: string
}

export type AdminUniverseSettingsPage = Observation & {
  kind: 'adminUniverseSettings'
  settings: Readonly<Record<AdminUniverseSettingKey, AdminUniverseSettingsSetting>>
}

export function readAdminUniverseSettings(page: Page): AdminUniverseSettingsPage {
  const settings: Record<string, AdminUniverseSettingsSetting> = {}
  page.$('.tab-pane[id^="pills-"]').each((_index, node) => {
    const pane = page.$(node)
    const section = requiredAttribute(pane, 'id').replace(/^pills-/, '')
    for (const field of selections(pane.find('input[name]'))) {
      const name = requiredAttribute(field, 'name')
      if (!UNIVERSE_FIELDS.some((key) => key === name)) continue
      if (Object.hasOwn(settings, name))
        throw new OperationError(ErrorCode.ParseError, `Duplicate ${name} form field`)
      settings[name] = {
        section,
        value: requiredAttribute(field, 'value'),
      }
    }
  })
  requireCompleteRecord(UNIVERSE_FIELDS, settings)
  return {
    kind: 'adminUniverseSettings',
    ...observation(page),
    settings,
  }
}

export function adminUniverseSettings(
  session: Session,
): Promise<Observed<PageReply<AdminUniverseSettingsPage>>> {
  return routePage(session, ADMIN_ROUTES.universeSettings, {}, readAdminUniverseSettings)
}

/**
 * Apply changes to a complete form because the server writes omitted settings as empty strings.
 *
 * 在完整表单上应用修改，因为服务端会将缺失配置写为空字符串。
 */
export function adminUniverseSettingsSave(
  session: Session,
  options: {
    form: AdminUniverseSettingsPage
    patch: Readonly<Partial<Record<AdminUniverseSettingKey, string | number>>>
  },
): Promise<Observed<Ack>> {
  const stored = Object.fromEntries(
    UNIVERSE_FIELDS.map((name) => [name, options.form.settings[name].value]),
  )
  return routeAck(session, ADMIN_ROUTES.universeSettings, {
    method: 'POST',
    body: fixedFields(UNIVERSE_FIELDS, { ...stored, ...options.patch }),
  })
}
