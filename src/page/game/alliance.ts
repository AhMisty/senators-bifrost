import type { Ack, PageReply } from '../../protocol/ack.ts'
import {
  allianceActions,
  contentSections,
  memberListRows,
  memberPoints,
  memberRow,
} from '../../protocol/alliance.ts'
import type { AllianceAction, ContentSection, MemberRow } from '../../protocol/alliance.ts'
import type { GrowthEntry } from '../../protocol/catalogue.ts'
import { catalogue } from '../../protocol/catalogue.ts'
import { coordinate } from '../../protocol/coordinates.ts'
import {
  integerOptions,
  responseUrl,
  selectOptions,
  selections,
  textContent,
} from '../../protocol/dom.ts'
import { elementBody } from '../../protocol/elements.ts'
import { displayed, readInteger } from '../../protocol/numbers.ts'
import { observation, planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { PageRoute } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type {
  Coordinate,
  ElementInput,
  ElementMap,
  FormOption,
  Observation,
  PlanetObservation,
  PlanetReference,
} from '../../types.ts'
import { ErrorCode } from '../../types.ts'

/**
 * The account alliance home, pending application, or creation prompt.
 *
 * 账号的联盟主页、待处理申请或创建入口。
 */
export type AlliancePage = Observation & {
  kind: 'alliance'

  state: 'member' | 'application-pending' | 'unaffiliated'
  title: string

  membershipText: string

  rankText: string
  sections: ContentSection[]
  actions: AllianceAction[]
}

export function readAlliance(page: Page): AlliancePage {
  const actions = allianceActions(page)
  const designation = page.$('.designation')
  const pending = actions.some((item) => item.mode === 'cancelApply')
  const unaffiliated = actions.some((item) => item.mode === 'create')
  const rank = page.$('#ally_content > .gray_flettab > .position')
  const member = rank.length === 1
  if (Number(pending) + Number(unaffiliated) + Number(member) !== 1)
    throw new OperationError(ErrorCode.ParseError, 'Unknown alliance state')
  return {
    kind: 'alliance',
    ...observation(page),
    state: pending ? 'application-pending' : unaffiliated ? 'unaffiliated' : 'member',
    title: textContent(designation.children('span').first()),
    membershipText: textContent(designation),
    rankText: textContent(rank),
    sections: contentSections(page, page.$('.card-body'), '.card-title', '.card-text', false),
    actions,
  }
}

export function alliance(session: Session): Promise<Observed<PageReply<AlliancePage>>> {
  return routePage(session, GAME_ROUTES.alliance, {}, readAlliance)
}

export type AllianceInfoPage = Observation & {
  kind: 'allianceInfo'

  allianceId: number
  title: string
  membershipText: string
  sections: ContentSection[]
  actions: AllianceAction[]
}

export function readAllianceInfo(page: Page): AllianceInfoPage {
  const designation = page.$('.designation')

  if (designation.length !== 1)
    throw new OperationError(ErrorCode.ParseError, 'Missing alliance designation')
  return {
    kind: 'allianceInfo',
    ...observation(page),
    allianceId: Number(page.parameter('id')),
    title: textContent(designation.children('span').first()),
    membershipText: textContent(designation),
    sections: contentSections(page, page.$('.card-body'), '.card-title', '.card-text', false),
    actions: allianceActions(page, { cardButtons: true }),
  }
}

export function allianceInfo(
  session: Session,
  options: { allianceId: number },
): Promise<Observed<PageReply<AllianceInfoPage>>> {
  return routePage(
    session,
    GAME_ROUTES.allianceInfo,
    { query: { id: options.allianceId } },
    readAllianceInfo,
  )
}

export type AllianceApplyPage = Observation & {
  kind: 'allianceApply'

  allianceId: number

  text: string
}

export function readAllianceApply(page: Page): AllianceApplyPage {
  const form = page.form('alliance')
  const address = responseUrl(form.attr('action'), page.url)
  return {
    kind: 'allianceApply',
    ...observation(page),
    allianceId: readInteger(address.searchParams.get('id'), 1),
    text: form.find('textarea[name="text"]').text(),
  }
}

export function allianceApply(
  session: Session,
  options: { allianceId: number },
): Promise<Observed<PageReply<AllianceApplyPage>>> {
  return routePage(
    session,
    GAME_ROUTES.allianceApply,
    { query: { id: options.allianceId } },
    readAllianceApply,
  )
}

export function submitAllianceApplication(
  session: Session,
  options: { allianceId: number; message: string },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.allianceApply, {
    query: { id: options.allianceId },
    method: 'POST',
    body: { text: options.message },
  })
}

