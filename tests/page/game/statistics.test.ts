import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page, StatisticsPage } from '../../../src/index.ts'
import { ErrorCode, parsePage, readStatistics, statistics } from '../../../src/index.ts'
import { statisticsAlliancesPage, statisticsPlayersPage } from '../../fixtures/game/social.ts'
import {
  BASE_URL,
  decode,
  expectOperation,
  gamePage,
  httpResponse,
  pageHtml,
  pageReply,
} from '../../helpers.ts'

const STATISTICS_URL = `${BASE_URL}game.php?page=statistics`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body }, STATISTICS_URL))
}

void test('the player ranking is read from the rows it renders', async () => {
  const observed = await decode(
    (session) => statistics(session),
    pageReply(gamePage(statisticsPlayersPage)),
  )
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'statistics',

    observedAtMs: observed.response.observedAtMs,

    entityType: 1,
    rankingType: 1,
    startRank: 1,

    filters: {
      entityTypes: [
        { value: 1, label: 'Players' },
        { value: 2, label: 'Alliances' },
      ],
      rankingTypes: [
        { value: 1, label: 'Points' },
        { value: 2, label: 'Fleets' },
        { value: 3, label: 'Research' },
      ],
      rankRanges: [
        { value: 1, label: '1-100' },
        { value: 101, label: '101-200' },
      ],
    },
    rows: [
      {
        rank: 1,

        change: '*',
        id: 4242,

        name: 'AhMisty',
        points: 1234567,
        alliance: 'Void Runners',

        members: null,
        pointsPerMember: null,
      },
      {
        rank: 2,
        change: '-2',
        id: 77,
        name: 'Scout',
        points: 9876,
        alliance: '-',
        members: null,
        pointsPerMember: null,
      },
    ],
  })
})

void test('the alliance ranking is read from a different table', () => {
  const document: StatisticsPage = readStatistics(pageOf(gamePage(statisticsAlliancesPage)))
  assert.equal(document.entityType, 2)
  assert.deepEqual(document.rows, [
    {
      rank: 1,
      change: '+2',
      id: 7,
      name: 'Void Runners',
      points: 1234567,

      alliance: null,
      members: 12,
      pointsPerMember: 102880,
    },
  ])
})

void test('a ranking the response carries no planet for reports none', () => {
  const document = readStatistics(pageOf(pageHtml(statisticsPlayersPage)))
  assert.equal('planetId' in document, false)
  assert.equal(document.rows.length, 2)
})

void test('a row whose own control names no player is reported without one', () => {
  const withoutId = statisticsPlayersPage.replace(
    'onclick="return Dialog.Playercard(77, \'Scout\');"',
    'onclick="return Dialog.info(77);"',
  )
  assert.deepEqual(
    readStatistics(pageOf(gamePage(withoutId))).rows.map((row) => row.id),
    [4242, null],
  )
})

void test('an alliance row whose link names no alliance is a decoding failure', () => {
  const withoutId = statisticsAlliancesPage.replace(
    'href="game.php?page=alliance&amp;mode=info&amp;id=7"',
    'href="game.php?page=alliance&amp;mode=info"',
  )
  assert.throws(() => readStatistics(pageOf(gamePage(withoutId))), {
    code: ErrorCode.ParseError,
    message: 'Missing id on the link',
  })
})

void test('the ranking a response states is the one the selectors settled on', () => {
  const second = statisticsPlayersPage
    .replace(
      '<option value="1" selected="selected">Points</option>',
      '<option value="1">Points</option>',
    )
    .replace(
      '<option value="2">Fleets</option>',
      '<option value="2" selected="selected">Fleets</option>',
    )
    .replace(
      '<option value="1" selected="selected">1-100</option>',
      '<option value="1">1-100</option>',
    )
    .replace(
      '<option value="101">101-200</option>',
      '<option value="101" selected="selected">101-200</option>',
    )
  const document = readStatistics(pageOf(gamePage(second)))
  assert.equal(document.rankingType, 2)
  assert.equal(document.startRank, 101)
  assert.equal(document.entityType, 1)
})

void test('a ranking whose selectors state no single value cannot be read', () => {
  const missing = statisticsPlayersPage.replace(
    '<select name="who" id="who" onchange="$(\'#stats\').submit();"><option value="1" selected="selected">Players</option><option value="2">Alliances</option></select>',
    '<select name="who" id="who" onchange="$(\'#stats\').submit();"></select>',
  )
  assert.throws(() => readStatistics(pageOf(gamePage(missing))), {
    code: ErrorCode.ParseError,
    message: 'Expected a numeric value',
  })
})

void test('a ranking the caller narrows is asked for by the parameters the selectors carry', async () => {
  await expectOperation((session) => statistics(session), { url: STATISTICS_URL })
  await expectOperation((session) => statistics(session, { entityType: 2, rankRange: 101 }), {
    url: `${BASE_URL}game.php?who=2&range=101&page=statistics`,
  })
})
