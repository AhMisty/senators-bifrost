import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { BonusSummaryPage } from '../../../src/index.ts'
import { ErrorCode, bonusSummary } from '../../../src/index.ts'
import { bonusSummaryBody, bonusSummaryRowWithoutIconBody } from '../../fixtures/game/growth.ts'
import {
  BASE_URL,
  fakeServer,
  gamePage,
  pageHtml,
  pageReply,
  sessionOn,
  DEFAULT_HEADER,
} from '../../helpers.ts'

const PAGE_URL = `${BASE_URL}game.php?page=infobonus`

function summaryOf(answer: Awaited<ReturnType<typeof bonusSummary>>): BonusSummaryPage {
  const data = answer.data
  if (data.kind !== 'bonusSummary')
    assert.fail(`expected the bonus summary, answered with ${data.kind}`)
  return data
}

void test('a summary about the account is read without naming a planet', async () => {
  const server = fakeServer(pageReply(gamePage(bonusSummaryBody, { header: DEFAULT_HEADER })))
  const answer = await bonusSummary(sessionOn(server))
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, PAGE_URL)
  const summary = summaryOf(answer)
  assert.equal(summary.kind, 'bonusSummary')
  assert.equal('planetId' in summary, false)
})

void test('the account summary omits the navigation planet', async () => {
  const server = fakeServer(
    pageReply(gamePage(bonusSummaryBody, { planetId: 4242, header: DEFAULT_HEADER })),
  )
  const answer = await bonusSummary(sessionOn(server))
  assert.equal(server.requests[0]!.url.href, PAGE_URL)
  assert.equal('planetId' in summaryOf(answer), false)
})

void test('a summary row states the bonus it is about and the two figures it prints', async () => {
  const summary = summaryOf(
    await bonusSummary(
      sessionOn(fakeServer(pageReply(gamePage(bonusSummaryBody, { header: DEFAULT_HEADER })))),
    ),
  )
  assert.deepEqual(summary.entries, [
    { key: 'Attack', name: 'Attack', percent: 200, factor: 2 },
    { key: 'Sfleet', name: 'Fleet speed', percent: 10, factor: 0 },
  ])
})

void test('a row that states no bonus is a decoding failure rather than another bonus', async () => {
  await assert.rejects(
    () =>
      bonusSummary(
        sessionOn(
          fakeServer(
            pageReply(gamePage(bonusSummaryRowWithoutIconBody, { header: DEFAULT_HEADER })),
          ),
        ),
      ),
    { code: ErrorCode.ParseError, message: 'Invalid bonus summary row' },
  )
})

void test('a row whose cells are not the summary’s four is a decoding failure', async () => {
  const threeCells = bonusSummaryRowWithoutIconBody.replace(
    '<td class="classstat10">Fleet speed</td>',
    '',
  )
  await assert.rejects(
    () =>
      bonusSummary(
        sessionOn(fakeServer(pageReply(gamePage(threeCells, { header: DEFAULT_HEADER })))),
      ),
    { code: ErrorCode.ParseError, message: 'Invalid bonus summary row' },
  )
})

void test('a response that names no planet reports none', async () => {
  const body = pageHtml(`<div id="content">${bonusSummaryBody}</div>`)
  const summary = summaryOf(await bonusSummary(sessionOn(fakeServer(pageReply(body)))))
  assert.equal('planetId' in summary, false)
  assert.equal(summary.entries.length, 2)
})

void test('a row whose icon is not a bonus icon is a decoding failure', async () => {
  const renamed = bonusSummaryBody.replace('bonus/Attack.gif', 'gebaeude/601.gif')
  await assert.rejects(
    () =>
      bonusSummary(sessionOn(fakeServer(pageReply(gamePage(renamed, { header: DEFAULT_HEADER }))))),
    { code: ErrorCode.ParseError, message: 'Invalid bonus summary row' },
  )
})

void test('a page without the summary table is a decoding failure', async () => {
  await assert.rejects(
    () => bonusSummary(sessionOn(fakeServer(pageReply(gamePage('<p>nothing here</p>'))))),
    { code: ErrorCode.ParseError, message: 'Expected one #content table.tabstatistica, found 0' },
  )
})
