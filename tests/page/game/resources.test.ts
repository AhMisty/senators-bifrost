import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { ResourcesPage } from '../../../src/index.ts'
import { ErrorCode, resources, resourcesAllPlanets, resourcesSend } from '../../../src/index.ts'
import {
  labelColumn,
  productionForm,
  resourceColumn,
  resourcesPageContent,
  straySupplyColumn,
} from '../../fixtures/game/economy.ts'
import {
  BASE_URL,
  PLANET_ID,
  expectOperation,
  fakeServer,
  gamePage,
  pageReply,
  plainHeader,
  sessionOn,
  tickerHeader,
} from '../../helpers.ts'

const HEADER = tickerHeader({
  metal: ['1000', '10', '100000'],
  crystal: ['2000', '20', '200000'],
  deuterium: ['3000', '30', '300000'],
  energy: ['500', '1234'],
})

const VACATION_HEADER = plainHeader({
  metal: ['1000', '100000'],
  crystal: ['2000', '200000'],
  deuterium: ['3000', '300000'],
  energy: ['500', '1234'],
})

const READ_URL = `${BASE_URL}game.php?page=resources&cp=${PLANET_ID}`

function document(content = resourcesPageContent(), header = HEADER): string {
  return gamePage(content, { header })
}

function tableOf(answer: Awaited<ReturnType<typeof resources>>): ResourcesPage {
  const data = answer.data
  if (data.kind !== 'resources')
    assert.fail(`expected the production table, answered with ${data.kind}`)
  return data
}

void test('the production table is read for the planet the request names', async () => {
  const server = fakeServer(pageReply(document()))
  const answer = await resources(sessionOn(server), { planetId: PLANET_ID })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, READ_URL)
  assert.equal(server.requests[0]!.url.searchParams.has('mode'), false)
  const table = tableOf(answer)
  assert.equal(table.kind, 'resources')
  assert.equal(table.planetId, PLANET_ID)
})

void test('a step setting names the producer, the level beside it and the steps it offers', async () => {
  const table = tableOf(
    await resources(sessionOn(fakeServer(pageReply(document()))), { planetId: PLANET_ID }),
  )
  assert.deepEqual(table.settings, [
    { elementId: 1, elementLevel: 5, step: 10, allowedSteps: [10, 9] },
    { elementId: 2, elementLevel: 3, step: 0, allowedSteps: [0, 1] },
  ])
})

void test('a production column is read against the ticker the header renders', async () => {
  const table = tableOf(
    await resources(sessionOn(fakeServer(pageReply(document()))), { planetId: PLANET_ID }),
  )
  assert.deepEqual(productionColumns(table), [
    {
      resourceId: 901,
      basic: 30,
      producers: new Map([
        [1, 600],
        [2, 300],
      ]),
      bonus: 10,
      kind: 'stock',
      storageCapacity: 100000,
      hourly: 10,
      daily: 240,
      weekly: 1680,
    },
    {
      resourceId: 902,
      basic: 20,
      producers: new Map([
        [1, 300],
        [2, 150],
      ]),
      bonus: 5,
      kind: 'stock',
      storageCapacity: 200000,
      hourly: 20,
      daily: 480,
      weekly: 3360,
    },
    {
      resourceId: 903,
      basic: 5,
      producers: new Map([
        [1, 60],
        [2, 30],
      ]),
      bonus: 1,
      kind: 'stock',
      storageCapacity: 300000,
      hourly: 30,
      daily: 720,
      weekly: 5040,
    },
  ])
})

void test('a supply column reports the pair the page renders instead of a capacity', async () => {
  const table = tableOf(
    await resources(sessionOn(fakeServer(pageReply(document()))), { planetId: PLANET_ID }),
  )
  assert.deepEqual(table.production.at(-1), {
    resourceId: 911,
    basic: 0,
    producers: new Map([
      [1, 400],
      [2, 100],
    ]),
    bonus: 0,
    kind: 'supply',
    supply: { available: 500, total: 1234 },
  })
})

void test('a response without tickers falls back to the columns the table prints', async () => {
  const table = tableOf(
    await resources(
      sessionOn(fakeServer(pageReply(document(resourcesPageContent(), VACATION_HEADER)))),
      {
        planetId: PLANET_ID,
      },
    ),
  )
  assert.deepEqual(productionColumns(table)[0], {
    resourceId: 901,
    basic: 30,
    producers: new Map([
      [1, 600],
      [2, 300],
    ]),
    bonus: 10,
    kind: 'stock',
    storageCapacity: 100000,
    hourly: 910,
    daily: 21840,
    weekly: 152880,
  })
})

void test('a table whose label column does not name every producer is a decoding failure', async () => {
  const short = labelColumn().replace(
    '<div class="rexx2 rexx3"><a href="#"><img src="gebaeude/2.gif">Element 2<span class="rexx4">3</span></a></div>',
    '',
  )
  await assert.rejects(
    () =>
      resources(
        sessionOn(fakeServer(pageReply(document(productionForm() + short + restOfTable())))),
        {
          planetId: PLANET_ID,
        },
      ),
    { code: ErrorCode.ParseError, message: 'Production columns do not align' },
  )
})

