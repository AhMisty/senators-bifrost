import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { ControlPlanet, ElementMap } from '../../../src/index.ts'
import { ErrorCode, control } from '../../../src/index.ts'
import * as controlModule from '../../../src/page/game/control.ts'
import {
  PRODUCTION_IDS,
  STOCK_IDS,
  empireDuplicateElementBody,
  empireMatrixBody,
  empireMisalignedColumnBody,
  empireShortColumnBody,
  empireWithoutFieldCountBody,
  empireWithoutPlanetColumnBody,
  iconColumn,
  iconColumnMissingDefenseBand,
  iconSection,
  labelColumn,
  labelColumnMissingDefenseBand,
  planetColumn,
  sigmaColumn,
} from '../../fixtures/game/planets.ts'
import {
  BASE_URL,
  PLANET_ID,
  expectOperation,
  gamePage,
  pageReply,
  read,
  tickerHeader,
} from '../../helpers.ts'

const CONTROL_URL = `${BASE_URL}game.php?page=control&cp=${PLANET_ID}`

const TICKER_IDS: number[] = [901, 902, 903]

const TICKER = tickerHeader({
  metal: ['1234.5678', '600', '100000'],
  crystal: ['500.5', '300', '100000'],
  deuterium: ['100.25', '60', '50000'],
  energy: ['500', '1234'],
})

const OTHER_PLANET_ID = 1001

function balances(resources: ElementMap): (number | undefined)[] {
  return TICKER_IDS.map((id) => resources.get(id))
}

function matrix(icons: string, columns: string[]): string {
  return (
    icons +
    labelColumn() +
    '<div class="imper_right_part" id="ipper_planets"><table class="imper_table"><tr>' +
    sigmaColumn() +
    columns.join('') +
    '</tr></table></div>'
  )
}

function uniformColumn(id: number, name: string, stock: string): string {
  return planetColumn(
    id,
    name,
    '[1:2:3]',
    false,
    [STOCK_IDS.map(() => stock), PRODUCTION_IDS.map(() => '0'), ['0'], ['0'], ['0']],
    '12 / 163',
  )
}

void test('the matrix is asked for at the control page of the planet the caller names', async () => {
  await expectOperation((session) => control(session, { planetId: PLANET_ID }), {
    url: CONTROL_URL,
  })
})

void test('every planet column and the five sections of each are read from the document', async () => {
  const page = await read(
    (session) => control(session, { planetId: PLANET_ID }),
    pageReply(gamePage(empireMatrixBody(), { header: TICKER })),
  )
  assert.deepEqual(page, {
    kind: 'control',
    planetId: PLANET_ID,

    observedAtMs: page.observedAtMs,

    planets: [
      {
        id: 1000,
        type: 1,
        name: 'Homeworld',
        coordinate: { galaxy: 1, system: 2, planet: 3 },
        fields: { used: 12, total: 163 },

        resources: new Map([
          [901, 1234.5678],
          [902, 500.5],
          [903, 100.25],
          [911, 1234],
          [912, 100],
          [913, 200],
          [914, 300],
          [915, 400],
          [916, 500],
        ]),

        productionPerHour: new Map([
          [901, 600],
          [902, 300],
          [903, 60],
        ]),

        sections: [
          { name: 'Buildings', elements: new Map([[31, 5]]) },
          { name: 'Ships', elements: new Map([[202, 10]]) },
          { name: 'Planetary Defense', elements: new Map([[401, 20]]) },
        ],
      },
      {
        id: OTHER_PLANET_ID,
        type: 3,
        name: 'Nova',
        coordinate: { galaxy: 1, system: 2, planet: 4 },
        fields: { used: 0, total: 1 },
        resources: new Map(STOCK_IDS.map((id) => [id, 0])),
        productionPerHour: new Map(PRODUCTION_IDS.map((id) => [id, 0])),
        sections: [
          { name: 'Buildings', elements: new Map([[31, 0]]) },
          { name: 'Ships', elements: new Map([[202, 0]]) },
          { name: 'Planetary Defense', elements: new Map([[401, 2]]) },
        ],
      },
    ],
  })
})

