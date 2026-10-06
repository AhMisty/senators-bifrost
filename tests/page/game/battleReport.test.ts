import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as library from '../../../src/index.ts'
import type { Page, PublicBattleReportPage, BattleReportPage } from '../../../src/index.ts'
import {
  ErrorCode,
  parsePage,
  battleReport as requestBattleReport,
  publicBattleReport,
  readBattleReport,
  readPublicBattleReport,
} from '../../../src/index.ts'
import {
  battleReport,
  battleReportMaskedCoordinates,
  battleReportPrivateRounds,
  battleReportPublic,
  reportNotFound,
} from '../../fixtures/game/social.ts'
import {
  BASE_URL,
  decode,
  fakeServer,
  gamePage,
  htmlResponse,
  httpResponse,
  pageHtml,
  pageReply,
  sessionOn,
} from '../../helpers.ts'

const PRIVATE_URL = `${BASE_URL}game.php?raport=abc123&page=raport`
const PUBLISHED_URL = `${BASE_URL}game.php?raport=abc123&page=raport&mode=battlehall`

function pageOf(content: string, url = PRIVATE_URL): Page {
  return parsePage(httpResponse({ body: gamePage(content) }, url))
}

function bareOf(content: string): Page {
  return parsePage(httpResponse({ body: pageHtml(content) }, PRIVATE_URL))
}

const MODE_FIELDS: ReadonlySet<string> = new Set(['kind', 'attackerText', 'defenderText'])

function battleFields(document: BattleReportPage | PublicBattleReportPage): [string, unknown][] {
  return Object.entries(document).filter(([field]) => !MODE_FIELDS.has(field))
}

const SOUND_UNIT =
  '<div class="img_unit"><img src="gebaeude/202.gif"></div>' +
  '<span data-real="10">10</span><span class="destruct_unit">-2</span>'

function halfRenderedBattle(unit: string, roundId: string | null = 'round_0'): string {
  return [
    '<div id="content_battle">',
    '<div id="raports">',
    `<div class="batle_round"${roundId === null ? '' : ` id="${roundId}"`}>`,
    '<div class="batle_round_info"><h2>Round 1</h2></div>',
    '<div class="batle_part_att"><div class="batle_mem">',
    '<div class="batle_mem_header"><span>AhMisty</span> [1:2:3]</div>',
    `<div class="batle_mem_content"><div class="batle_unit">${unit}</div></div>`,
    '</div></div>',
    '</div>',
    '</div>',
    '<div class="batle_round_info"><h2>Defender won</h2></div>',
    '<div class="band_itog" data-tooltip-content="Lost: 2 / 0"></div>',
    '<div class="batle_text">Debris: none</div>',
    '</div>',
  ].join('')
}

void test('the module publishes the two readers and the two page functions', () => {
  const published: [string, unknown][] = [
    ['battleReport', requestBattleReport],
    ['publicBattleReport', publicBattleReport],
    ['readBattleReport', readBattleReport],
    ['readPublicBattleReport', readPublicBattleReport],
  ]
  const exported = Object.keys(library)
  for (const [name, value] of published) {
    assert.ok(exported.includes(name), name)
    assert.equal(typeof value, 'function', name)
  }
  assert.equal(library.battleReport, requestBattleReport)
  assert.equal(library.publicBattleReport, publicBattleReport)
  assert.equal(library.readBattleReport, readBattleReport)
  assert.equal(library.readPublicBattleReport, readPublicBattleReport)
})

void test('a private report is decoded from the rounds the page printed', () => {
  assert.deepEqual(readBattleReport(pageOf(battleReport)), {
    kind: 'battleReport',
    observedAtMs: 1,
    reportId: 'abc123',
    occurredAtText: '01.01.2026 12:00:00',
    rounds: [
      {
        round: 0,
        attackers: [
          {
            name: 'AhMisty',
            coordinate: { galaxy: 1, system: 2, planet: 3 },
            bonuses: ['+10%', '+5%'],
            ships: [
              {
                elementId: 202,
                amount: 10,

                destroyedAmount: 2,
                attributes: [
                  { name: 'Weapon', amount: 120 },
                  { name: 'Shield', amount: 10 },
                ],
              },
            ],
          },
        ],
        defenders: [
          {
            name: 'Scout',

            coordinate: { galaxy: 1, system: 2, planet: 4 },
            bonuses: [],
            ships: [
              {
                elementId: 401,
                amount: 40,
                destroyedAmount: 0,
                attributes: [{ name: 'Weapon', amount: 50 }],
              },
            ],
          },
        ],
      },
    ],
    outcomeText: 'Defender won',

    lossesText: 'Lost: 2 / 0',
    aftermathText: 'Debris: 300 metal, 150 crystal',
  })
})

