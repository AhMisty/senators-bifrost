import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import { ErrorCode, banList, parsePage, readBanList } from '../../../src/index.ts'
import { banListEmpty, banListPage, banListWithoutContactLink } from '../../fixtures/game/social.ts'
import {
  BASE_URL,
  decode,
  expectOperation,
  gamePage,
  httpResponse,
  pageHtml,
  pageReply,
} from '../../helpers.ts'

const BAN_URL = `${BASE_URL}game.php?page=banList`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body }, BAN_URL))
}

function popup(body: string): string {
  return pageHtml(`<div id="content">${body}</div>`)
}

void test('the ban list is read row by row, with the page the paginator marked', async () => {
  const observed = await decode((session) => banList(session), pageReply(gamePage(banListPage)))
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'banList',

    observedAtMs: observed.response.observedAtMs,

    page: 2,
    pageCount: 3,
    bans: [
      {
        startsAtText: '01.01.2026 12:00:00',
        expiresAtText: '08.01.2026 12:00:00',
        playerName: 'Scout',
        administrator: 'AhMisty',
        reason: 'Multi account',

        contact: 'mailto:admin@example.com',
      },
      {
        startsAtText: '02.01.2026 08:00:00',
        expiresAtText: '02.01.2026 20:00:00',
        playerName: 'Pilot',
        administrator: 'Moderator',
        reason: 'Insults',
        contact: 'mailto:mod@example.com',
      },
    ],
  })
})

void test('an administrator cell without a link names no address to write to', () => {
  const document = readBanList(pageOf(popup(banListWithoutContactLink)))
  assert.deepEqual(document.bans, [
    {
      startsAtText: '01.01.2026 12:00:00',
      expiresAtText: '08.01.2026 12:00:00',
      playerName: 'Scout',
      administrator: 'AhMisty',
      reason: 'Multi account',
      contact: null,
    },
  ])

  assert.equal(document.page, 1)
  assert.equal(document.pageCount, 1)
})

void test('a universe with no ban reads as an empty first page', () => {
  const document = readBanList(pageOf(popup(banListEmpty)))
  assert.deepEqual(document.bans, [])
  assert.equal(document.page, 1)
  assert.equal(document.pageCount, 1)
})

void test('the bans are the universe’s, so a response without a planet reports none', () => {
  const document = readBanList(pageOf(popup(banListPage)))
  assert.equal('planetId' in document, false)
  assert.equal(document.bans.length, 2)
})

void test('a response that is not the ban list is refused', () => {
  assert.throws(() => readBanList(pageOf(popup('<div>Nothing here</div>'))), {
    code: ErrorCode.ParseError,
    message: 'Expected one #content table.tabstatistica, found 0',
  })
})

void test('another page of the list is asked for by the parameter the paginator links to', async () => {
  await expectOperation((session) => banList(session), { url: BAN_URL })
  await expectOperation((session) => banList(session, { page: 3 }), {
    url: `${BASE_URL}game.php?side=3&page=banList`,
  })
})
