import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { InformationPage } from '../../../src/index.ts'
import {
  ErrorCode,
  information,
  informationDestroyMissiles,
  informationSendFleet,
  parsePage,
  readInformation,
} from '../../../src/index.ts'
import * as informationModule from '../../../src/page/game/information.ts'
import {
  informationPageContent,
  productionTable,
  rapidfireCard,
  rapidfireRow,
  shipInfo,
  shipInfoWithoutIcons,
  storageTable,
  tableCell,
  tableRow,
} from '../../fixtures/game/economy.ts'
import {
  jumpGateCooldownBody,
  jumpGateCountdownWithoutWaitBody,
  jumpGateNoTargetBody,
  jumpGateReadyBody,
} from '../../fixtures/game/space.ts'
import {
  BASE_URL,
  PLANET_ID,
  fakeServer,
  gamePage,
  httpResponse,
  jsonResponse,
  pageHtml,
  pageReply,
  sessionOn,
} from '../../helpers.ts'

const NAME = 'Metal Mine'

const DESCRIPTION = 'Produces metal.'

function elementUrl(elementId: number, planetId: number = PLANET_ID): string {
  return `${BASE_URL}game.php?id=${elementId}&page=information&cp=${planetId}`
}

function elementDocument(
  elementId: number,
  name: string,
  parts: string,
  description: string = DESCRIPTION,
): string {
  return informationPageContent(elementId, name, description, parts)
}

function decoded(body: string, elementId = 1): InformationPage {
  return readInformation(parsePage(httpResponse({ body }, elementUrl(elementId))))
}

function tableWithForeignHeaderIcon(): string {
  return (
    '<table><tbody>' +
    '<tr><th><img src="dpath/img/title/information.png">Metal</th>' +
    '<th><img src="dpath/img/resources/902f.png">Crystal</th></tr>' +
    tableRow('1', tableCell('1.000', 'lime') + tableCell('0', 'white')) +
    '</tbody></table>'
  )
}

function missileRow(id: number, name: string, amount: string): string {
  return (
    `<tr><td>${name}</td><td><span id="missile_${id}">${amount}</span></td>` +
    `<td><input class="missile" type="text" name="missile[${id}]" placeholder="0"></td></tr>`
  )
}

function missileTable(interceptor: string, interplanetary: string): string {
  return (
    '<table style="width:100%;">' +
    '<tr><th>Missile type</th><th>Number of Missiles avaliable</th><th>Destroy:</th></tr>' +
    missileRow(502, 'Interceptor', interceptor) +
    missileRow(503, 'Interplanetary missiles', interplanetary) +
    '<tr><td colspan="3"><input type="button" value="Destroy:" onclick="DestroyMissiles();"></td></tr>' +
    '</table>'
  )
}

void test('an element page reports the element, its text and the table it renders', () => {
  const page = decoded(gamePage(elementDocument(1, NAME, productionTable())))
  assert.deepEqual(page, {
    kind: 'information',

    observedAtMs: 1,
    elementId: 1,
    name: NAME,
    description: DESCRIPTION,

    rapidfire: { to: new Map(), from: new Map() },
    tables: [
      {
        headers: [
          ['', 'Metal', 'Crystal'],
          ['Level', 'Production per hour', 'Difference', 'Production per hour', 'Difference'],
        ],
        rows: [
          ['3', '1.020', '0', '510', '0'],
          ['4', '1.080', '60', '540', '30'],
        ],

        resourceIds: [901, 902],
      },
    ],
    attributes: [],
    gate: null,
    missiles: null,
  })
})

void test('the storage block is read from the inner table its wrapper holds', () => {
  const { tables } = decoded(gamePage(elementDocument(25, 'Metal Store', storageTable())))
  assert.equal(tables.length, 1)
  assert.deepEqual(tables[0]!.headers, [
    ['Level', 'Metal', 'Crystal', 'Deuterium'],
    ['', 'Storage', 'Difference', 'Storage', 'Difference', 'Storage', 'Difference'],
  ])
  assert.deepEqual(tables[0]!.rows, [
    ['2', '100.000', '0', '100.000', '0', '50.000', '0'],
    ['3', '200.000', '100.000', '200.000', '100.000', '100.000', '50.000'],
  ])

  assert.deepEqual(tables[0]!.resourceIds, [])
})

