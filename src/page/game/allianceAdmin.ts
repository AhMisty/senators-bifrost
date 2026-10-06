import type { Ack, PageReply } from '../../protocol/ack.ts'
import {
  contentSections,
  memberListRows,
  memberPoints,
  memberRow,
} from '../../protocol/alliance.ts'
import type { ContentSection, MemberRow } from '../../protocol/alliance.ts'
import { coordinate } from '../../protocol/coordinates.ts'
import {
  contentText,
  integerOptions,
  linkUrl,
  oneIn,
  requiredAttribute,
  requiredLinkId,
  responseUrl,
  selections,
  textContent,
} from '../../protocol/dom.ts'
import { controlValue } from '../../protocol/forms.ts'
import { readAmount, readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { PageRoute } from '../../protocol/routes.ts'
import {
  ALLIANCE_SETTINGS_FIELDS,
  allianceTextMode,
  allianceSettingsParameters,
  requiredSetting,
  readSettingsForm,
  settingBoolean,
  settingChoices,
  settingScalar,
} from '../../protocol/settings.ts'
import type {
  AllianceSettingsInput,
  AllianceSettingsValues,
  AllianceTextKind,
} from '../../protocol/settings.ts'
import type { Session } from '../../session.ts'
import type { Coordinate, FormOption, Observation } from '../../types.ts'
import { ErrorCode } from '../../types.ts'

/**
 * Complete alliance settings and the selected text section; null numeric values preserve blank fields.
 *
 * 完整联盟设置及所选文本区域；数值为 null 表示表单字段为空。
 */
export type AllianceAdminOverviewPage = AllianceSettingsValues &
  Observation & {
    kind: 'allianceAdminOverview'

    textKind: AllianceTextKind

    choices: {
      applicationsClosed?: FormOption<boolean>[] | undefined
      showStatistics?: FormOption<boolean>[] | undefined
      showDiplomacy?: FormOption<boolean>[] | undefined
      eventMissions?: FormOption<number>[] | undefined
    }
  }

export function readAllianceAdminOverview(
  page: Page,
  textKind: AllianceTextKind,
): AllianceAdminOverviewPage {
  const element = page.one('form[action*="mode=admin"]')
  oneIn(element, 'select[name="events[]"]')
  const form = readSettingsForm(page, element)

  return {
    kind: 'allianceAdminOverview',
    ...observation(page),
    textKind,
    tag: requiredSetting(form, ALLIANCE_SETTINGS_FIELDS.tag, String),
    name: requiredSetting(form, ALLIANCE_SETTINGS_FIELDS.name, String),
    ownerRankName: requiredSetting(form, ALLIANCE_SETTINGS_FIELDS.ownerRankName, String),
    websiteUrl: requiredSetting(form, ALLIANCE_SETTINGS_FIELDS.websiteUrl, String),
    imageUrl: requiredSetting(form, ALLIANCE_SETTINGS_FIELDS.imageUrl, String),
    applicationsClosed: requiredSetting(
      form,
      ALLIANCE_SETTINGS_FIELDS.applicationsClosed,
      settingBoolean,
    ),
    maximumMembers: requiredSetting(form, ALLIANCE_SETTINGS_FIELDS.maximumMembers, (value) =>
      value === '' ? null : readInteger(value),
    ),
    minimumApplicationPoints: requiredSetting(
      form,
      ALLIANCE_SETTINGS_FIELDS.minimumApplicationPoints,
      (value) => (value === '' ? null : readAmount(value)),
    ),
    showStatistics: requiredSetting(form, ALLIANCE_SETTINGS_FIELDS.showStatistics, settingBoolean),
    showDiplomacy: requiredSetting(form, ALLIANCE_SETTINGS_FIELDS.showDiplomacy, settingBoolean),
    text: requiredSetting(form, ALLIANCE_SETTINGS_FIELDS.text, String),
    eventMissions: form.formFields
      .getAll(ALLIANCE_SETTINGS_FIELDS.eventMissions)
      .map((value) => readInteger(value)),
    choices: {
      applicationsClosed: settingChoices(
        form,
        ALLIANCE_SETTINGS_FIELDS.applicationsClosed,
        settingBoolean,
      ),
      showStatistics: settingChoices(form, ALLIANCE_SETTINGS_FIELDS.showStatistics, settingBoolean),
      showDiplomacy: settingChoices(form, ALLIANCE_SETTINGS_FIELDS.showDiplomacy, settingBoolean),
      eventMissions: settingChoices(form, ALLIANCE_SETTINGS_FIELDS.eventMissions, readInteger),
    },
  }
}

export function allianceAdminOverview(
  session: Session,
  options: { textKind?: AllianceTextKind } = {},
): Promise<Observed<PageReply<AllianceAdminOverviewPage>>> {
  const textKind = options.textKind ?? 'external'
  return routePage(
    session,
    GAME_ROUTES.allianceAdminOverview,
    { query: { textMode: allianceTextMode(textKind) } },
    (page) => readAllianceAdminOverview(page, textKind),
  )
}

/**
 * Apply the patch over the supplied management form; eventMissions replaces the selected mission list.
 *
 * 在管理表单上应用修改；eventMissions 替换所选任务列表。
 */
export function updateAllianceSettings(
  session: Session,
  options: {
    form: AllianceAdminOverviewPage
    patch: AllianceSettingsInput
  },
): Promise<Observed<Ack>> {
  const { form, patch } = options
  const body = allianceSettingsParameters(form)
  body.set('send', '1')
  body.set('textMode', allianceTextMode(form.textKind))
  for (const [name, value] of allianceSettingsParameters(patch)) body.set(name, value)
  for (const mission of patch.eventMissions ?? form.eventMissions)
    body.append(ALLIANCE_SETTINGS_FIELDS.eventMissions, settingScalar(mission))
  return routeAck(session, GAME_ROUTES.allianceAdminOverview, {
    method: 'POST',
    body,
  })
}

/**
 * Dissolve the alliance as its owner; the server redirects afterward.
 *
 * 以盟主身份解散联盟；服务端随后重定向。
 */
export function dissolveAlliance(session: Session): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.allianceAdminClose, {
    method: 'POST',
  })
}

