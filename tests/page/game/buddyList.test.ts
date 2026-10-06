import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import {
  ErrorCode,
  buddyList,
  buddyListAccept,
  buddyListDelete,
  buddyListRequest,
  buddyListSend,
  parsePage,
  readBuddyList,
  readBuddyRequest,
} from '../../../src/index.ts'
import { buddyListPage } from '../../fixtures/game/social.ts'
import {
  BASE_URL,
  decode,
  expectOperation,
  fakeServer,
  gamePage,
  httpResponse,
  pageHtml,
  pageReply,
  sessionOn,
} from '../../helpers.ts'

const BUDDY_URL = `${BASE_URL}game.php?page=buddyList`

function pageOf(body: string, url = BUDDY_URL): Page {
  return parsePage(httpResponse({ body }, url))
}

function requestPopup(playerText: string): string {
  return [
    '<form name="buddy" action="game.php?page=buddyList&amp;mode=send" method="post">',
    '<input type="hidden" name="id" value="7">',
    `<input type="text" readonly value="${playerText}">`,
    '<textarea name="text"></textarea>',
    '</form>',
  ].join('')
}

void test('the buddy list is read with each row’s own state', async () => {
  const observed = await decode((session) => buddyList(session), pageReply(gamePage(buddyListPage)))
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'buddyList',

    observedAtMs: observed.response.observedAtMs,
    buddies: [
      {
        id: 11,
        playerId: 7,
        name: 'Scout',
        alliance: 'Void Runners',
        coordinate: { galaxy: 1, system: 2, planet: 3 },

        state: 'incoming',
        detail: 'Please be my buddy',
      },
      {
        id: 12,
        playerId: 8,
        name: 'Pilot',

        alliance: '-',
        coordinate: { galaxy: 1, system: 2, planet: 4 },

        state: 'outgoing',
        detail: 'Waiting for an answer',
      },
      {
        id: 13,
        playerId: 9,
        name: 'Navigator',
        alliance: 'Traders',
        coordinate: { galaxy: 2, system: 5, planet: 1 },

        state: 'friend',
        detail: '12 min',
      },
    ],
  })
})

void test('the buddies are the account’s, so a response without a planet reports none', () => {
  const document = readBuddyList(pageOf(pageHtml(`<div id="content">${buddyListPage}</div>`)))
  assert.equal('planetId' in document, false)
  assert.equal(document.buddies.length, 3)
})

void test('a response that is not the buddy list is refused', () => {
  assert.throws(() => readBuddyList(pageOf(pageHtml('<div>Nothing here</div>'))), {
    code: ErrorCode.ParseError,
    message: 'Expected one #content table.tabstatistica, found 0',
  })
})

void test('the request popup names the player the request goes to', () => {
  const document = readBuddyRequest(pageOf(pageHtml(requestPopup('Scout [1:2:4]'))))
  assert.deepEqual(document, {
    kind: 'buddyRequest',

    observedAtMs: 1,
    playerId: 7,
    playerText: 'Scout [1:2:4]',
    coordinate: { galaxy: 1, system: 2, planet: 4 },
  })
})

void test('a popup whose printed name carries no coordinate reports none', () => {
  const document = readBuddyRequest(pageOf(pageHtml(requestPopup('Scout'))))
  assert.equal(document.playerText, 'Scout')
  assert.equal(document.coordinate, null)
})

void test('a popup the template did not render its player field into is refused', () => {
  const popup = requestPopup('Scout').replace(/<input type="text"[^>]*>/, '')
  assert.throws(() => readBuddyRequest(pageOf(pageHtml(popup))), {
    code: ErrorCode.ParseError,
    message: 'Missing value on the selected element',
  })
})

void test('buddy request popups omit navigation context', () => {
  const document = readBuddyRequest(pageOf(gamePage(requestPopup('Scout [1:2:4]'))))
  assert.equal('planetId' in document, false)
})

void test('a response the popup reader cannot read is refused', () => {
  assert.throws(() => readBuddyRequest(pageOf(pageHtml('<div>Nothing here</div>'))), {
    code: ErrorCode.ParseError,
    message: 'Expected one form[name="buddy"], found 0',
  })
})

void test('reading the list asks the page’s own address once', async () => {
  const server = fakeServer(pageReply(gamePage(buddyListPage)))
  await buddyList(sessionOn(server))
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.url.href, BUDDY_URL)
  assert.equal(server.requests[0]!.url.searchParams.has('mode'), false)
})

void test('opening the request popup names the player in the address', async () => {
  await expectOperation((session) => buddyListRequest(session, { playerId: 7 }), {
    url: `${BASE_URL}game.php?id=7&page=buddyList&mode=request`,
  })
})

void test('sending a request posts the two fields the popup form submits', async () => {
  await expectOperation(
    (session) => buddyListSend(session, { playerId: 7, text: 'Please be my buddy' }),
    {
      method: 'POST',

      url: `${BASE_URL}game.php?ajax=1&page=buddyList&mode=send`,
      body: [
        ['id', '7'],
        ['text', 'Please be my buddy'],
      ],
    },
  )
})

void test('accepting and declining are the addresses the rows link to', async () => {
  await expectOperation((session) => buddyListAccept(session, { entryId: 11 }), {
    url: `${BASE_URL}game.php?id=11&page=buddyList&mode=accept`,
  })
  await expectOperation((session) => buddyListDelete(session, { entryId: 11 }), {
    url: `${BASE_URL}game.php?id=11&page=buddyList&mode=delete`,
  })
})

void test('each of the four submissions reports the answer it was given', async () => {
  const sent = await decode(
    (session) => buddyListSend(session, { playerId: 7, text: 'Hi' }),
    pageReply(gamePage('<div class="ally_contents">Request sent</div>')),
  )
  assert.deepEqual(sent.data, { kind: 'message', message: 'Request sent' })
  const accepted = await decode((session) => buddyListAccept(session, { entryId: 11 }), {
    status: 302,
    headers: { Location: 'game.php?page=buddyList' },
  })
  assert.deepEqual(accepted.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}game.php?page=buddyList`),
  })
  const declined = await decode((session) => buddyListDelete(session, { entryId: 11 }), {
    status: 302,
    headers: { Location: 'game.php?page=buddyList' },
  })
  assert.deepEqual(declined.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}game.php?page=buddyList`),
  })
})
