import type { Ack, PageReply } from '../../protocol/ack.ts'
import { ACCOUNT_FIELDS_BY_SECTION } from '../../protocol/admin-fields.ts'
import type { AdminFormField } from '../../protocol/admin-forms.ts'
import { adminFormFields, adminMenuCards } from '../../protocol/admin-forms.ts'
import { fixedFields } from '../../protocol/fixed-fields.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { ADMIN_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

const SECTIONS = {
  alliances: 'alliances',
  buildings: 'buildings',
  defenses: 'defenses',
  officers: 'officiers',
  personal: 'personal',
  planets: 'planets',
  research: 'researchs',
  resources: 'resources',
  ships: 'ships',
} as const

export type AdminAccountEditorSection = keyof typeof SECTIONS
type AccountEditorField = (typeof ACCOUNT_FIELDS_BY_SECTION)[AdminAccountEditorSection][number]
/**
 * Personal edits rewrite vacation state on every submission; enabling it requires every duration unit.
 *
 * 个人编辑每次提交都会写入休假状态；启用时必须提供全部时长单位。
 */
export type AdminPersonalEditorVacation =
  | { vacation: 'no' }
  | { vacation: 'yes'; d: number; h: number; m: number; s: number }

/**
 * Resource edits use id for the celestial body and id_dark for the account holding dark matter.
 *
 * 资源编辑的 id 指定天体，id_dark 指定暗物质所属账号。
 */
type AccountEditorRequired<Section extends AdminAccountEditorSection> = Section extends 'resources'
  ? { id: number; id_dark?: number } | { id?: number; id_dark: number }
  : Section extends 'personal'
    ? { id: number } & AdminPersonalEditorVacation
    : Section extends 'alliances'
      ? { id: number; changeleader: number }
      : { id: number }

/**
 * Quantity edits require an add/delete action; other sections submit field values.
 *
 * 数量类编辑必须指定增减操作；其余编辑提交字段值。
 */
export type AdminAccountEditorSubmit = {
  [Section in AdminAccountEditorSection]: {
    section: Section
    values: Readonly<
      Partial<
        Record<
          Exclude<(typeof ACCOUNT_FIELDS_BY_SECTION)[Section][number], 'id' | 'id_dark'>,
          string | number
        >
      > &
        AccountEditorRequired<Section>
    >
  } & (Section extends 'alliances' | 'personal' | 'planets'
    ? { submit?: never }
    : { submit: 'add' | 'delete' })
}[AdminAccountEditorSection]

function isSection(value: string): value is AdminAccountEditorSection {
  return Object.hasOwn(SECTIONS, value)
}

function sectionFromParameter(value: string): AdminAccountEditorSection | null {
  for (const [section, parameter] of Object.entries(SECTIONS)) {
    if (parameter === value && isSection(section)) return section
  }
  return null
}

export type AdminAccountEditorPage = Observation & {
  kind: 'adminAccountEditor'

  /**
   * Current form section, or menu for the section selector.
   *
   * 当前表单分区；菜单页为 menu。
   */
  section: AdminAccountEditorSection | 'menu'

  /**
   * Sections offered by the menu; empty on a form.
   *
   * 菜单提供的分区；表单页为空。
   */
  sections: AdminAccountEditorSection[]

  /**
   * Form controls in document order; empty on the menu.
   *
   * 表单控件，按页面顺序排列；菜单页为空。
   */
  fields: AdminFormField[]
}

export function readAdminAccountEditor(
  page: Page,
  section: AdminAccountEditorSection | 'menu',
): AdminAccountEditorPage {
  const forms = page.$('form')
  return {
    kind: 'adminAccountEditor',
    ...observation(page),
    section,
    sections: adminMenuCards(page, 'edit').flatMap(({ value }) => {
      const entry = sectionFromParameter(value)
      return entry === null ? [] : [entry]
    }),
    fields: forms.length ? adminFormFields(forms.eq(0)) : [],
  }
}

export function adminAccountEditor(
  session: Session,
  options: { section?: AdminAccountEditorSection } = {},
): Promise<Observed<PageReply<AdminAccountEditorPage>>> {
  return routePage(
    session,
    ADMIN_ROUTES.accountEditor,
    {
      query: options.section === undefined ? undefined : { edit: SECTIONS[options.section] },
    },
    (page) => readAdminAccountEditor(page, options.section ?? 'menu'),
  )
}

/**
 * Submit edits; personal edits rewrite vacation state, while alliance edits set the leader and reset their alliance rank to zero.
 *
 * 提交编辑；个人编辑重写休假状态，联盟编辑设置盟主并将其联盟等级归零。
 */
export function adminAccountEditorSubmit(
  session: Session,
  options: AdminAccountEditorSubmit,
): Promise<Observed<Ack>> {
  return routeAck(session, ADMIN_ROUTES.accountEditor, {
    query: { edit: SECTIONS[options.section] },
    method: 'POST',
    body: {
      ...fixedFields<AccountEditorField>(
        ACCOUNT_FIELDS_BY_SECTION[options.section],
        options.values,
      ),
      ...(options.submit === undefined ? {} : { [options.submit]: 1 }),
    },
  })
}