export type AllianceAdminTransferPage = Observation & {
  kind: 'allianceAdminTransfer'

  candidates: { playerId: number; member: string }[]
}

export function readAllianceAdminTransfer(page: Page): AllianceAdminTransferPage {
  return {
    kind: 'allianceAdminTransfer',
    ...observation(page),
    candidates: integerOptions(page.one('[name="newleader"]'), 1).map(({ value, label }) => ({
      playerId: value,
      member: label,
    })),
  }
}

export function allianceAdminTransfer(
  session: Session,
): Promise<Observed<PageReply<AllianceAdminTransferPage>>> {
  return routePage(session, GAME_ROUTES.allianceAdminTransfer, {}, readAllianceAdminTransfer)
}

export function transferAllianceLeadership(
  session: Session,
  options: { playerId: number },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.allianceAdminTransfer, {
    method: 'POST',
    body: { newleader: options.playerId },
  })
}

export type AllianceApplicationSummary = {
  id: number
  name: string

  submittedAtText: string
}

export type AllianceAdminManageApplyPage = Observation & {
  kind: 'allianceAdminManageApply'
  applications: AllianceApplicationSummary[]
}

export function readAllianceAdminManageApply(page: Page): AllianceAdminManageApplyPage {
  return {
    kind: 'allianceAdminManageApply',
    ...observation(page),
    applications: memberListRows(page).map((row) => {
      const cells = row.children('td')
      return {
        id: requiredLinkId(page, cells.eq(0).find('a')),
        name: textContent(cells.eq(0)),
        submittedAtText: textContent(cells.eq(1)),
      }
    }),
  }
}

export function allianceAdminManageApply(
  session: Session,
): Promise<Observed<PageReply<AllianceAdminManageApplyPage>>> {
  return routePage(session, GAME_ROUTES.allianceAdminManageApply, {}, readAllianceAdminManageApply)
}

export type AllianceAdminDetailApplyPage = Observation & {
  kind: 'allianceAdminDetailApply'

  id: number

  playerId: number | null
  text: string
  answers: FormOption[]
}

export function readAllianceAdminDetailApply(page: Page, id: number): AllianceAdminDetailApplyPage {
  const form = page.one('form[action*="action=sendAnswerToApply"]')
  if (responseUrl(form.attr('action'), page.url).searchParams.get('id') !== String(id))
    throw new OperationError(ErrorCode.ParseError, 'Application ID mismatch')
  return {
    kind: 'allianceAdminDetailApply',
    ...observation(page),
    id,
    playerId: page.handlerId(
      page.$('a[onclick*="Dialog.Playercard"]').attr('onclick'),
      'Playercard',
    ),
    text: contentText(page.$('.alleanza36')),
    answers: form
      .find('button[name="answer"]')
      .toArray()
      .map((node) => ({
        value: requiredAttribute(page.$(node), 'value'),
        label: textContent(page.$(node)),
      })),
  }
}