export function cancelAllianceApplication(session: Session): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.allianceCancelApply, {
    method: 'POST',
  })
}

export type AllianceCreatePage = Observation & {
  kind: 'allianceCreate'
}

export function readAllianceCreate(page: Page): AllianceCreatePage {
  page.form('alliance')
  return {
    kind: 'allianceCreate',
    ...observation(page),
  }
}

export function allianceCreate(session: Session): Promise<Observed<PageReply<AllianceCreatePage>>> {
  return routePage(session, GAME_ROUTES.allianceCreate, {}, readAllianceCreate)
}

export function createAlliance(
  session: Session,
  options: { tag: string; name: string },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.allianceCreate, {
    query: { action: 'send' },
    method: 'POST',
    body: { atag: options.tag, aname: options.name },
  })
}

export type AllianceMember = MemberRow & {
  rankName: string
  points: number
  coordinate: Coordinate
}

export type AllianceMemberListPage = Observation & {
  kind: 'allianceMemberList'
  members: AllianceMember[]
}

export function readAllianceMemberList(page: Page): AllianceMemberListPage {
  return {
    kind: 'allianceMemberList',
    ...observation(page),
    members: memberListRows(page).map((row) => {
      const cells = row.children('td')
      const { id, name, joinedAtText, activityText } = memberRow(page, row)
      return {
        id,
        name,
        joinedAtText,
        activityText,
        rankName: textContent(cells.eq(2)),
        points: memberPoints(cells.eq(3)),
        coordinate: coordinate(textContent(cells.eq(4))),
      }
    }),
  }
}

export function allianceMemberList(
  session: Session,
): Promise<Observed<PageReply<AllianceMemberListPage>>> {
  return routePage(session, GAME_ROUTES.allianceMemberList, {}, readAllianceMemberList)
}

export function leaveAlliance(session: Session): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.allianceClose, {
    method: 'POST',
  })
}

export type AllianceCircularPage = Observation & {
  kind: 'allianceCircular'

  recipients: FormOption<number>[]
}

export function readAllianceCircular(page: Page): AllianceCircularPage {
  return {
    kind: 'allianceCircular',
    ...observation(page),
    recipients: integerOptions(page.one('[name="rankID"]')),
  }
}

export function allianceCircular(
  session: Session,
): Promise<Observed<PageReply<AllianceCircularPage>>> {
  return routePage(session, GAME_ROUTES.allianceCircular, {}, readAllianceCircular)
}

/**
 * Send a circular message to alliance members.
 *
 * 向联盟成员发送群发消息。
 *
 * @param options - Message and recipient rank; an omitted or zero rankId selects all members.
 *
 * 消息及收件职位；rankId 省略或为零时选择全体成员。
 */
export function sendAllianceCircular(
  session: Session,
  options: { subject: string; message: string; rankId?: number },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.allianceCircular, {
    query: { action: 'send' },
    method: 'POST',
    body: {
      rankID: options.rankId ?? 0,
      subject: options.subject,
      text: options.message,
    },
  })
}

export type AllianceDevelopmentPage = Observation & {
  kind: 'allianceDevelopment'
  items: GrowthEntry[]
}

export function readAllianceDevelopment(page: Page): AllianceDevelopmentPage {
  return {
    kind: 'allianceDevelopment',
    ...observation(page),
    items: catalogue(page, 'level', true),
  }
}

export function allianceDevelopment(
  session: Session,
): Promise<Observed<PageReply<AllianceDevelopmentPage>>> {
  return routePage(session, GAME_ROUTES.allianceDevelopment, {}, readAllianceDevelopment)
}

export function upgradeAllianceDevelopment(
  session: Session,
  options: { elementId: number; levels: number },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.allianceDevelopment, {
    method: 'POST',
    body: { id: options.elementId, amount: options.levels },
  })
}

export type AllianceStoragePage = Observation & {
  kind: 'allianceStorage'

  resources: ElementMap

  actions: AllianceAction[]
}

export function readAllianceStorage(page: Page): AllianceStoragePage {
  const resources: ElementMap = new Map()
  page.$('.sepor_conten[class*="res_"]').each((_index, node) => {
    const row = page.$(node)
    const id = row.attr('class')?.match(/\bres_(\d+)/)?.[1]
    resources.set(readInteger(id, 1), displayed(textContent(row.find('.res_count'))))
  })
  if (!resources.size)
    throw new OperationError(ErrorCode.ParseError, 'Alliance storage is unavailable')
  return {
    kind: 'allianceStorage',
    ...observation(page),
    resources,
    actions: allianceActions(page).filter((item) => ['put', 'vlyat', 'issue'].includes(item.mode)),
  }
}