void test('a header icon that names no element attributes no resource', () => {
  const { tables } = decoded(gamePage(elementDocument(1, NAME, tableWithForeignHeaderIcon())))
  assert.deepEqual(tables[0]!.resourceIds, [902])
})

void test('a ship page reports its cards and both directions of its rapid fire', () => {
  const page = decoded(
    gamePage(elementDocument(202, 'Small Cargo', shipInfo, 'A small ship.')),
    202,
  )
  assert.equal(page.name, 'Small Cargo')
  assert.equal(page.description, 'A small ship.')
  assert.deepEqual(page.attributes, [
    { name: 'Hull', text: '400', icon: 'd_light.png' },
    { name: 'Shield', text: '10', icon: 's_light.png' },
    { name: 'Engine', text: '12.500', icon: 'comb.png' },
    { name: 'Consumption', text: '20', icon: 'consumption.png' },
    { name: 'Capacity', text: '5.000', icon: 'capacity.png' },
  ])

  assert.deepEqual(
    page.rapidfire.to,
    new Map([
      [215, 10],
      [217, 5],
    ]),
  )
  assert.deepEqual(page.rapidfire.from, new Map([[226, 5]]))
})

void test('two badges of one direction beside one element are a decoding failure', () => {
  const twice = rapidfireRow(
    rapidfireCard(215, 'Battle Cruiser', '10', 'background-color-blue') +
      rapidfireCard(215, 'Battle Cruiser', '3', 'background-color-blue'),
    rapidfireCard(226, 'Destroyer', '5', 'background-color-red'),
  )
  assert.throws(() => decoded(gamePage(elementDocument(202, 'Small Cargo', twice)), 202), {
    code: ErrorCode.ParseError,
    message: 'Duplicate rapid fire entry',
  })
})

void test('a card that draws no icon of its own reports none', () => {
  const { attributes } = decoded(
    gamePage(elementDocument(202, 'Small Cargo', shipInfoWithoutIcons)),
    202,
  )
  assert.deepEqual(attributes, [
    { name: 'Hull', text: '400', icon: null },
    { name: 'Shield', text: '10', icon: null },
  ])
})

void test('a rapid fire badge without an element icon is a decoding failure', () => {
  const badge = '<span class="card-img-text background-color-blue opacity-70 tooltip">10</span>'
  const body = gamePage(elementDocument(202, 'Small Cargo', rapidfireRow(badge, '')))
  assert.throws(() => decoded(body, 202), {
    code: ErrorCode.ParseError,
    message: 'Missing element image',
  })
})

void test('a document that draws no element icon is a decoding failure', () => {
  const shell = informationPageContent(1, NAME, DESCRIPTION, productionTable())
  const icon = '<img src="dpath/gebaeude/1.gif" alt="">'

  const broken: [string, string, string][] = [
    [
      'an icon outside the element directories',
      '<img src="dpath/img/title/information.png" alt="">',
      'Missing element image',
    ],
    ['no icon at all', '', 'Missing element image'],
  ]
  for (const [name, replacement, message] of broken)
    assert.throws(
      () => decoded(gamePage(shell.replace(icon, replacement))),
      { code: ErrorCode.ParseError, message },
      name,
    )
})

void test('the gate block is read only where the document renders one', () => {
  assert.equal(decoded(gamePage(elementDocument(1, NAME, productionTable()))).gate, null)

  assert.equal(decoded(gamePage(elementDocument(43, 'Jump Gate', ''))).gate, null)
})

void test('a gate that recharges reports the wait and the moment it reopens', () => {
  const { gate } = decoded(gamePage(elementDocument(43, 'Jump Gate', jumpGateCooldownBody)), 43)
  assert.deepEqual(gate, {
    cooldownSeconds: 600,

    cooldownEndsAtText: 'Next jump possible in: 01.01.2026 12:00:00',

    targets: [],
    availableShips: null,
  })
})

