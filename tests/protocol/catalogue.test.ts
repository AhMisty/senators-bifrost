import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { GrowthEntry, Page } from '../../src/index.ts'
import { ErrorCode, LITERAL_LEVEL_MODULES, catalogue, parsePage } from '../../src/index.ts'
import {
  achievementTooltipBody,
  achievementTooltipWithoutHeadingBody,
  arsenalEntryBody,
  bonusLineWithoutAmountBody,
  cataloguePageBody,
  detailsCatalogueBody,
  detailsCatalogueWithoutPriceBody,
  duplicateCostBody,
  elementCardWithoutIdBody,
  mismatchedPriceHandlerBody,
  officerCatalogueBody,
  officerEntryWithoutTimerBody,
  officerFlatBonusBody,
  timedCatalogueBody,
} from '../fixtures/game/growth.ts'
import {
  choiceEntriesWithRenderedPrices,
  choiceEntryWithoutPrice,
  entryWithBonusLines,
  entryWithFloatedNote,
  entryWithUnreadableFigures,
  entryWithoutControl,
} from '../fixtures/shared/catalogue.ts'
import { BASE_URL, PLANET_ID, httpResponse } from '../helpers.ts'

const PAGE_URL = `${BASE_URL}game.php?page=officier&cp=${PLANET_ID}`

function catalogueOf(content: string, page = 'officier'): Page {
  const url = new URL(PAGE_URL)
  url.searchParams.set('page', page)
  return parsePage(httpResponse({ body: cataloguePageBody(content, PLANET_ID, '') }, url.href))
}

void test('an entry is read from the heading, the image and the price row it renders', () => {
  assert.deepEqual(catalogue(catalogueOf(officerCatalogueBody), 'level', true), [
    {
      elementId: 601,
      name: 'Admiral',
      owned: 1,
      maximumLevel: 20,
      maximumPurchase: 10,
      remainingSeconds: null,
      hasSubmitControl: true,
      isSelected: null,
      costs: [{ resourceId: null, amount: 1000 }],
      costText: '1.000',
      effects: [{ name: 'Fleet speed', amount: 10, unit: 'percent' }],

      requirements: [{ elementId: null, name: 'Shipyard 5', progress: null }],
    },
    {
      elementId: 602,

      name: 'General',
      owned: 3,
      maximumLevel: null,
      maximumPurchase: null,
      remainingSeconds: null,
      hasSubmitControl: true,
      isSelected: null,
      costs: [],
      costText: '2.000',
      effects: [],
      requirements: [],
    },
  ])
})

void test('the level is read the way the page’s own template prints it', () => {
  assert.deepEqual(
    catalogue(catalogueOf(arsenalEntryBody()), 'level', false).map((entry) => [
      entry.owned,
      entry.maximumLevel,
    ]),
    [[1500, 20000]],
  )

  assert.deepEqual(
    catalogue(catalogueOf(arsenalEntryBody()), 'level', true).map((entry) => [
      entry.owned,
      entry.maximumLevel,
    ]),
    [[1.5, 20]],
  )
})

void test('the modules whose levels are raw numbers are the ones the pages declare', () => {
  assert.deepEqual([...LITERAL_LEVEL_MODULES].toSorted(), ['band', 'ideologies', 'officer'])
})

void test('a bonus line is read as the effect it states', () => {
  const entry = catalogue(catalogueOf(entryWithBonusLines), 'level', true)[0]!

  assert.deepEqual(entry.effects, [
    { name: 'attack', amount: -5, unit: 'percent' },
    { name: 'fleet slots', amount: 3, unit: 'amount' },
  ])

  assert.deepEqual(entry.requirements, [
    { elementId: 21, name: 'Shipyard', progress: '0/5' },
    { elementId: 22, name: 'Robotics factory', progress: '0/2' },
    { elementId: null, name: 'Energy tech 5', progress: null },
  ])
})

void test('a flat bonus is an effect with an amount and no unit', () => {
  const entry = catalogue(catalogueOf(officerFlatBonusBody), 'level', true)[0]!
  assert.deepEqual(entry.effects, [{ name: 'fleet slots', amount: 3, unit: 'amount' }])
})

void test('a bonus line whose figure the page did not render keeps the whole line as its name', () => {
  const entry = catalogue(catalogueOf(bonusLineWithoutAmountBody), 'level', true)[0]!
  assert.deepEqual(entry.effects, [
    { name: '+ Fleet slots', amount: null, unit: null },
    { name: '- Damage', amount: null, unit: null },
  ])

  assert.deepEqual(entry.requirements, [])
})

void test('a bonus line whose figure cannot be read keeps the name and the unit it states', () => {
  const entry = catalogue(catalogueOf(entryWithUnreadableFigures), 'level', true)[0]!
  assert.deepEqual(entry.effects, [
    { name: 'Fleet speed', amount: null, unit: 'percent' },
    { name: 'fleet slots', amount: null, unit: 'percent' },
    { name: 'attack', amount: null, unit: 'percent' },
    { name: 'shield', amount: null, unit: 'amount' },
    { name: 'armour', amount: null, unit: 'amount' },

    { name: 'hull', amount: -2.5, unit: 'amount' },
  ])
})

void test('an entry that states no figure of its own is read as the text it renders', () => {
  const entry = catalogue(catalogueOf(entryWithoutControl), 'level', true)[0]!

  assert.equal(entry.name, 'Admiral')
  assert.equal(entry.owned, 20)
  assert.equal(entry.maximumLevel, 20)
  assert.equal(entry.hasSubmitControl, false)
  assert.equal(entry.costText, '')
  assert.deepEqual(entry.costs, [])
})

