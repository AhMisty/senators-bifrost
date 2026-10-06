import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  Ack,
  GrowthDocument,
  GrowthKind,
  GrowthModule,
  Observed,
  PageReply,
  PlanetReference,
  Session,
} from '../../../src/index.ts'
import {
  ancientContainerShop,
  ancientContainerUpgrade,
  artifact,
  artifactUpgrade,
  auction,
  auctionUpgrade,
  band,
  bandUpgrade,
  blueprints,
  blueprintsUpgrade,
  details,
  detailsUpgrade,
  development,
  developmentUpgrade,
  ethics,
  ethicsUpgrade,
  fair,
  fairUpgrade,
  government,
  governmentUpgrade,
  ideologies,
  ideologiesUpgrade,
  minerals,
  mineralsUpgrade,
  officer,
  officerUpgrade,
  party,
  partyUpgrade,
  premium,
  premiumUpgrade,
  race,
  raceUpgrade,
} from '../../../src/index.ts'
import {
  cataloguePageBody,
  detailsCatalogueBody,
  officerCatalogueBody,
  officerFlatBonusBody,
  raceChoiceCatalogueBody,
  timedCatalogueBody,
} from '../../fixtures/game/growth.ts'
import {
  BASE_URL,
  DEFAULT_HEADER,
  PLANET_ID,
  expectOperation,
  pageHtml,
  pageReply,
  read,
} from '../../helpers.ts'

type Catalogue = GrowthDocument<GrowthModule>

type Reader = (
  session: Session,
  options: PlanetReference,
) => Promise<Observed<PageReply<Catalogue>>>

type Purchase = (
  session: Session,
  options: PlanetReference & { elementId: number; amount: number },
) => Promise<Observed<Ack>>

type Choice = (
  session: Session,
  options: PlanetReference & { elementId: number },
) => Promise<Observed<Ack>>

type Row<Buy> = {
  module: GrowthModule
  controlKind: GrowthKind

  page: string

  body: string

  ids: readonly number[]
  read: Reader
  buy: Buy
}

const UNIT_MODULES: readonly Row<Purchase>[] = [
  {
    module: 'ancientContainerShop',
    controlKind: 'cooldown',
    page: 'bon',
    body: timedCatalogueBody(),
    ids: [601, 602],
    read: ancientContainerShop,
    buy: ancientContainerUpgrade,
  },

  {
    module: 'artifact',
    controlKind: 'timed',
    page: 'artifact',
    body: timedCatalogueBody(),
    ids: [601, 602],
    read: artifact,
    buy: artifactUpgrade,
  },

  {
    module: 'auction',
    controlKind: 'cooldown',
    page: 'auction',
    body: timedCatalogueBody(),
    ids: [601, 602],
    read: auction,
    buy: auctionUpgrade,
  },

  {
    module: 'band',
    controlKind: 'level',
    page: 'band',
    body: officerFlatBonusBody,
    ids: [611],
    read: band,
    buy: bandUpgrade,
  },

  {
    module: 'blueprints',
    controlKind: 'timed',
    page: 'blueprints',
    body: timedCatalogueBody(),
    ids: [601, 602],
    read: blueprints,
    buy: blueprintsUpgrade,
  },

  {
    module: 'details',
    controlKind: 'level',
    page: 'details',
    body: detailsCatalogueBody,
    ids: [1001],
    read: details,
    buy: detailsUpgrade,
  },

  {
    module: 'development',
    controlKind: 'timed',
    page: 'development',
    body: timedCatalogueBody(),
    ids: [601, 602],
    read: development,
    buy: developmentUpgrade,
  },

  {
    module: 'fair',
    controlKind: 'cooldown',
    page: 'fair',
    body: timedCatalogueBody(),
    ids: [601, 602],
    read: fair,
    buy: fairUpgrade,
  },

  {
    module: 'ideologies',
    controlKind: 'level',
    page: 'ideologies',
    body: officerCatalogueBody,
    ids: [601, 602],
    read: ideologies,
    buy: ideologiesUpgrade,
  },

  {
    module: 'minerals',
    controlKind: 'consumable',
    page: 'minerals',
    body: officerCatalogueBody,
    ids: [601, 602],
    read: minerals,
    buy: mineralsUpgrade,
  },

  {
    module: 'officer',
    controlKind: 'level',
    page: 'officier',
    body: officerCatalogueBody,
    ids: [601, 602],
    read: officer,
    buy: officerUpgrade,
  },

  {
    module: 'party',
    controlKind: 'timed',
    page: 'party',
    body: timedCatalogueBody(),
    ids: [601, 602],
    read: party,
    buy: partyUpgrade,
  },

  {
    module: 'premium',
    controlKind: 'timed',
    page: 'premium',
    body: timedCatalogueBody(),
    ids: [601, 602],
    read: premium,
    buy: premiumUpgrade,
  },
]