void test('a gate that is ready reports the moons it may send to and the ships it holds', () => {
  const { gate } = decoded(gamePage(elementDocument(43, 'Jump Gate', jumpGateReadyBody)), 43)
  assert.deepEqual(gate, {
    cooldownSeconds: 0,
    cooldownEndsAtText: null,
    targets: [
      { planetId: 1001, label: '[1:2:4] Nova', coordinate: { galaxy: 1, system: 2, planet: 4 } },
      { planetId: 1002, label: '[1:2:5] Outpost', coordinate: { galaxy: 1, system: 2, planet: 5 } },
    ],

    availableShips: new Map([
      [202, 10],
      [210, 2],
    ]),
  })
})

void test('a gate that is ready without another moon reports no destination', () => {
  const { gate } = decoded(gamePage(elementDocument(43, 'Jump Gate', jumpGateNoTargetBody)), 43)
  assert.deepEqual(gate, {
    cooldownSeconds: 0,
    cooldownEndsAtText: null,
    targets: [],
    availableShips: null,
  })
})

void test('a countdown cell without the line beside it reports no reopening moment', () => {
  const { gate } = decoded(
    gamePage(elementDocument(43, 'Jump Gate', jumpGateCountdownWithoutWaitBody)),
    43,
  )
  assert.deepEqual(gate, {
    cooldownSeconds: 600,
    cooldownEndsAtText: null,
    targets: [],
    availableShips: null,
  })
})

void test('a destination that prints no coordinate reports none', () => {
  const body = gamePage(
    elementDocument(43, 'Jump Gate', jumpGateReadyBody.replace('[1:2:5] Outpost', 'Outpost')),
  )
  const { gate } = decoded(body, 43)
  assert.deepEqual(gate?.targets, [
    { planetId: 1001, label: '[1:2:4] Nova', coordinate: { galaxy: 1, system: 2, planet: 4 } },
    { planetId: 1002, label: 'Outpost', coordinate: null },
  ])
})

void test('the gate fields are read within the gate block rather than from the document', () => {
  const beside = `${jumpGateReadyBody}
    <table><tbody>
      <tr><td><select name="jmpto"><option value="2001">Elsewhere</option></select></td></tr>
      <tr><td><span id="ship299_value">7</span></td></tr>
      <tr><td><input name="ship[299]" value="0" type="text"></td></tr>
    </tbody></table>`
  const { gate } = decoded(gamePage(elementDocument(43, 'Jump Gate', beside)), 43)
  assert.deepEqual(
    gate?.targets.map(({ planetId }) => planetId),
    [1001, 1002],
  )
  assert.deepEqual(
    [...(gate?.availableShips ?? new Map())],
    [
      [202, 10],
      [210, 2],
    ],
  )
})

void test('a rendered value the reading needs is required to be stated', () => {
  const destination = jumpGateReadyBody.replace(
    '<option value="1002">[1:2:5] Outpost</option>',
    '<option>[1:2:5] Outpost</option>',
  )
  const transfer = jumpGateReadyBody.replace('<span id="ship210_value">2</span>', '')
  const stock = missileTable('1.500', '20').replace('<span id="missile_503">20</span>', '')
  const broken: [string, string, string][] = [
    [
      'a destination the gate may send to without its id',
      gamePage(elementDocument(43, 'Jump Gate', destination)),
      'Expected a numeric value',
    ],
    [
      'a transfer row without the amount beside it',
      gamePage(elementDocument(43, 'Jump Gate', transfer)),
      'Expected one #ship210_value, found 0',
    ],
    [
      'a silo row without the amount beside it',
      gamePage(elementDocument(44, 'Missile Silo', stock)),
      'Expected one #missile_503, found 0',
    ],
  ]
  for (const [name, body, message] of broken)
    assert.throws(() => decoded(body, 43), { code: ErrorCode.ParseError, message }, name)
})

void test('the silo page reports the missiles each of its rows states', () => {
  const page = decoded(
    gamePage(elementDocument(44, 'Missile Silo', missileTable('1.500', '20'), 'Holds missiles.')),
    44,
  )
  assert.deepEqual(
    page.missiles,
    new Map([
      [502, 1_500],
      [503, 20],
    ]),
  )

  assert.equal(page.gate, null)
})