void test('the Σ column the template renders first is not read as a planet', async () => {
  const page = await read(
    (session) => control(session, { planetId: PLANET_ID }),
    pageReply(gamePage(empireMatrixBody(), { header: TICKER })),
  )
  assert.deepEqual(
    page.planets.map(({ id }) => id),
    [PLANET_ID, OTHER_PLANET_ID],
  )
})

void test('the header balance is read for the planet the document names, and for no other', async () => {
  const body = matrix(iconColumn(), [
    uniformColumn(PLANET_ID, 'Homeworld', '999'),
    uniformColumn(OTHER_PLANET_ID, 'Nova', '777'),
  ])
  const page = await read(
    (session) => control(session, { planetId: PLANET_ID }),
    pageReply(gamePage(body, { header: TICKER })),
  )
  const homeworld = page.planets[0]!,
    nova = page.planets[1]!
  assert.deepEqual(balances(homeworld.resources), [1234.5678, 500.5, 100.25])
  assert.deepEqual(balances(nova.resources), [777, 777, 777])
})

void test('a balance the header states is read only where the column lists its row', async () => {
  const supplyOnly = STOCK_IDS.filter((id) => !TICKER_IDS.includes(id))
  const icons = iconColumn().replace(iconSection(STOCK_IDS, null), iconSection(supplyOnly, null))
  const body = matrix(icons, [
    planetColumn(
      PLANET_ID,
      'Homeworld',
      '[1:2:3]',
      false,
      [supplyOnly.map(() => '1'), PRODUCTION_IDS.map(() => '1'), ['1'], ['1'], ['1']],
      '12 / 163',
    ),
  ])
  const page = await read(
    (session) => control(session, { planetId: PLANET_ID }),
    pageReply(gamePage(body, { header: TICKER })),
  )
  assert.deepEqual(
    [...page.planets[0]!.resources],
    supplyOnly.map((id) => [id, 1]),
  )
})

void test('a column whose position cell states no coordinate reports none', async () => {
  const body = matrix(iconColumn(), [
    planetColumn(
      PLANET_ID,
      'Homeworld',
      '',
      false,
      [STOCK_IDS.map(() => '1'), PRODUCTION_IDS.map(() => '1'), ['1'], ['1'], ['1']],
      '12 / 163',
    ),
  ])
  const page = await read(
    (session) => control(session, { planetId: PLANET_ID }),
    pageReply(gamePage(body)),
  )
  const planet: ControlPlanet = page.planets[0]!
  assert.equal(planet.coordinate, null)
  assert.equal(planet.name, 'Homeworld')
})

void test('a matrix that lists no planet column is a decoding failure', async () => {
  await assert.rejects(
    () =>
      read(
        (session) => control(session, { planetId: PLANET_ID }),
        pageReply(gamePage(empireWithoutPlanetColumnBody())),
      ),
    { code: ErrorCode.ParseError, message: 'Empire page lists no planet' },
  )
})

void test('an icon column that leaves out a section is a decoding failure', async () => {
  const body = empireMatrixBody().replace(iconColumn(), iconColumnMissingDefenseBand())
  await assert.rejects(
    () => read((session) => control(session, { planetId: PLANET_ID }), pageReply(gamePage(body))),
    { code: ErrorCode.ParseError, message: 'Incomplete empire element column' },
  )
})

void test('a column that carries fewer sections than the icon column lists is a decoding failure', async () => {
  await assert.rejects(
    () =>
      read(
        (session) => control(session, { planetId: PLANET_ID }),
        pageReply(gamePage(empireShortColumnBody())),
      ),
    { code: ErrorCode.ParseError, message: 'Incomplete empire planet column' },
  )
})