void test('the report id is read back from the address, which the document never prints', () => {
  assert.equal(readBattleReport(pageOf(battleReport)).reportId, 'abc123')
  assert.equal(readPublicBattleReport(pageOf(battleReport, PUBLISHED_URL)).reportId, 'abc123')

  assert.throws(() => readBattleReport(pageOf(battleReport, `${BASE_URL}game.php?page=raport`)), {
    code: ErrorCode.ParseError,
    message: 'Missing raport parameter',
  })
})

void test('battle reports omit navigation context', () => {
  assert.equal('planetId' in readBattleReport(pageOf(battleReport)), false)
  assert.equal('planetId' in readBattleReport(bareOf(battleReport)), false)
})

void test('a private report prints no time and masks nothing', () => {
  const document = readBattleReport(pageOf(battleReportPrivateRounds))

  assert.equal(document.occurredAtText, null)
  assert.deepEqual(document.rounds, [
    {
      round: 0,
      attackers: [
        {
          name: 'AhMisty',
          coordinate: { galaxy: 1, system: 2, planet: 3 },
          bonuses: ['+140%', '+130%', '+120%'],

          ships: [],
        },
      ],
      defenders: [
        {
          name: 'Scout',
          coordinate: { galaxy: 4, system: 5, planet: 6 },
          bonuses: ['+80%', '+80%', '+80%'],
          ships: [],
        },
      ],
    },
  ])
  assert.equal(document.outcomeText, 'Defender won')
  assert.equal(document.aftermathText, 'Debris: 300 metal, 150 crystal')
})

void test('a published report carries the two parties and masks every coordinate', () => {
  assert.deepEqual(readPublicBattleReport(pageOf(battleReportMaskedCoordinates, PUBLISHED_URL)), {
    kind: 'publicBattleReport',
    observedAtMs: 1,
    reportId: 'abc123',

    attackerText: 'AhMisty',
    defenderText: 'Scout',
    occurredAtText: '01.01.2026 12:00:00',
    rounds: [
      {
        round: 0,
        attackers: [
          {
            name: 'AhMisty',

            coordinate: null,
            bonuses: ['+140%', '+130%', '+120%'],
            ships: [
              {
                elementId: 202,
                amount: 1000,
                destroyedAmount: 250,

                attributes: [
                  { name: 'Weapon:', amount: 120 },
                  { name: 'Shield:', amount: 10 },
                  { name: 'Armour:', amount: 4000 },
                ],
              },
            ],
          },
        ],
        defenders: [
          {
            name: 'Scout',
            coordinate: null,
            bonuses: ['+80%', '+80%', '+80%'],
            ships: [
              {
                elementId: 401,
                amount: 40,
                destroyedAmount: 0,
                attributes: [{ name: 'Weapon:', amount: 50 }],
              },
            ],
          },
        ],
      },
    ],
    outcomeText: 'Both sides won',
    lossesText: 'Attacker lost units 1.250 units Defender lost units 0 units',
    aftermathText: 'Attacker lost 1.250 units, defender lost 0 units',
  })
})

void test('both modes decode the same stored battle through one reader', () => {
  for (const fixture of [battleReport, battleReportMaskedCoordinates]) {
    const document = pageOf(fixture)
    const priv = readBattleReport(document)
    const published = readPublicBattleReport(document)
    assert.deepEqual(battleFields(priv), battleFields(published))
    assert.equal(priv.kind, 'battleReport')
    assert.equal(published.kind, 'publicBattleReport')
  }

  const header = readPublicBattleReport(pageOf(battleReport))
  assert.equal(header.attackerText, 'AhMisty')
  assert.equal(header.defenderText, 'Scout')
})

void test('the installed server public report needs no separate party header', () => {
  const start = battleReportMaskedCoordinates.indexOf('<div id="batle_top_nav">')
  const rounds = battleReportMaskedCoordinates.indexOf('<div id="raports">')
  if (start < 0 || rounds < start) throw new Error('Fixture has no opening round')
  const currentReport =
    battleReportMaskedCoordinates.slice(0, start) + battleReportMaskedCoordinates.slice(rounds)
  const report = readPublicBattleReport(pageOf(currentReport))
  assert.equal(report.attackerText, 'AhMisty')
  assert.equal(report.defenderText, 'Scout')
  assert.equal(report.occurredAtText, null)
})

void test('a report that lists no round is decoded as an empty battle', () => {
  const document = readBattleReport(pageOf(battleReportPublic))
  assert.deepEqual(document.rounds, [])

  assert.equal(document.occurredAtText, '01.01.2026')
  assert.equal(document.outcomeText, 'Attacker won')
  assert.equal(document.lossesText, 'Lost: 1')
  assert.equal(document.aftermathText, 'Debris: none')

  assert.throws(() => readPublicBattleReport(pageOf(battleReportPublic)), {
    code: ErrorCode.ParseError,
    message: 'Expected both battle parties in the opening round',
  })
})

