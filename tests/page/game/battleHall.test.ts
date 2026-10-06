import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import { ErrorCode, battleHall, parsePage, readBattleHall } from '../../../src/index.ts'
import { battleHallPage, battleHallRowWithoutReportLink } from '../../fixtures/game/social.ts'
import {
  BASE_URL,
  decode,
  expectOperation,
  gamePage,
  httpResponse,
  pageHtml,
  pageReply,
} from '../../helpers.ts'

const HALL_URL = `${BASE_URL}game.php?page=battleHall`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body }, HALL_URL))
}

void test('the hall is read row by row, each naming its own report', async () => {
  const observed = await decode(
    (session) => battleHall(session),
    pageReply(gamePage(battleHallPage)),
  )
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'battleHall',

    observedAtMs: observed.response.observedAtMs,
    entries: [
      {
        rank: 1,
        reportId: 'abc123',

        attacker: 'AhMisty',
        defender: 'Scout',
        winner: 'attacker',
        occurredAtText: '01.01.2026 12:00:00',

        units: 1234,
      },
      {
        rank: 2,
        reportId: 'def456',
        attacker: 'Scout',
        defender: 'AhMisty',
        winner: 'defender',
        occurredAtText: '02.01.2026 08:30:00',
        units: 42,
      },
    ],
  })
})

void test('the hall is the universe’s, so a response without a planet reports none', () => {
  const document = readBattleHall(pageOf(pageHtml(battleHallPage)))
  assert.equal('planetId' in document, false)
  assert.equal(document.entries.length, 2)
})

void test('a row whose link names no report cannot be attributed to one', () => {
  assert.throws(() => readBattleHall(pageOf(pageHtml(battleHallRowWithoutReportLink))), {
    code: ErrorCode.ParseError,
    message: 'Battle hall entry has no report ID',
  })
})

void test('a response that is not the hall is refused', () => {
  assert.throws(() => readBattleHall(pageOf(pageHtml('<div>Nothing here</div>'))), {
    code: ErrorCode.ParseError,
    message:
      'Expected one table.tabstatistica a[href*="page=battleHall"][href*="order=date"], found 0',
  })
})

void test('the other ordering is asked for by the pair the headings link to', async () => {
  await expectOperation((session) => battleHall(session), { url: HALL_URL })
  await expectOperation((session) => battleHall(session, { order: 'units', direction: 'asc' }), {
    url: `${BASE_URL}game.php?order=units&sort=asc&page=battleHall`,
  })
})