void test('a column whose rows do not line up with the icon column is a decoding failure', async () => {
  await assert.rejects(
    () =>
      read(
        (session) => control(session, { planetId: PLANET_ID }),
        pageReply(gamePage(empireMisalignedColumnBody())),
      ),
    { code: ErrorCode.ParseError, message: 'Incomplete empire column section 0' },
  )
})

void test('an element section whose band names nothing is a decoding failure', async () => {
  const unnamed = empireMatrixBody().replaceAll(
    '<div class="imper_block_th">Buildings</div>',
    '<div class="imper_block_th"></div>',
  )
  await assert.rejects(
    () =>
      read((session) => control(session, { planetId: PLANET_ID }), pageReply(gamePage(unnamed))),
    { code: ErrorCode.ParseError, message: 'Missing empire section name' },
  )
})

void test('a label column that names fewer sections than the icon column is a decoding failure', async () => {
  const body = empireMatrixBody().replace(labelColumn(), labelColumnMissingDefenseBand())
  await assert.rejects(
    () => read((session) => control(session, { planetId: PLANET_ID }), pageReply(gamePage(body))),
    { code: ErrorCode.ParseError, message: 'Incomplete empire label column' },
  )
})

void test('a column that names one element twice is a decoding failure', async () => {
  await assert.rejects(
    () =>
      read(
        (session) => control(session, { planetId: PLANET_ID }),
        pageReply(gamePage(empireDuplicateElementBody())),
      ),
    { code: ErrorCode.ParseError, message: 'Duplicate empire element' },
  )
})

void test('an identity block that states no field count is a decoding failure', async () => {
  await assert.rejects(
    () =>
      read(
        (session) => control(session, { planetId: PLANET_ID }),
        pageReply(gamePage(empireWithoutFieldCountBody())),
      ),
    { code: ErrorCode.ParseError, message: 'Missing empire field count' },
  )
})

void test('a field count the display formatter grouped is read as the figure it prints', async () => {
  const page = await read(
    (session) => control(session, { planetId: PLANET_ID }),
    pageReply(
      gamePage(empireMatrixBody().replaceAll('12 / 163', '1.250 / 3.500'), { header: TICKER }),
    ),
  )
  assert.deepEqual(page.planets[0]!.fields, { used: 1250, total: 3500 })
})

void test('the planet a document names is the one reported, whatever the request named', async () => {
  const response = pageReply(gamePage(empireMatrixBody(), { planetId: 2000, header: TICKER }))
  await expectOperation(
    (session) => control(session, { planetId: PLANET_ID }),
    { url: CONTROL_URL },
    response,
  )
  const page = await read((session) => control(session, { planetId: PLANET_ID }), response)
  assert.equal(page.planetId, 2000)
  assert.deepEqual(
    page.planets.map(({ id }) => id),
    [1000, OTHER_PLANET_ID],
  )
})

void test('hourly production can be negative while inventory remains nonnegative', async () => {
  const body = matrix(iconColumn(), [
    planetColumn(
      PLANET_ID,
      'Homeworld',
      '[1:2:3]',
      false,
      [STOCK_IDS.map(() => '1'), PRODUCTION_IDS.map(() => '-1.250'), ['1'], ['1'], ['1']],
      '12 / 163',
    ),
  ])
  const page = await read(
    (session) => control(session, { planetId: PLANET_ID }),
    pageReply(gamePage(body)),
  )
  assert.deepEqual(
    [...page.planets[0]!.productionPerHour],
    PRODUCTION_IDS.map((id) => [id, -1250]),
  )
  await assert.rejects(
    read(
      (session) => control(session, { planetId: PLANET_ID }),
      pageReply(gamePage(matrix(iconColumn(), [uniformColumn(PLANET_ID, 'Homeworld', '-1')]))),
    ),
    { code: ErrorCode.ParseError },
  )
})

void test('the page module publishes the reader and the function it owns, and nothing else', () => {
  assert.deepEqual(Object.keys(controlModule).toSorted(), ['control', 'readControl'])
})