void test('a document that renders no silo reports no missiles', () => {
  assert.equal(decoded(gamePage(elementDocument(1, NAME, productionTable()))).missiles, null)
})

void test('the gate is the same document as any other element, addressed by its id', async () => {
  const asked: { href: string; method: string }[] = []
  for (const elementId of [1, 43]) {
    const body = pageReply(gamePage(elementDocument(elementId, NAME, productionTable())))
    const server = fakeServer(body)
    const answer = await information(sessionOn(server), { planetId: PLANET_ID, elementId })
    assert.equal(answer.data.kind, 'information')
    asked.push({ href: server.requests[0]!.url.href, method: server.requests[0]!.method })
  }
  assert.deepEqual(asked, [
    { href: elementUrl(1), method: 'GET' },
    { href: elementUrl(43), method: 'GET' },
  ])
})

void test('element popup results omit planet context independently of navigation markup', () => {
  const shell = informationPageContent(1, NAME, DESCRIPTION, productionTable())
  const popup = pageHtml(shell)
  const addressed = httpResponse({ body: popup }, elementUrl(1, 1001))
  const reading = readInformation(parsePage(addressed))
  assert.equal('planetId' in reading, false)
  const marked = httpResponse({ body: gamePage(shell, { planetId: 999 }) }, elementUrl(1, 1001))
  const identified = readInformation(parsePage(marked))
  assert.equal('planetId' in identified, false)
  const unaddressed = httpResponse({ body: popup }, `${BASE_URL}game.php?id=1&page=information`)
  assert.equal('planetId' in readInformation(parsePage(unaddressed)), false)
})

void test('a jump is a POST naming the destination moon and every ship it moves', async () => {
  const server = fakeServer(jsonResponse('{"message":"The jump portal was used","error":false}'))
  const answer = await informationSendFleet(sessionOn(server), {
    origin: { planetId: PLANET_ID },
    target: { planetId: 1001 },
    ships: new Map([
      [202, 5],
      [210, 2],
    ]),
  })
  assert.deepEqual(answer.data, {
    kind: 'json',
    value: { message: 'The jump portal was used', error: false },
  })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'POST')
  assert.equal(
    server.requests[0]!.url.href,
    `${BASE_URL}game.php?page=information&cp=${PLANET_ID}&mode=sendFleet`,
  )

  assert.deepEqual(
    [...(server.requests[0]!.body ?? new URLSearchParams())],
    [
      ['ship[202]', '5'],
      ['ship[210]', '2'],
      ['jmpto', '1001'],
    ],
  )
})

void test('dismantling missiles is a POST naming each stock by its own field', async () => {
  const server = fakeServer(jsonResponse('[3,1]'))
  const answer = await informationDestroyMissiles(sessionOn(server), {
    planetId: PLANET_ID,
    missiles: new Map([
      [502, 3],
      [503, 1],
    ]),
  })

  assert.deepEqual(answer.data, { kind: 'json', value: ['3', '1'] })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'POST')
  assert.equal(
    server.requests[0]!.url.href,
    `${BASE_URL}game.php?page=information&cp=${PLANET_ID}&mode=destroyMissiles`,
  )
  assert.deepEqual(
    [...(server.requests[0]!.body ?? new URLSearchParams())],
    [
      ['missile[502]', '3'],
      ['missile[503]', '1'],
    ],
  )
})

void test('dismantling one missile stock sends zero for the other', async () => {
  const server = fakeServer(jsonResponse('[0,1]'))
  await informationDestroyMissiles(sessionOn(server), {
    planetId: PLANET_ID,
    missiles: new Map([[503, 1]]),
  })
  assert.deepEqual(
    [...(server.requests[0]!.body ?? new URLSearchParams())],
    [
      ['missile[502]', '0'],
      ['missile[503]', '1'],
    ],
  )
})

void test('the page module publishes the reader and the three functions it owns, and nothing else', () => {
  assert.deepEqual(Object.keys(informationModule).toSorted(), [
    'information',
    'informationDestroyMissiles',
    'informationSendFleet',
    'readInformation',
  ])
})