void test('a table whose columns are listed in another order is a decoding failure', async () => {
  const swapped = labelColumn()
    .replace('<img src="gebaeude/1.gif">Element 1', '<img src="gebaeude/8.gif">Element 8')
    .replace('<img src="gebaeude/2.gif">Element 2', '<img src="gebaeude/9.gif">Element 9')
  await assert.rejects(
    () =>
      resources(
        sessionOn(fakeServer(pageReply(document(productionForm() + swapped + restOfTable())))),
        {
          planetId: PLANET_ID,
        },
      ),
    { code: ErrorCode.ParseError, message: 'Production columns do not align' },
  )
})

void test('a table without exactly one label column is a decoding failure', async () => {
  const rest = restOfTable()
  await assert.rejects(
    () =>
      resources(sessionOn(fakeServer(pageReply(document(productionForm() + rest)))), {
        planetId: PLANET_ID,
      }),
    { code: ErrorCode.ParseError, message: 'Missing resource production label column' },
  )
  await assert.rejects(
    () =>
      resources(
        sessionOn(
          fakeServer(pageReply(document(productionForm() + labelColumn() + labelColumn() + rest))),
        ),
        { planetId: PLANET_ID },
      ),
    { code: ErrorCode.ParseError, message: 'Missing resource production label column' },
  )
})

void test('a production form the page does not carry exactly once is a decoding failure', async () => {
  const rest = restOfTable()
  await assert.rejects(
    () =>
      resources(sessionOn(fakeServer(pageReply(document(labelColumn() + rest)))), {
        planetId: PLANET_ID,
      }),
    { code: ErrorCode.ParseError, message: 'Missing resource production form' },
  )
  await assert.rejects(
    () =>
      resources(
        sessionOn(
          fakeServer(
            pageReply(document(productionForm() + productionForm() + labelColumn() + rest)),
          ),
        ),
        { planetId: PLANET_ID },
      ),
    { code: ErrorCode.ParseError, message: 'Missing resource production form' },
  )
})

void test('a production field naming no element is a decoding failure', async () => {
  const renamed = productionForm().replace('name="prod[2]"', 'name="prod[x]"')
  await assert.rejects(
    () =>
      resources(
        sessionOn(fakeServer(pageReply(document(renamed + labelColumn() + restOfTable())))),
        {
          planetId: PLANET_ID,
        },
      ),
    { code: ErrorCode.ParseError, message: 'Invalid production field' },
  )
})

void test('a resource column of the wrong height is a decoding failure', async () => {
  await assert.rejects(
    () =>
      resources(
        sessionOn(fakeServer(pageReply(document(resourcesPageContent() + straySupplyColumn())))),
        {
          planetId: PLANET_ID,
        },
      ),
    { code: ErrorCode.ParseError, message: 'Production columns do not align' },
  )
})

void test('a resource column listed twice is a decoding failure', async () => {
  const duplicate = resourceColumn(
    901,
    ['30', '600', '300', '10', '100.000', '910', '21.840', '152.880'],
    'stock',
  )
  await assert.rejects(
    () =>
      resources(sessionOn(fakeServer(pageReply(document(resourcesPageContent() + duplicate)))), {
        planetId: PLANET_ID,
      }),
    { code: ErrorCode.ParseError, message: 'Duplicate resource production column' },
  )
})

void test('a table missing one of the resources the tickers report is a decoding failure', async () => {
  const withoutDeuterium = resourcesPageContent().replace(
    resourceColumn(903, ['5', '60', '30', '1', '50.000', '91', '2.184', '15.288'], 'stock'),
    '',
  )
  await assert.rejects(
    () =>
      resources(sessionOn(fakeServer(pageReply(document(withoutDeuterium)))), {
        planetId: PLANET_ID,
      }),
    { code: ErrorCode.ParseError, message: 'Missing resource production column' },
  )
})

void test('setting the production steps sends one field per producer', async () => {
  const server = await expectOperation(
    (session) =>
      resourcesSend(session, {
        planetId: PLANET_ID,
        steps: new Map([
          [1, 10],
          [2, 0],
        ]),
      }),
    {
      method: 'POST',
      url: `${READ_URL}&mode=send`,
      body: [
        ['prod[1]', '10'],
        ['prod[2]', '0'],
      ],
    },
  )
  assert.equal(server.requests[0]!.url.searchParams.get('mode'), 'send')
})

void test('the account-wide switch is one action for every planet, on or off', async () => {
  const on = await expectOperation(
    (session) => resourcesAllPlanets(session, { planetId: PLANET_ID, enabled: true }),
    { method: 'POST', url: `${READ_URL}&mode=AllPlanets`, body: [['action', 'on']] },
  )
  assert.equal(on.requests[0]!.url.searchParams.get('mode'), 'AllPlanets')
  await expectOperation(
    (session) => resourcesAllPlanets(session, { planetId: PLANET_ID, enabled: false }),
    {
      method: 'POST',
      url: `${READ_URL}&mode=AllPlanets`,
      body: [['action', 'off']],
    },
  )
})

function productionColumns(table: ResourcesPage): ResourcesPage['production'] {
  return table.production.filter((column) => column.kind === 'stock')
}

function restOfTable(): string {
  return resourcesPageContent().replace(productionForm(), '').replace(labelColumn(), '')
}
