import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import {
  ErrorCode,
  parsePage,
  publicBattleHall,
  readBattleHall,
  readPublicBattleHall,
} from '../../../src/index.ts'
import { BATTLE_HALL_BODY, BATTLE_HALL_GAME_BODY } from '../../fixtures/public/index.ts'
import {
  BASE_URL,
  PLANET_ID,
  decode,
  expectOperation,
  gamePage,
  httpResponse,
  pageHtml,
  pageReply,
  read,
} from '../../helpers.ts'

const BATTLE_HALL_URL = `${BASE_URL}index.php?page=battleHall&uni=42`
const GAME_BATTLE_HALL_URL = `${BASE_URL}game.php?page=battleHall&cp=${PLANET_ID}`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, BATTLE_HALL_URL))
}

function gamePageOf(body: string): Page {
  return parsePage(httpResponse({ body: gamePage(body) }, GAME_BATTLE_HALL_URL))
}

function without(rendered: string, blank: string): string {
  const markup = BATTLE_HALL_BODY.replace(rendered, blank)
  assert.notEqual(markup, BATTLE_HALL_BODY, rendered)
  return markup
}

void test('each battle is read with the winner its own colours state', () => {
  assert.deepEqual(readPublicBattleHall(pageOf(BATTLE_HALL_BODY)), {
    kind: 'publicBattleHall',
    observedAtMs: 1,
    universes: [
      { value: '42', label: 'Universe One' },
      { value: '43', label: 'Universe Two' },
    ],
    battles: [
      {
        rank: 1,
        attacker: 'Attacker One',
        defender: 'Defender One',
        winner: 'attacker',
        occurredAtText: '17.03.2024 20:15:00',
        units: 1234567,
      },
      {
        rank: 2,
        attacker: 'Attacker Two',
        defender: 'Defender Two',
        winner: 'defender',
        occurredAtText: '18.03.2024 09:30:00',
        units: 987654,
      },
      {
        rank: 3,
        attacker: 'Gamma',
        defender: 'Delta',
        winner: 'draw',
        occurredAtText: '19.03.2024 12:00:00',
        units: 12345,
      },
    ],
  })
})

void test('a decided cell whose first side carries no colour is refused', () => {
  const markup = without(
    '<span style="color:#00FF00">Attacker One</span>',
    '<span>Attacker One</span>',
  )
  assert.throws(() => readPublicBattleHall(pageOf(markup)), {
    code: ErrorCode.ParseError,
    message: 'Missing style on the selected element',
  })
})

void test('a sides cell the template would not have rendered is a decoding failure', () => {
  const markup = without('Gamma<b> VS </b>Delta', 'GammaDelta')
  assert.throws(() => readPublicBattleHall(pageOf(markup)), {
    code: ErrorCode.ParseError,
    message: 'Missing battle sides',
  })
})

void test('a battle without a date, units or rank is a decoding failure', () => {
  const broken: [string, string, string, string][] = [
    ['no date', '>17.03.2024 20:15:00<', '><', 'Missing battle date'],
    ['no units', '>1.234.567<', '><', 'Missing battle units'],
    ['no rank', '<td>3</td>', '<td>third</td>', 'Expected a numeric value'],
  ]
  for (const [name, rendered, blank, message] of broken)
    assert.throws(
      () => readPublicBattleHall(pageOf(without(rendered, blank))),
      { code: ErrorCode.ParseError, message },
      name,
    )
})

void test('the public script and the game script read their own hall each', () => {
  const game = readBattleHall(gamePageOf(BATTLE_HALL_GAME_BODY))
  assert.equal(game.kind, 'battleHall')
  assert.equal('planetId' in game, false)

  assert.deepEqual(game.entries, [
    {
      rank: 1,
      reportId: '5',
      attacker: 'Attacker One',
      defender: 'Defender One',
      winner: 'attacker',
      occurredAtText: '17.03.2024 20:15:00',
      units: 1234567,
    },
  ])

  assert.throws(() => readPublicBattleHall(gamePageOf(BATTLE_HALL_GAME_BODY)), {
    code: ErrorCode.ParseError,
    message: 'Expected one .card-footer span[style*="#00FF00"], found 0',
  })

  assert.throws(() => readBattleHall(pageOf(BATTLE_HALL_BODY)), {
    code: ErrorCode.ParseError,
    message:
      'Expected one table.tabstatistica a[href*="page=battleHall"][href*="order=date"], found 0',
  })
})

void test('the hall is asked for at the route the page answers', async () => {
  await expectOperation((session) => publicBattleHall(session), {
    url: `${BASE_URL}index.php?page=battleHall&uni=42`,
  })
})

void test('the document the page answered with is the one the caller reads', async () => {
  const document = await read(
    (session) => publicBattleHall(session),
    pageReply(pageHtml(BATTLE_HALL_BODY)),
  )
  assert.equal(document.kind, 'publicBattleHall')
  assert.equal('planetId' in document, false)
  assert.equal(document.battles.length, 3)
})

void test('an answer carrying no document is reported as the receipt it is', async () => {
  const observed = await decode((session) => publicBattleHall(session), { body: '' })
  assert.deepEqual(observed.data, { kind: 'empty' })
})