void test('a note floated onto the heading is not part of the name', () => {
  assert.equal(catalogue(catalogueOf(entryWithFloatedNote), 'level', true)[0]!.name, 'General')
})

void test('a card whose id names no element is passed over rather than read', () => {
  const entries = catalogue(catalogueOf(elementCardWithoutIdBody), 'level', true)
  assert.deepEqual(
    entries.map((entry) => entry.elementId),
    [601],
  )
})

void test('an entry whose id names no element of the page is addressed by none of its handlers', () => {
  assert.throws(() => catalogue(catalogueOf(mismatchedPriceHandlerBody), 'level', false), {
    code: ErrorCode.ParseError,
    message: /Invalid growth price handler/,
  })
})

void test('a price handler that names no resource is read past', () => {
  assert.throws(() => catalogue(catalogueOf(duplicateCostBody), 'level', false), {
    code: ErrorCode.ParseError,
    message: /Duplicate growth cost resource/,
  })
})

void test('an entry bought by the level states its price on the handler it carries', () => {
  const entry = catalogue(catalogueOf(detailsCatalogueBody, 'details'), 'level', false)[0]!
  assert.deepEqual(entry.costs, [{ resourceId: 921, amount: 100 }])
  assert.equal(entry.costText, 'Dark Matter: 100')
})

void test('a choice states its price on the button that makes the choice', () => {
  const entries = catalogue(catalogueOf(choiceEntriesWithRenderedPrices, 'race'), 'choice', false)
  assert.deepEqual(
    entries.map((entry) => entry.costs),
    [
      [
        { resourceId: null, amount: 1000 },
        { resourceId: null, amount: 500 },
      ],
      [{ resourceId: null, amount: 2000 }],
    ],
  )

  assert.deepEqual(
    catalogue(catalogueOf(choiceEntriesWithRenderedPrices, 'race'), 'level', false).map(
      (entry) => entry.costs,
    ),
    [[], []],
  )
})

void test('a choice whose button states no figure states no cost', () => {
  const entry = catalogue(catalogueOf(choiceEntryWithoutPrice, 'race'), 'choice', false)[0]!
  assert.deepEqual(entry.costs, [])

  assert.equal(entry.costText, 'Choose for free')
})

void test('the countdown an entry carries is the timer the page started for it', () => {
  const entries = catalogue(catalogueOf(timedCatalogueBody(), 'officier'), 'timed', true)

  assert.deepEqual(
    entries.map((entry) => entry.remainingSeconds),
    [120, 0],
  )
})

void test('a countdown the page rendered no timer for is a decoding failure', () => {
  assert.throws(() => catalogue(catalogueOf(officerEntryWithoutTimerBody), 'timed', true), {
    code: ErrorCode.ParseError,
    message: /Growth countdown without a timer/,
  })
})

void test('a kind that carries no countdown reports none whatever the page rendered', () => {
  const entries = catalogue(catalogueOf(timedCatalogueBody()), 'level', true)
  assert.deepEqual(
    entries.map((entry) => entry.remainingSeconds),
    [null, null],
  )
})

void test('the bonuses an achievement tooltip states are read beside the entry’s own', () => {
  const entry = catalogue(catalogueOf(achievementTooltipBody), 'level', false)[0]!

  assert.deepEqual(entry.effects, [{ name: 'Fleet speed', amount: 10, unit: 'percent' }])
  assert.deepEqual(entry.requirements, [{ elementId: null, name: 'Energy tech 5', progress: null }])
})

void test('a bonus tooltip that states no heading is a decoding failure', () => {
  assert.throws(
    () => catalogue(catalogueOf(achievementTooltipWithoutHeadingBody), 'level', false),
    {
      code: ErrorCode.ParseError,
      message: /Missing growth bonus heading/,
    },
  )
})

void test('two cards for one element are reported as the one entry they describe', () => {
  const entries = catalogue(catalogueOf(detailsCatalogueBody, 'details'), 'level', false)
  assert.equal(entries.length, 1)

  assert.deepEqual(entries[0]!.effects, [{ name: 'attack', amount: 17.32, unit: 'percent' }])
  assert.deepEqual(entries[0]!.requirements, [
    { elementId: null, name: 'Energy tech 5', progress: null },
  ])
  assert.deepEqual(entries[0]!.costs, [{ resourceId: 921, amount: 100 }])
})

void test('a second card that prices nothing leaves the price the first one stated', () => {
  const entry = catalogue(
    catalogueOf(detailsCatalogueWithoutPriceBody, 'details'),
    'level',
    false,
  )[0]!

  assert.deepEqual(entry.costs, [])
  assert.deepEqual(entry.requirements, [{ elementId: null, name: 'Energy tech 5', progress: null }])
})

void test('a document that is not a catalogue at all cannot be read as one', () => {
  assert.throws(
    () => catalogue(parsePage(httpResponse({ body: '<div id="content"></div>' })), 'level', true),
    {
      code: ErrorCode.ParseError,
      message: 'Expected one #page > #content, found 0',
    },
  )
})

void test('a catalogue with no entry reports no entry rather than refusing', () => {
  assert.deepEqual(catalogue(catalogueOf('<p>Nothing to buy</p>'), 'level', true), [])
})

void test('the entries are the ones the page rendered, in the order it rendered them', () => {
  const entries: GrowthEntry[] = catalogue(catalogueOf(officerCatalogueBody), 'level', true)
  assert.deepEqual(
    entries.map((entry) => entry.elementId),
    [601, 602],
  )
})
