import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { PlayerCardPage } from '../../../src/index.ts'
import { ErrorCode, parsePage, playerCard, readPlayerCard } from '../../../src/index.ts'
import { playerCardPage } from '../../fixtures/game/social.ts'
import {
  BASE_URL,
  PLANET_ID,
  decode,
  expectOperation,
  gamePage,
  httpResponse,
  pageHtml,
  pageReply,
} from '../../helpers.ts'

const CARD_URL = `${BASE_URL}game.php?id=4242&page=playerCard`

function cardOf(body: string, playerId = 4242): PlayerCardPage {
  return readPlayerCard(parsePage(httpResponse({ body }, CARD_URL)), playerId)
}

void test('the card is read from the lines it renders', async () => {
  const observed = await decode(
    (session) => playerCard(session, { playerId: 4242 }),
    pageReply(pageHtml(playerCardPage)),
  )
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'playerCard',

    observedAtMs: observed.response.observedAtMs,
    playerId: 4242,

    identityText: 'AhMisty [Void Runners]',
    homePlanetText: 'Homeworld [1:2:3]',
    timezone: 'Europe/Berlin',
    statistics: [
      { name: 'Buildings', points: 12345, rankText: '7' },
      { name: 'Research', points: 2000, rankText: '12' },
      { name: 'Total', points: 18545, rankText: '6' },
    ],

    combat: [
      'Won\n10 (50%)',
      'Lost\n8 (40%)',
      'Drawn\n2 (10%)',
      'Total fights 20',
      'Damage Coefficient 1.5',
      'Units Killed 5.000',
      'Units Lost 3.000',
    ],
  })
})

void test('the card is the player the request named, not one read back from the markup', async () => {
  const { data } = await decode(
    (session) => playerCard(session, { playerId: 77 }),
    pageReply(pageHtml(playerCardPage)),
  )
  if (data.kind !== 'playerCard') assert.fail(`expected a card, answered with ${data.kind}`)
  assert.equal(data.playerId, 77)
})

void test('the player is named by the id parameter the card is addressed with', async () => {
  await expectOperation((session) => playerCard(session, { playerId: 4242 }), { url: CARD_URL })
})

void test('a card is about no planet of the caller’s session even where one is named', () => {
  const document = cardOf(gamePage(playerCardPage))
  assert.equal('planetId' in document, false)

  assert.equal(parsePage(httpResponse({ body: gamePage(playerCardPage) })).planetId(), PLANET_ID)
})

void test('a response that is not a card is refused rather than read as an empty one', () => {
  assert.throws(() => cardOf(pageHtml('<div>Nothing here</div>')), {
    code: ErrorCode.ParseError,
    message: 'Expected one .player_card, found 0',
  })
})