export function allianceAdminDetailApply(
  session: Session,
  options: { applicationId: number },
): Promise<Observed<PageReply<AllianceAdminDetailApplyPage>>> {
  return routePage(
    session,
    GAME_ROUTES.allianceAdminDetailApply,
    { query: { id: options.applicationId } },
    (page) => readAllianceAdminDetailApply(page, options.applicationId),
  )
}

export function answerAllianceApplication(
  session: Session,
  options: { applicationId: number; accept: boolean; text?: string },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.allianceAdminSendAnswerToApply, {
    query: { id: options.applicationId },
    method: 'POST',
    body: { answer: options.accept ? 'yes' : 'no', text: options.text ?? '' },
  })
}

/**
 * Permission id is the rank form index; name is the server permission name.
 *
 * 权限 id 是职位表单中的索引，name 是服务端权限名称。
 */
export type AllianceRight = {
  id: number

  name: string

  description: string
}

export type AllianceRank = {
  id: number
  name: string
  rights: number[]
}

export type AllianceAdminPermissionsPage = Observation & {
  kind: 'allianceAdminPermissions'
  rights: AllianceRight[]
  ranks: AllianceRank[]
}

export function readAllianceAdminPermissions(page: Page): AllianceAdminPermissionsPage {
  page.one('#new_alliance_rank')
  const rights = selections(page.$('#new_alliance_rank input[type="checkbox"]')).map((item) => {
    const id = item.attr('name')?.match(/^newrank\[(\d+)\]$/)?.[1]
    return {
      id: readInteger(id),
      name: requiredAttribute(item.closest('tr').find('img'), 'alt'),
      description: requiredAttribute(item, 'title'),
    }
  })
  const ranks = selections(page.$('input[name^="rank["][name$="[rankName]"]')).map((item) => {
    const id = readInteger(item.attr('name')?.match(/^rank\[(\d+)\]/)?.[1], 1)
    const row = item.closest('tr')
    return {
      id,
      name: String(controlValue(item)),
      rights: rights
        .filter((right) => row.find(`[name="rank[${id}][${right.id}]"]`).is(':checked'))
        .map((right) => right.id),
    }
  })
  return {
    kind: 'allianceAdminPermissions',
    ...observation(page),
    rights,
    ranks,
  }
}

export function allianceAdminPermissions(
  session: Session,
): Promise<Observed<PageReply<AllianceAdminPermissionsPage>>> {
  return routePage(session, GAME_ROUTES.allianceAdminPermissions, {}, readAllianceAdminPermissions)
}

/**
 * Each update replaces the rank name and its selected rights.
 *
 * 每次更新都会替换职位名称及其所选权限。
 */
export type AllianceRankChange =
  | { operation: 'create'; name: string; rights: number[] }
  | { operation: 'update'; id: number; name: string; rights: number[] }
  | { operation: 'delete'; id: number }

export function changeAllianceRank(
  session: Session,
  options: AllianceRankChange,
): Promise<Observed<Ack>> {
  const body = new URLSearchParams()
  if (options.operation === 'delete') body.set('deleteRank', String(options.id))
  else {
    const prefix = options.operation === 'create' ? 'newrank' : `rank[${options.id}]`
    body.set(`${prefix}[rankName]`, options.name)
    for (const right of options.rights) body.set(`${prefix}[${right}]`, '1')
  }
  return routeAck(session, GAME_ROUTES.allianceAdminPermissionsSend, {
    method: 'POST',
    body,
  })
}

export type AllianceAdminMember = MemberRow & {
  rankName: string

  rankId: number | null

  rankOptions: FormOption<number>[]
  points: number
  coordinate: Coordinate

  hasKickControl: boolean
}

export type AllianceAdminMembersPage = Observation & {
  kind: 'allianceAdminMembers'
  members: AllianceAdminMember[]
}

export function readAllianceAdminMembers(page: Page): AllianceAdminMembersPage {
  return {
    kind: 'allianceAdminMembers',
    ...observation(page),
    members: memberListRows(page).map((row) => {
      const cells = row.children('td')
      const select = cells.eq(2).find('select')
      const { id, name, joinedAtText, activityText } = memberRow(page, row)
      return {
        id,
        name,
        joinedAtText,
        activityText,
        rankName: select.length
          ? textContent(select.find('option:selected'))
          : textContent(cells.eq(2)),
        rankId: select.length ? readInteger(controlValue(select)) : null,
        rankOptions: select.length ? integerOptions(select) : [],
        points: memberPoints(cells.eq(3)),
        coordinate: coordinate(textContent(cells.eq(4))),
        hasKickControl: row.find('a[href*="action=membersKick"]').length === 1,
      }
    }),
  }
}

