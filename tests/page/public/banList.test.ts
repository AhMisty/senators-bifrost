import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import {
  ErrorCode,
  parsePage,
  publicBanList,
  readBanList,
  readPublicBanList,
} from '../../../src/index.ts'
import {
  BAN_LIST_BODY,
  BAN_LIST_EMPTY_BODY,
  BAN_LIST_GAME_BODY,
} from '../../fixtures/public/index.ts'
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

const BAN_LIST_URL = `${BASE_URL}index.php?page=banList&uni=42`
const GAME_BAN_LIST_URL = `${BASE_URL}game.php?page=banList&cp=${PLANET_ID}`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, BAN_LIST_URL))
}

function gamePageOf(body: string): Page {
  return parsePage(httpResponse({ body: gamePage(body) }, GAME_BAN_LIST_URL))
}

void test('the bans of the universe are read from the rows the template rendered', () => {
  assert.deepEqual(readPublicBanList(pageOf(BAN_LIST_BODY)), {
    kind: 'publicBanList',
    observedAtMs: 1,
    universes: [
      { value: '42', label: 'Universe One' },
      { value: '43', label: 'Universe Two' },
    ],

    page: 2,
    pageCount: 2,
    total: 7,
    bans: [
      {
        playerName: 'Rulebreaker',
        reason: 'Multi accounts',
        startsAtText: '01.03.2024 10:00',
        expiresAtText: '08.03.2024 10:00',
        administrator: 'AdminBob',
        contact: 'mailto:admin@example.com',
      },
      {
        playerName: 'Bashbot',
        reason: 'Bashing',
        startsAtText: '02.03.2024 18:30',
        expiresAtText: '09.03.2024 18:30',
        administrator: 'AdminAnn',
        contact: 'mailto:admin.ann@example.com',
      },
    ],
  })
})

void test('a universe without bans reads as an empty first page', () => {
  const document = readPublicBanList(pageOf(BAN_LIST_EMPTY_BODY))
  assert.deepEqual(document.bans, [])

  assert.equal(document.total, null)

  assert.equal(document.page, 1)
  assert.equal(document.pageCount, 0)
})

void test('a summary sentence stating more than one number is not read as a total', () => {
  const markup = BAN_LIST_BODY.replace(
    'Players banned: 7 accounts banned',
    'Account 7 of 30 banned',
  )
  assert.notEqual(markup, BAN_LIST_BODY)
  const document = readPublicBanList(pageOf(markup))
  assert.equal(document.total, null)

  assert.equal(document.page, 2)
  assert.equal(document.bans.length, 2)
})

void test('a footer whose current page is not a number is a decoding failure', () => {
  const markup = BAN_LIST_BODY.replace(
    'class="btn btn-secondary active">2<',
    'class="btn btn-secondary active">Prev<',
  )
  assert.notEqual(markup, BAN_LIST_BODY)
  assert.throws(() => readPublicBanList(pageOf(markup)), {
    code: ErrorCode.ParseError,
    message: 'Expected a numeric value',
  })
})

void test('a row that states no player, period or administrator is a decoding failure', () => {
  const broken: [string, string, string, string][] = [
    ['no player', '<td>Rulebreaker</td>', '<td></td>', 'Missing banned player'],
    ['no start', '<td>01.03.2024 10:00</td>', '<td></td>', 'Missing ban start'],
    ['no end', '<td>08.03.2024 10:00</td>', '<td></td>', 'Missing ban end'],
    [
      'no administrator',
      '<td><a href="mailto:admin@example.com" title="Write admin@example.com a mail">AdminBob</a></td>',
      '<td></td>',
      'Missing banning administrator',
    ],
  ]
  for (const [name, rendered, blank, message] of broken) {
    const markup = BAN_LIST_BODY.replace(rendered, blank)
    assert.notEqual(markup, BAN_LIST_BODY, name)
    assert.throws(
      () => readPublicBanList(pageOf(markup)),
      { code: ErrorCode.ParseError, message },
      name,
    )
  }
})

void test('the ban list preserves an empty reason accepted by the ban form', () => {
  const markup = BAN_LIST_BODY.replace('<td>Multi accounts</td>', '<td></td>')
  const page = readPublicBanList(pageOf(markup))
  assert.equal(page.bans[0]!.reason, '')
  assert.equal(page.bans.length, 2)
})

void test('a missing reason cell is a decoding failure', () => {
  const markup = BAN_LIST_BODY.replace('<td>Multi accounts</td>', '')
  assert.throws(() => readPublicBanList(pageOf(markup)), {
    code: ErrorCode.ParseError,
    message: 'Missing ban reason markup',
  })
})

void test('a row whose link carries no address is a decoding failure', () => {
  const markup = BAN_LIST_BODY.replace('<a href="mailto:admin@example.com"', '<a')
  assert.notEqual(markup, BAN_LIST_BODY)
  assert.throws(() => readPublicBanList(pageOf(markup)), {
    code: ErrorCode.ParseError,
    message: 'Missing href on the selected element',
  })
})

void test('the public script and the game script read their own ban list each', () => {
  const game = readBanList(gamePageOf(BAN_LIST_GAME_BODY))
  assert.equal(game.kind, 'banList')
  assert.equal('planetId' in game, false)
  assert.equal(game.page, 1)
  assert.deepEqual(game.bans, [
    {
      startsAtText: '01.03.2024 10:00',
      expiresAtText: '08.03.2024 10:00',
      playerName: 'Rulebreaker',
      administrator: 'AdminBob',
      reason: 'Multi accounts',
      contact: 'mailto:admin@example.com',
    },
  ])

  assert.throws(() => readPublicBanList(gamePageOf(BAN_LIST_GAME_BODY)), {
    code: ErrorCode.ParseError,
    message: 'Expected one table.table-dark tbody td[colspan], found 0',
  })

  assert.throws(() => readBanList(pageOf(BAN_LIST_BODY)), {
    code: ErrorCode.ParseError,
    message: 'Expected one #content table.tabstatistica, found 0',
  })
})

void test('the list is asked for at the route the page answers, with the caller’s page', async () => {
  await expectOperation(
    (session) => publicBanList(session, { page: 2 }),

    { url: `${BASE_URL}index.php?side=2&page=banList&uni=42` },
  )
})

void test('the document the page answered with is the one the caller reads', async () => {
  const document = await read(
    (session) => publicBanList(session),
    pageReply(pageHtml(BAN_LIST_BODY)),
  )
  assert.equal(document.kind, 'publicBanList')
  assert.equal(document.page, 2)
  assert.equal(document.total, 7)
})

void test('a body that claims to be the document but cannot be decoded raises', async () => {
  const markup = BAN_LIST_BODY.replace('<td>Rulebreaker</td>', '<td></td>')
  await assert.rejects(
    () => decode((session) => publicBanList(session), pageReply(pageHtml(markup))),
    { code: ErrorCode.ParseError, message: 'Missing banned player' },
  )
})

void test('an answer carrying no document is reported as the receipt it is', async () => {
  const answers: [string, unknown][] = [
    ['an empty body', { kind: 'empty' }],
    ['a dead session', { kind: 'redirect', target: new URL(`${BASE_URL}index.php?page=login`) }],
  ]
  for (const [name, expected] of answers) {
    const response =
      name === 'an empty body'
        ? { body: '' }
        : { status: 302, headers: { Location: './index.php?page=login' } }
    const observed = await decode((session) => publicBanList(session), response)
    assert.deepEqual(observed.data, expected, name)
  }
})
