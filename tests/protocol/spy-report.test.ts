import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as DomUtils from 'domutils'

import type { Page } from '../../src/index.ts'
import { ErrorCode, parsePage, parseSpyReport, readSpyReports } from '../../src/index.ts'
import { spyReport, spyReportWithoutSimulatorLink } from '../fixtures/game/social.ts'
import {
  spyReportWithDuplicateSimulatorId,
  spyReportWithForeignHeadClass,
  spyReportWithIncompleteRow,
  spyReportWithMismatchedSimulatorCount,
  spyReportWithNestedContainer,
  spyReportWithoutHeadClass,
  twoSpyReports,
} from '../fixtures/shared/spyReport.ts'
import { BASE_URL, PLANET_ID, httpResponse, pageHtml } from '../helpers.ts'

const GAME_URL = `${BASE_URL}game.php?page=overview&cp=${PLANET_ID}`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body }, GAME_URL))
}

function reportsIn(body: string) {
  const page = pageOf(body)
  return readSpyReports(page, page.$('body'))
}

void test('a report is read from the cells it displays and the link it carries', () => {
  assert.deepEqual(reportsIn(spyReport), [
    {
      title: 'Spy on 1:2:3',

      target: { galaxy: 1, system: 2, planet: 3, type: 1 },
      systemUrl: `${BASE_URL}game.php?page=galaxy&galaxy=1&system=2`,
      groups: [
        {
          classId: 0,
          name: 'Buildings',
          entries: [
            { name: 'Metal Mine', amount: 5 },
            { name: 'Crystal Mine', amount: 3 },
          ],
        },
        { classId: 200, name: 'Ships', entries: [{ name: 'Small Cargo', amount: 1000 }] },
      ],

      elements: new Map([
        [1, 5],
        [2, 3],
        [202, 1000],
      ]),
      footer: 'Attack Probes lost: 1 Simulate',
    },
  ])
})

void test('a report with no simulator link reports the figures it displays', () => {
  const report = reportsIn(spyReportWithoutSimulatorLink)[0]!
  assert.deepEqual(report.groups, [
    {
      classId: 400,
      name: 'Defense',

      entries: [{ name: 'Rocket Launcher', amount: 1234 }],
    },
  ])
  assert.deepEqual(report.elements, new Map())
  assert.deepEqual(report.target, { galaxy: 1, system: 2, planet: 3, type: 1 })
  assert.equal(report.systemUrl, `${BASE_URL}game.php?page=galaxy&galaxy=1&system=2`)
  assert.equal(report.footer, 'Attack Nothing to report')
})

void test('ambiguous or missing report links are parse failures', () => {
  const twoLinks = spyReport.replace(
    'Spy on 1:2:3</a>',
    'Spy on 1:2:3</a><a href="game.php?page=galaxy&amp;galaxy=2">2:3:4</a>',
  )
  assert.throws(() => reportsIn(twoLinks), { code: ErrorCode.ParseError })
  assert.throws(() => reportsIn(spyReport.replace('target_mission=1', 'mission=1')), {
    code: ErrorCode.ParseError,
  })
})

void test('inconsistent or ambiguous simulator data is a parse failure', () => {
  assert.throws(() => reportsIn(spyReportWithDuplicateSimulatorId), {
    code: ErrorCode.ParseError,
    message: 'Duplicate spy element',
  })
  assert.throws(() => reportsIn(spyReportWithMismatchedSimulatorCount), {
    code: ErrorCode.ParseError,
    message: 'Inconsistent spy quantities',
  })
  const page = pageOf(spyReport)
  const simulator = page.$('a[href*="page=battleSimulator"]')
  const anchor = simulator.node()
  assert.ok(anchor)
  DomUtils.append(anchor, anchor.cloneNode(true))
  assert.throws(() => readSpyReports(page, page.$('body')), {
    code: ErrorCode.ParseError,
    message: 'Ambiguous spy simulator link',
  })
})

void test('a cell belongs to the innermost container that holds it', () => {
  const report = reportsIn(spyReportWithNestedContainer)[0]!

  assert.deepEqual(report.groups, [
    { classId: 0, name: 'Buildings', entries: [] },
    { classId: 1, name: 'Moon', entries: [{ name: 'Metal Store', amount: 2 }] },
  ])
})

void test('a row whose cells do not pair up cannot be read as an entry', () => {
  assert.throws(() => reportsIn(spyReportWithIncompleteRow), {
    code: ErrorCode.ParseError,
    message: 'Incomplete spy report entries',
  })
})

void test('a container that names no element category is a decoding failure', () => {
  for (const [name, body] of [
    ['no class at all', spyReportWithoutHeadClass],
    ['a class that names no id', spyReportWithForeignHeadClass],
  ] as const)
    assert.throws(
      () => reportsIn(body),
      { code: ErrorCode.ParseError, message: 'Expected a numeric value' },
      name,
    )
})

void test('every report a message body holds is read', () => {
  const reports = reportsIn(twoSpyReports)
  assert.equal(reports.length, 2)
  assert.deepEqual(
    reports.map((report) => report.title),
    ['Spy on 1:2:3', 'Spy on 1:2:3'],
  )
  assert.deepEqual(
    reports.map((report) => report.groups[0]!.classId),
    [0, 400],
  )
})

void test('a body that carries no report reports none', () => {
  assert.deepEqual(reportsIn('<div class="message_text">Nothing here</div>'), [])
})

void test('the report a caller reaches without asking for a page is read from its response', () => {
  const report = parseSpyReport(httpResponse({ body: pageHtml(spyReport) }))[0]!
  assert.equal(report.title, 'Spy on 1:2:3')
  assert.equal(report.elements.get(202), 1000)
})

void test('a response that carries no markup reports no report rather than refusing', () => {
  assert.deepEqual(parseSpyReport(httpResponse({})), [])
  assert.deepEqual(
    parseSpyReport(
      httpResponse({ status: 302, body: '', headers: { Location: './index.php?page=login' } }),
    ),
    [],
  )
})

void test('a report the caller holds is decoded on the response it links against', () => {
  const elsewhere = parsePage(
    httpResponse({ body: pageHtml(spyReport) }, 'https://other.example.com/index.php'),
  )
  const report = readSpyReports(elsewhere, elsewhere.$('body'))[0]!
  assert.equal(report.systemUrl, 'https://other.example.com/game.php?page=galaxy&galaxy=1&system=2')
})