export function allianceAdminMembers(
  session: Session,
): Promise<Observed<PageReply<AllianceAdminMembersPage>>> {
  return routePage(session, GAME_ROUTES.allianceAdminMembers, {}, readAllianceAdminMembers)
}

export function kickAllianceMember(
  session: Session,
  options: { playerId: number },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.allianceAdminMembersKick, {
    method: 'POST',
    body: { id: options.playerId },
  })
}

export function setAllianceMemberRank(
  session: Session,
  options: { playerId: number; rankId: number },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.allianceAdminRank, {
    method: 'POST',
    body: { [`rank[${options.playerId}]`]: options.rankId },
  })
}

export type AllianceDiplomacyRecord = {
  id: number

  text: string

  hasAcceptControl: boolean

  hasDeleteControl: boolean
}

export type AllianceAdminDiplomacyPage = Observation & {
  kind: 'allianceAdminDiplomacy'
  records: AllianceDiplomacyRecord[]
  sections: ContentSection[]

  offeredModes: number[]
}

export function readAllianceAdminDiplomacy(page: Page): AllianceAdminDiplomacyPage {
  const records = new Map<number, AllianceDiplomacyRecord>()
  page
    .$('a[href*="action=diplomacyAccept"],a[href*="action=diplomacyDelete"]')
    .each((_index, node) => {
      const item = page.$(node)
      const id = requiredLinkId(page, item)
      const url = linkUrl(page, item)
      const record = records.get(id) ?? {
        id,
        text: textContent(
          item.closest('li').length ? item.closest('li') : item.closest('.alleanza64'),
        ),
        hasAcceptControl: false,
        hasDeleteControl: false,
      }
      if (url.searchParams.get('action') === 'diplomacyAccept') record.hasAcceptControl = true
      if (url.searchParams.get('action') === 'diplomacyDelete') record.hasDeleteControl = true
      records.set(id, record)
    })
  return {
    kind: 'allianceAdminDiplomacy',
    ...observation(page),
    records: [...records.values()],
    sections: contentSections(page, page.$('.alleanza1'), '.alleanza5', '.alleanza64', true),
    offeredModes: selections(
      page.$('#content .alleanza5 > a[href*="action=diplomacyCreate"]'),
    ).flatMap((link) => {
      const mode = linkUrl(page, link).searchParams.get('diploMode')
      return mode === null ? [] : [readInteger(mode)]
    }),
  }
}

export function allianceAdminDiplomacy(
  session: Session,
): Promise<Observed<PageReply<AllianceAdminDiplomacyPage>>> {
  return routePage(session, GAME_ROUTES.allianceAdminDiplomacy, {}, readAllianceAdminDiplomacy)
}

function answerAllianceDiplomacy(
  session: Session,
  route: PageRoute,
  options: { diplomacyId: number },
): Promise<Observed<Ack>> {
  return routeAck(session, route, {
    method: 'POST',
    body: { id: options.diplomacyId },
  })
}

export function acceptAllianceDiplomacy(
  session: Session,
  options: { diplomacyId: number },
): Promise<Observed<Ack>> {
  return answerAllianceDiplomacy(session, GAME_ROUTES.allianceAdminDiplomacyAccept, options)
}

export function deleteAllianceDiplomacy(
  session: Session,
  options: { diplomacyId: number },
): Promise<Observed<Ack>> {
  return answerAllianceDiplomacy(session, GAME_ROUTES.allianceAdminDiplomacyDelete, options)
}

export type AllianceAdminDiplomacyCreatePage = Observation & {
  kind: 'allianceAdminDiplomacyCreate'

  alliances: FormOption<number>[]

  levels: FormOption<number>[]
}

export function readAllianceAdminDiplomacyCreate(page: Page): AllianceAdminDiplomacyCreatePage {
  return {
    kind: 'allianceAdminDiplomacyCreate',
    ...observation(page),
    alliances: integerOptions(page.one('select[name="ally_id"]'), 1),
    levels: integerOptions(page.one('select[name="level"]'), 1),
  }
}

export function allianceAdminDiplomacyCreate(
  session: Session,
): Promise<Observed<PageReply<AllianceAdminDiplomacyCreatePage>>> {
  return routePage(
    session,
    GAME_ROUTES.allianceAdminDiplomacyCreate,
    {},
    readAllianceAdminDiplomacyCreate,
  )
}

export function createAllianceDiplomacy(
  session: Session,
  options: { allianceId: number; level: number; message: string },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.allianceAdminDiplomacyCreateProcessor, {
    method: 'POST',
    body: {
      ally_id: options.allianceId,
      level: options.level,
      text: options.message,
    },
  })
}
