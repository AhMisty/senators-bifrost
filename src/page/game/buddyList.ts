import type { Ack, PageReply } from '../../protocol/ack.ts'
import { coordinate, coordinateIn } from '../../protocol/coordinates.ts'
import { requiredAttribute, requiredLinkId, tableRows, textContent } from '../../protocol/dom.ts'
import { readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Coordinate, Observation } from '../../types.ts'

/**
 * A friendship or request; id identifies the relationship, while playerId identifies the player when exposed.
 *
 * 好友关系或申请；id 标识关系，playerId 在页面提供时标识玩家。
 */
export type BuddyEntry = {
  id: number

  playerId: number | null
  name: string

  alliance: string
  coordinate: Coordinate
  state: 'incoming' | 'friend' | 'outgoing'

  detail: string
}

export type BuddyListPage = Observation & {
  kind: 'buddyList'
  buddies: BuddyEntry[]
}

export function readBuddyList(page: Page): BuddyListPage {
  page.one('#content table.tabstatistica')
  return {
    kind: 'buddyList',
    ...observation(page),
    buddies: tableRows(page, 'tr.classificabarra').map((row) => {
      const cells = row.children('td')
      const remove = cells.last().find('a[href*="mode=delete"]')
      const accept = cells.last().find('a[href*="mode=accept"]')
      const state: BuddyEntry['state'] = accept.length
        ? 'incoming'
        : cells.eq(3).find('span[style]').length
          ? 'friend'
          : 'outgoing'
      return {
        id: requiredLinkId(page, remove),
        playerId: page.handlerId(cells.eq(0).find('a').attr('onclick'), 'PM'),
        name: textContent(cells.eq(0)),
        alliance: textContent(cells.eq(1)),
        coordinate: coordinate(textContent(cells.eq(2))),
        state,
        detail: textContent(cells.eq(3)),
      }
    }),
  }
}

export type BuddyRequestPage = Observation & {
  kind: 'buddyRequest'

  playerId: number

  playerText: string

  coordinate: Coordinate | null
}

export function readBuddyRequest(page: Page): BuddyRequestPage {
  const form = page.one('form[name="buddy"]')
  const playerText = requiredAttribute(form.find('input[readonly]'), 'value')
  return {
    kind: 'buddyRequest',
    ...observation(page),
    playerId: readInteger(form.find('[name="id"]').attr('value'), 1),
    playerText,
    coordinate: coordinateIn(playerText),
  }
}

export function buddyList(session: Session): Promise<Observed<PageReply<BuddyListPage>>> {
  return routePage(session, GAME_ROUTES.buddyList, {}, readBuddyList)
}

export function buddyListRequest(
  session: Session,
  options: { playerId: number },
): Promise<Observed<PageReply<BuddyRequestPage>>> {
  return routePage(
    session,
    GAME_ROUTES.buddyListRequest,
    { query: { id: options.playerId } },
    readBuddyRequest,
  )
}

export function buddyListSend(
  session: Session,
  options: {
    playerId: number

    text: string
  },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.buddyListSend, {
    query: { ajax: 1 },
    method: 'POST',
    body: { id: options.playerId, text: options.text },
  })
}

export function buddyListAccept(
  session: Session,
  options: { entryId: number },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.buddyListAccept, {
    query: { id: options.entryId },
  })
}

/**
 * Decline an incoming request, cancel an outgoing request, or remove a friend by relationship ID.
 *
 * 按关系 ID 拒绝收到的申请、撤销发出的申请或移除好友。
 */
export function buddyListDelete(
  session: Session,
  options: { entryId: number },
): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.buddyListDelete, {
    query: { id: options.entryId },
  })
}