export function allianceStorage(
  session: Session,
): Promise<Observed<PageReply<AllianceStoragePage>>> {
  return routePage(session, GAME_ROUTES.allianceStorage, {}, readAllianceStorage)
}

/**
 * Resources accepted by the transfer form and its total per-transfer limit.
 *
 * 转移表单接受的资源及每次转移的总量上限。
 */
export type AllianceTransferOffer = PlanetObservation & {
  resourceIds: number[]

  maximumTotal: number
}

export type AllianceDepositPage = AllianceTransferOffer & { kind: 'allianceDeposit' }

export type AllianceWithdrawalPage = AllianceTransferOffer & { kind: 'allianceWithdrawal' }

function readTransferOffer<K extends 'allianceDeposit' | 'allianceWithdrawal'>(
  page: Page,
  kind: K,
): AllianceTransferOffer & { kind: K } {
  page.one('form#trader')
  return {
    kind,
    ...planetObservation(page),
    resourceIds: selections(page.$('.trade_input[name]')).map((field) =>
      readInteger(field.attr('name'), 1),
    ),

    maximumTotal: displayed(textContent(page.$('.frax4 .res_count').first())),
  }
}

export function readAllianceDeposit(page: Page): AllianceDepositPage {
  return readTransferOffer(page, 'allianceDeposit')
}

export function readAllianceWithdrawal(page: Page): AllianceWithdrawalPage {
  return readTransferOffer(page, 'allianceWithdrawal')
}

export function allianceDeposit(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<AllianceDepositPage>>>> {
  return routePage(
    session,
    GAME_ROUTES.allianceDeposit,
    { planetId: options.planetId },
    readAllianceDeposit,
  )
}

export function allianceWithdrawal(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<AllianceWithdrawalPage>>>> {
  return routePage(
    session,
    GAME_ROUTES.allianceWithdrawal,
    { planetId: options.planetId },
    readAllianceWithdrawal,
  )
}

function transferAllianceResources(
  session: Session,
  route: PageRoute,
  options: PlanetReference & { resources: ElementInput },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, route, {
    planetId: options.planetId,
    method: 'POST',
    body: elementBody(options.resources, '', ''),
  })
}

export function depositAllianceResources(
  session: Session,
  options: PlanetReference & { resources: ElementInput },
): Promise<Observed<PlanetData<Ack>>> {
  return transferAllianceResources(session, GAME_ROUTES.allianceDepositSend, options)
}

export function withdrawAllianceResources(
  session: Session,
  options: PlanetReference & { resources: ElementInput },
): Promise<Observed<PlanetData<Ack>>> {
  return transferAllianceResources(session, GAME_ROUTES.allianceWithdrawalSend, options)
}

/**
 * Distribution destinations identify member planets, not player IDs.
 *
 * 分配目标标识成员的星球，不是玩家 ID。
 */
export type AllianceIssuePage = Observation & {
  kind: 'allianceIssue'

  destinations: { planetId: number; player: string }[]

  resources: ElementMap
}

export function readAllianceIssue(page: Page): AllianceIssuePage {
  page.one('#trader')
  const resources: ElementMap = new Map()
  for (const item of selections(page.$('.trade_input[name]')))
    resources.set(
      readInteger(item.attr('name'), 1),
      displayed(textContent(item.closest('tr').children('td').last())),
    )
  return {
    kind: 'allianceIssue',
    ...observation(page),
    destinations: selectOptions(page, '[name="id_u"]').map((item) => ({
      planetId: readInteger(item.value, 1),
      player: item.label,
    })),
    resources,
  }
}

export function allianceIssue(session: Session): Promise<Observed<PageReply<AllianceIssuePage>>> {
  return routePage(session, GAME_ROUTES.allianceIssue, {}, readAllianceIssue)
}

/**
 * Distribute alliance stock to the member planet named by the form.
 *
 * 将联盟库存分配至表单指定的成员星球。
 */
export function distributeAllianceResources(
  session: Session,
  options: { target: PlanetReference; resources: ElementInput },
): Promise<Observed<Ack>> {
  const body = elementBody(options.resources, '', '')
  body.set('id_u', String(options.target.planetId))
  return routeAck(session, GAME_ROUTES.allianceAdminIssueSend, {
    method: 'POST',
    body,
  })
}