void test('the outcome is the container’s own heading, not the one a round prints', () => {
  const document = readBattleReport(pageOf(halfRenderedBattle(SOUND_UNIT)))
  assert.equal(document.outcomeText, 'Defender won')
  assert.deepEqual(document.rounds, [
    {
      round: 0,
      attackers: [
        {
          name: 'AhMisty',
          coordinate: { galaxy: 1, system: 2, planet: 3 },
          bonuses: [],

          ships: [{ elementId: 202, amount: 10, destroyedAmount: 2, attributes: [] }],
        },
      ],

      defenders: [],
    },
  ])
})

void test('a battle the template rendered incomplete is a decoding failure', () => {
  const icon = '<div class="img_unit"><img src="gebaeude/202.gif"></div>'

  const withoutDestruction = halfRenderedBattle(`${icon}<span data-real="10">10</span>`)
  const broken: [string, string, string][] = [
    ['no battle container', '<p>Nothing here</p>', 'Expected one #content_battle, found 0'],
    [
      'a round without the number the template keys it by',
      halfRenderedBattle(SOUND_UNIT, null),
      'Expected a numeric value',
    ],
    [
      'a unit icon that names no element',
      halfRenderedBattle(
        '<div class="img_unit"><img src="ship/202.gif"></div>' +
          '<span data-real="10">10</span><span class="destruct_unit">-2</span>',
      ),
      'Missing element image',
    ],
    [
      'a unit without the count the template binds',
      halfRenderedBattle(`${icon}<span class="destruct_unit">-2</span>`),
      'Missing data-real on the selected element',
    ],
    [
      'a count that is not a rendered quantity',
      halfRenderedBattle(
        `${icon}<span data-real="ten">ten</span><span class="destruct_unit">-2</span>`,
      ),
      'Invalid formatted quantity',
    ],
    ['a unit without its destruction figure', withoutDestruction, 'Missing destroyed unit count'],
  ]
  for (const [name, body, message] of broken)
    assert.throws(
      () => readBattleReport(pageOf(body)),
      { code: ErrorCode.ParseError, message },
      name,
    )
  assert.throws(() => readBattleReport(pageOf(withoutDestruction)), {
    code: ErrorCode.ParseError,
    message: 'Missing destroyed unit count',
  })
})

void test('a round stating one party cannot be read as a published report', () => {
  assert.throws(() => readPublicBattleReport(pageOf(halfRenderedBattle(SOUND_UNIT))), {
    code: ErrorCode.ParseError,
    message: 'Expected both battle parties in the opening round',
  })
})

void test('a document that renders no battle is a decoding failure rather than a receipt', async () => {
  await assert.rejects(
    () =>
      requestBattleReport(sessionOn(fakeServer(pageReply(gamePage('<p>Nothing here</p>')))), {
        reportId: 'abc123',
      }),
    { code: ErrorCode.ParseError, message: 'Expected one #content_battle, found 0' },
  )
})

void test('the private report is asked for at the address the message link prints', async () => {
  const server = fakeServer(pageReply(gamePage(battleReport)))
  const observed = await requestBattleReport(sessionOn(server), { reportId: 'abc123' })
  assert.equal(server.requests.length, 1)

  assert.equal(server.requests[0]!.url.href, PRIVATE_URL)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.body, null)
  const document = observed.data
  if (document.kind !== 'battleReport')
    assert.fail(`expected a report, answered with the ${document.kind} receipt`)
  assert.equal(document.reportId, 'abc123')
  assert.equal(document.rounds.length, 1)
})

void test('the published report is asked for at the address the battle hall links to', async () => {
  const server = fakeServer(pageReply(gamePage(battleReportMaskedCoordinates)))
  const observed = await publicBattleReport(sessionOn(server), { reportId: 'abc123' })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.url.href, PUBLISHED_URL)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.body, null)
  const document = observed.data
  if (document.kind !== 'publicBattleReport')
    assert.fail(`expected a published report, answered with the ${document.kind} receipt`)
  assert.equal(document.attackerText, 'AhMisty')
  assert.equal(document.defenderText, 'Scout')
})

void test('a report the server does not hold is reported as the message page, not thrown', async () => {
  const observed = await decode(
    (session) => requestBattleReport(session, { reportId: 'gone' }),
    htmlResponse(reportNotFound),
  )
  assert.deepEqual(observed.data, { kind: 'message', message: 'Report not found' })
})

void test('a battle the caller lost contact with is the same message receipt', async () => {
  const observed = await decode(
    (session) => publicBattleReport(session, { reportId: 'gone' }),
    pageReply(gamePage('<div class="ally_contents">The battle is no longer available</div>')),
  )
  assert.deepEqual(observed.data, { kind: 'message', message: 'The battle is no longer available' })
})