const CHOICE_MODULES: readonly Row<Choice>[] = [
  {
    module: 'ethics',
    controlKind: 'choice',
    page: 'ethics',
    body: raceChoiceCatalogueBody,
    ids: [101, 102],
    read: ethics,
    buy: ethicsUpgrade,
  },
  {
    module: 'government',
    controlKind: 'choice',
    page: 'formgovernment',
    body: raceChoiceCatalogueBody,
    ids: [101, 102],
    read: government,
    buy: governmentUpgrade,
  },
  {
    module: 'race',
    controlKind: 'choice',
    page: 'race',
    body: raceChoiceCatalogueBody,
    ids: [101, 102],
    read: race,
    buy: raceUpgrade,
  },
]

function documentOf(body: string): string {
  return pageHtml(cataloguePageBody(body, PLANET_ID, DEFAULT_HEADER))
}

function pageUrl(page: string): string {
  return `${BASE_URL}game.php?page=${page}&cp=${PLANET_ID}`
}

function catalogueTests(row: Row<Purchase>): void {
  void test(`the ${row.module} catalogue is read from the address that also buys from it`, async () => {
    const response = pageReply(documentOf(row.body))
    await expectOperation(
      (session) => row.read(session, { planetId: PLANET_ID }),
      { method: 'GET', url: pageUrl(row.page) },
      response,
    )

    const catalogue = await read((session) => row.read(session, { planetId: PLANET_ID }), response)
    assert.equal(catalogue.kind, row.module)
    assert.equal(catalogue.controlKind, row.controlKind)
    assert.equal(catalogue.planetId, PLANET_ID)
    assert.equal(catalogue.items.length, row.ids.length)
    assert.deepEqual(
      catalogue.items.map((item) => item.elementId),
      row.ids,
    )
  })

  void test(`buying from the ${row.module} catalogue is posted to the page itself, not to an update route`, async () => {
    const elementId = row.ids[0]!
    const server = await expectOperation(
      (session) => row.buy(session, { planetId: PLANET_ID, elementId, amount: 3 }),
      {
        method: 'POST',
        url: pageUrl(row.page),
        body: [
          ['id', String(elementId)],
          ['amount', '3'],
        ],
      },
    )

    assert.equal(server.requests[0]!.url.searchParams.get('mode'), null)
    assert.equal(server.requests[0]!.url.href.includes('mode='), false)
  })

  void test(`a buy from the ${row.module} catalogue carries the caller's own amount, written as the form field it submits as`, async () => {
    const elementId = row.ids[0]!
    await expectOperation(
      (session) => row.buy(session, { planetId: PLANET_ID, elementId, amount: 12 }),
      {
        method: 'POST',
        url: pageUrl(row.page),
        body: [
          ['id', String(elementId)],
          ['amount', '12'],
        ],
      },
    )
  })
}

function choiceTests(row: Row<Choice>): void {
  void test(`the ${row.module} catalogue is read from the address that also buys from it`, async () => {
    const response = pageReply(documentOf(row.body))
    await expectOperation(
      (session) => row.read(session, { planetId: PLANET_ID }),
      { method: 'GET', url: pageUrl(row.page) },
      response,
    )
    const catalogue = await read((session) => row.read(session, { planetId: PLANET_ID }), response)
    assert.equal(catalogue.kind, row.module)
    assert.equal(catalogue.controlKind, row.controlKind)
    assert.equal(catalogue.planetId, PLANET_ID)
    assert.equal(catalogue.items.length, row.ids.length)

    assert.equal(catalogue.selectedElementId, row.ids[0])
  })

  void test(`choosing from the ${row.module} catalogue is posted to the page itself, not to an update route`, async () => {
    const elementId = row.ids[0]!
    const server = await expectOperation(
      (session) => row.buy(session, { planetId: PLANET_ID, elementId }),
      { method: 'POST', url: pageUrl(row.page), body: [['id', String(elementId)]] },
    )

    assert.equal(server.requests[0]!.url.searchParams.get('mode'), null)
    assert.equal(server.requests[0]!.url.href.includes('mode='), false)
  })
}

for (const row of UNIT_MODULES) catalogueTests(row)
for (const row of CHOICE_MODULES) choiceTests(row)

void test('a competing ideology may have a negative displayed value after another is selected', async () => {
  const response = pageReply(documentOf(officerCatalogueBody).replace('(Level 3)', '(Level -0.1)'))
  const catalogue = await read((session) => ideologies(session, { planetId: PLANET_ID }), response)
  assert.equal(catalogue.items.find((item) => item.elementId === 602)?.owned, -0.1)
})

void test('the heading above the bonus lines is read as a heading, not as a requirement', async () => {
  const catalogue = await read(
    (session) => race(session, { planetId: PLANET_ID }),
    pageReply(documentOf(raceChoiceCatalogueBody)),
  )
  assert.deepEqual(
    catalogue.items.map((item) => [item.name, item.effects, item.requirements]),
    [
      ['Fighter', [{ name: 'Fleet speed', amount: 10, unit: 'percent' }], []],
      ['Scout', [{ name: 'Ship speed', amount: 5, unit: 'percent' }], []],
    ],
  )
})
