import type { Ack, PageReply } from '../../protocol/ack.ts'
import type { AdminFormField } from '../../protocol/admin-forms.ts'
import { adminFormFields } from '../../protocol/admin-forms.ts'
import type { Selection } from '../../protocol/dom.ts'
import {
  linkUrl,
  selectOptions,
  selections,
  tableRows,
  textContent,
  blockLines,
} from '../../protocol/dom.ts'
import { fieldValue } from '../../protocol/forms.ts'
import { readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { FormOption, Observation } from '../../types.ts'

/**
 * minutes, hours, and daysOfMonth retain stored schedule values, including lists, wildcards, and step expressions.
 *
 * minutes、hours、daysOfMonth 保留计划原值，包括逗号列表、通配符及步长表达式。
 */
export type AdminCronjobEntry = {
  id: number
  name: string
  minutes: string
  hours: string
  daysOfMonth: string

  /**
   * Localized month list, or * for every month.
   *
   * 本地化月份列表，或表示每月的 *。
   */
  months: string

  /**
   * Localized weekday list, or * for every day.
   *
   * 本地化星期列表，或表示每天的 *。
   */
  daysOfWeek: string

  /**
   * Job class filename without the .class.php suffix.
   *
   * 任务类文件名，不含 .class.php 后缀。
   */
  className: string

  /**
   * Next run in server display format, or - when disabled.
   *
   * 服务端显示的下次运行时间；停用时为 -。
   */
  nextRunText: string
  active: boolean

  /**
   * The job is locked by a running instance or an administrator.
   *
   * 任务被执行实例或管理员锁定。
   */
  locked: boolean
}

export type AdminCronjobPage = Observation & {
  kind: 'adminCronjob'
  jobs: AdminCronjobEntry[]
  canCreate: boolean
}

/**
 * `*` selects every value; an array contains at least one selected value.
 *
 * `*` 表示全部取值；数组至少包含一个指定取值。
 */
export type AdminCronjobField = readonly number[] | '*'

export type AdminCronjobSchedule = {
  /**
   * Name key; the list resolves its localized label with the cron_name_ prefix.
   *
   * 名称键；列表通过 cron_name_ 前缀查找本地化名称。
   */
  name: string

  /**
   * Job class filename without the .class.php suffix.
   *
   * 任务类文件名，不含 .class.php 后缀。
   */
  className: string
  minutes: AdminCronjobField
  hours: AdminCronjobField
  daysOfMonth: AdminCronjobField
  months: AdminCronjobField
  daysOfWeek: AdminCronjobField
}

export type AdminCronjobDetailPage = Observation & {
  kind: 'adminCronjobDetail'

  /**
   * ID of the edited job, or null for a new job.
   *
   * 编辑中的任务 ID；新增任务为 null。
   */
  id: number | null
  fields: AdminFormField[]
  classes: FormOption[]

  /**
   * Rejection messages rendered above the form.
   *
   * 服务端在表单上方显示的拒绝原因。
   */
  errors: string[]
}

/**
 * Action links describe target states, so reading them requires the inverse state.
 *
 * 操作链接表示目标状态，因此读取时反推当前状态。
 */
function rowState(page: Page, row: Selection): { active: boolean; locked: boolean } {
  const cells = row.children('td')
  return {
    active: linkUrl(page, cells.eq(9).find('a')).searchParams.get('enable') === '0',
    locked: linkUrl(page, cells.eq(10).find('a')).searchParams.get('action') === 'unlock',
  }
}

export function readAdminCronjob(page: Page): AdminCronjobPage {
  return {
    kind: 'adminCronjob',
    ...observation(page),

    canCreate: selections(page.$('a[href*="action=detail"]')).some(
      (link) => !linkUrl(page, link).searchParams.has('id'),
    ),
    jobs: tableRows(page, 'table tbody tr').map((row) => {
      const cells = row.children('td')
      const state = rowState(page, row)
      return {
        id: readInteger(textContent(cells.eq(0))),
        name: textContent(cells.eq(1)),
        minutes: textContent(cells.eq(2)),
        hours: textContent(cells.eq(3)),
        daysOfMonth: textContent(cells.eq(4)),
        months: textContent(cells.eq(5)),
        daysOfWeek: textContent(cells.eq(6)),
        className: textContent(cells.eq(7)),
        nextRunText: textContent(cells.eq(8)),
        active: state.active,
        locked: state.locked,
      }
    }),
  }
}

export function readAdminCronjobDetail(page: Page): AdminCronjobDetailPage {
  const form = page.one('form[action=""]')
  const rawId = fieldValue(form, 'id')
  return {
    kind: 'adminCronjobDetail',
    ...observation(page),
    id: /^\d+$/.test(rawId) ? readInteger(rawId) : null,
    fields: adminFormFields(form),
    classes: selectOptions(page, 'select[name="class"]'),
    errors: selections(page.$('.card-body'))
      .filter((card) => card.find('form').length === 0)
      .flatMap((card) => blockLines(card)),
  }
}

export function adminCronjob(session: Session): Promise<Observed<PageReply<AdminCronjobPage>>> {
  return routePage(session, ADMIN_ROUTES.cronjob, {}, readAdminCronjob)
}

export function adminCronjobDetail(
  session: Session,
  options: { cronjobId?: number } = {},
): Promise<Observed<PageReply<AdminCronjobDetailPage>>> {
  const query: Record<string, string | number> = { action: 'detail' }
  if (options.cronjobId !== undefined) query['id'] = options.cronjobId
  return routePage(session, ADMIN_ROUTES.cronjob, { query }, readAdminCronjobDetail)
}

/**
 * Save the specified job, or create one when cronjobId is omitted.
 *
 * 保存指定任务；省略 cronjobId 时创建任务。
 *
 * @param options - Schedule values: minutes 0–59, hours 0–23, days of month 1–31, months 1–12, weekdays 0–6 (Sunday is 0).
 *
 * 计划取值：分钟 0–59、小时 0–23、日期 1–31、月份 1–12、星期 0–6（周日为 0）。
 */
export function adminCronjobSave(
  session: Session,
  options: { schedule: AdminCronjobSchedule; cronjobId?: number },
): Promise<Observed<Ack>> {
  const body = new URLSearchParams({
    action: 'edit',
    id: String(options.cronjobId ?? 0),
    name: options.schedule.name,
    class: options.schedule.className,
  })
  const columns: readonly [string, AdminCronjobField][] = [
    ['min', options.schedule.minutes],
    ['hours', options.schedule.hours],
    ['dom', options.schedule.daysOfMonth],
    ['month', options.schedule.months],
    ['dow', options.schedule.daysOfWeek],
  ]
  for (const [column, field] of columns) {
    if (field === '*') body.set(`${column}_all`, '1')
    else for (const value of field) body.append(`${column}[]`, String(value))
  }
  return routeAck(session, ADMIN_ROUTES.cronjob, {
    method: 'POST',
    body,
  })
}

function cronjobAction(
  session: Session,
  options: { cronjobId: number },
  action: 'delete' | 'enable' | 'lock' | 'unlock',
  extra: Readonly<Record<string, string | number>> = {},
): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.cronjob, {
    query: { action, id: options.cronjobId, ...extra },
  })
}

/**
 * Delete the job and its execution log.
 *
 * 删除任务及其运行日志。
 */
export function adminCronjobDelete(
  session: Session,
  options: { cronjobId: number },
): Promise<Observed<Ack>> {
  return cronjobAction(session, options, 'delete')
}

export function adminCronjobLock(
  session: Session,
  options: { cronjobId: number },
): Promise<Observed<Ack>> {
  return cronjobAction(session, options, 'lock')
}

export function adminCronjobUnlock(
  session: Session,
  options: { cronjobId: number },
): Promise<Observed<Ack>> {
  return cronjobAction(session, options, 'unlock')
}

export function adminCronjobEnable(
  session: Session,
  options: { cronjobId: number; active: boolean },
): Promise<Observed<Ack>> {
  return cronjobAction(session, options, 'enable', { enable: options.active ? 1 : 0 })
}
