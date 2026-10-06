import type { Ack, PageReply } from '../../protocol/ack.ts'
import type { AdminFormField } from '../../protocol/admin-forms.ts'
import { adminFormFields, adminMenuCards } from '../../protocol/admin-forms.ts'
import { addressParams } from '../../protocol/coordinates.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Coordinate, Observation } from '../../types.ts'

const CREATE_KINDS = ['user', 'planet', 'moon'] as const

export type AdminCreateKind = (typeof CREATE_KINDS)[number]

export type AdminCreateOffering = {
  kind: AdminCreateKind
  title: string
}

export type AdminCreatePage = Observation & {
  kind: 'adminCreate'

  /**
   * Current creation form, or menu when no form is rendered.
   *
   * 当前创建表单；未显示表单时为 menu。
   */
  form: AdminCreateKind | 'menu'

  /**
   * Creation types offered by the menu; empty on a form.
   *
   * 菜单提供的创建类型；表单页为空。
   */
  offered: AdminCreateOffering[]

  /**
   * Form controls in document order; empty on the menu.
   *
   * 表单控件，按页面顺序排列；菜单页为空。
   */
  fields: AdminFormField[]
}

function renderedForm(page: Page): { form: AdminCreateKind | 'menu'; fields: AdminFormField[] } {
  const forms = page.$('form')
  if (forms.length === 0) return { form: 'menu', fields: [] }
  const fields = adminFormFields(forms.eq(0))
  const named = (name: string): boolean => fields.some((field) => field.name === name)
  if (named('password2')) return { form: 'user', fields }
  if (named('add_moon')) return { form: 'moon', fields }
  return { form: 'planet', fields }
}

export function readAdminCreate(page: Page): AdminCreatePage {
  return {
    kind: 'adminCreate',
    ...observation(page),
    ...renderedForm(page),
    offered: adminMenuCards(page, 'class').flatMap(({ value, title }) => {
      const kind = CREATE_KINDS.find((known) => known === value)
      return kind === undefined ? [] : [{ kind, title }]
    }),
  }
}

export function adminCreate(
  session: Session,
  options: { kind?: AdminCreateKind } = {},
): Promise<Observed<PageReply<AdminCreatePage>>> {
  return routePage(
    session,
    ADMIN_ROUTES.create,
    {
      query: options.kind === undefined ? undefined : { class: options.kind },
    },
    readAdminCreate,
  )
}

export type AdminUserDraft = {
  name: string
  password: string
  email: string

  /**
   * Account access level from the values offered by the creation form.
   *
   * 账号权限级别，取创建表单提供的值。
   */
  level: number
  language: string
  coordinate: Coordinate
}

/**
 * Create an account and its home planet.
 *
 * 创建账号及其母星。
 */
export function adminCreateUser(
  session: Session,
  options: { draft: AdminUserDraft },
): Promise<Observed<Ack>> {
  const { draft } = options
  return routeAck(session, ADMIN_ROUTES.create, {
    query: { class: 'user' },
    method: 'POST',
    body: {
      name: draft.name,
      password: draft.password,
      password2: draft.password,
      email: draft.email,
      email2: draft.email,
      authlevel: draft.level,
      lang: draft.language,
      ...addressParams(draft.coordinate),
    },
  })
}

export type AdminPlanetDraft = {
  playerId: number
  coordinate: Coordinate

  /**
   * Omit to use the server default name.
   *
   * 省略时使用服务端默认名称。
   */
  name?: string

  /**
   * Field capacity of the new planet; zero gives it no usable fields.
   *
   * 新星球的地块上限；0 表示没有可用地块。
   */
  fields: number
}

export function adminCreatePlanet(
  session: Session,
  options: { draft: AdminPlanetDraft },
): Promise<Observed<Ack>> {
  const { draft } = options
  return routeAck(session, ADMIN_ROUTES.create, {
    query: { class: 'planet' },
    method: 'POST',
    body: {
      id: draft.playerId,
      ...addressParams(draft.coordinate),
      ...(draft.name === undefined ? {} : { name: draft.name }),
      field_max: draft.fields,
    },
  })
}

export type AdminMoonDraft = {
  /**
   * ID of the undestroyed host planet.
   *
   * 未被摧毁的宿主星球 ID。
   */
  planetId: number
  /**
   * Requested moon name; the current New-Star server replaces it with the default name.
   *
   * 提交的月球名称；当前 New-Star 服务端会覆盖为默认名称。
   */
  name?: string

  /**
   * Moon diameter; omission asks the server to generate one.
   *
   * 月球直径；省略时由服务端随机生成。
   */
  diameter?: number
}

export function adminCreateMoon(
  session: Session,
  options: { draft: AdminMoonDraft },
): Promise<Observed<Ack>> {
  const { draft } = options
  const body: Record<string, string | number> = { add_moon: draft.planetId }
  if (draft.name !== undefined) body.name = draft.name

  if (draft.diameter === undefined) body['diameter_check'] = 'on'
  else body['diameter'] = draft.diameter
  return routeAck(session, ADMIN_ROUTES.create, {
    query: { class: 'moon' },
    method: 'POST',
    body,
  })
}
