import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { GrowthKind, GrowthModule, Page } from '../../src/index.ts'
import { ErrorCode, parsePage, readGrowth } from '../../src/index.ts'
import {
  cataloguePageBody,
  contentContainerWithoutPage,
  officerCatalogueBody,
  officerEntryWithoutTimerBody,
  officerFlatBonusBody,
  raceChoiceCatalogueBody,
  raceChoiceWithoutSelectionBody,
  timedCatalogueBody,
} from '../fixtures/game/growth.ts'
import {
  BASE_URL,
  GROWTH_MODULE_NAMES,
  GROWTH_PAGES,
  PLANET_ID,
  gamePage,
  httpResponse,
  pageHtml,
  tickerHeader,
} from '../helpers.ts'

const HEADER = tickerHeader({
  metal: ['1000', '10', '100000'],
  crystal: ['2000', '20', '200000'],
  deuterium: ['3000', '30', '300000'],
  energy: ['500', '1234'],
})

const CONTROL_KINDS: Readonly<Record<GrowthModule, GrowthKind>> = {
  officer: 'level',
  premium: 'timed',
  blueprints: 'timed',
  artifact: 'timed',
  development: 'timed',
  details: 'level',
  minerals: 'consumable',
  ancientContainerShop: 'cooldown',
  auction: 'cooldown',
  fair: 'cooldown',
  band: 'level',
  race: 'choice',
  ethics: 'choice',
  government: 'choice',
  party: 'timed',
  ideologies: 'level',
}

function pageOf(content: string, page: string): Page {
  return parsePage(
    httpResponse(
      { body: pageHtml(cataloguePageBody(content, PLANET_ID, HEADER)) },
      `${BASE_URL}game.php?page=${page}&cp=${PLANET_ID}`,
    ),
  )
}

function harnessPage(content: string): Page {
  return parsePage(httpResponse({ body: gamePage(content, { header: HEADER }) }))
}

void test('every growth page is reported by its module name', () => {
  for (const module of GROWTH_MODULE_NAMES) {
    const document = readGrowth(pageOf(officerCatalogueBody, GROWTH_PAGES[module]), module)
    assert.equal(document.kind, module)
    assert.equal(document.controlKind, CONTROL_KINDS[module], module)
  }
})

void test('server page spellings do not become client-facing kind names', () => {
  const differing: [GrowthModule, string][] = [
    ['officer', 'officier'],
    ['ancientContainerShop', 'bon'],
    ['government', 'formgovernment'],
  ]
  for (const [module, page] of differing) {
    const document = readGrowth(pageOf(officerCatalogueBody, page), module)
    assert.equal(document.kind, module)
    assert.notEqual(document.kind, page)
  }
})

void test('a reading reports the planet and time it was read from, and the balances it priced against', () => {
  const document = readGrowth(pageOf(officerCatalogueBody, GROWTH_PAGES.officer), 'officer')
  assert.equal(document.planetId, PLANET_ID)
  assert.equal(document.observedAtMs, 1)
  assert.deepEqual(
    [...document.resources],
    [
      [901, 1000],
      [902, 2000],
      [903, 3000],
    ],
  )
})

void test('a catalogue is read into the entries the page rendered', () => {
  const document = readGrowth(pageOf(officerCatalogueBody, GROWTH_PAGES.officer), 'officer')
  assert.equal(document.items.length, 2)
  const admiral = document.items[0]!,
    general = document.items[1]!
  assert.equal(admiral.elementId, 601)
  assert.equal(admiral.name, 'Admiral')
  assert.deepEqual([admiral.owned, admiral.maximumLevel], [1, 20])
  assert.equal(admiral.maximumPurchase, 10)
  assert.equal(admiral.hasSubmitControl, true)
  assert.equal(admiral.remainingSeconds, null)

  assert.deepEqual(admiral.costs, [{ resourceId: null, amount: 1000 }])
  assert.deepEqual(admiral.effects, [{ name: 'Fleet speed', amount: 10, unit: 'percent' }])
  assert.deepEqual(admiral.requirements, [{ elementId: null, name: 'Shipyard 5', progress: null }])

  assert.equal(general.elementId, 602)
  assert.equal(general.maximumPurchase, null)
  assert.equal(general.hasSubmitControl, true)
})

void test('an entry whose form renders no submit control reports that nothing is bought from it', () => {
  const document = readGrowth(pageOf(officerEntryWithoutTimerBody, GROWTH_PAGES.officer), 'officer')
  assert.deepEqual(
    document.items.map((item) => item.hasSubmitControl),
    [false],
  )
})

void test('an entry whose amount control prices itself states the resource it charges', () => {
  const document = readGrowth(pageOf(officerFlatBonusBody, GROWTH_PAGES.officer), 'officer')
  assert.equal(document.items.length, 1)
  assert.deepEqual(document.items[0]!.costs, [{ resourceId: 921, amount: 1000 }])
  assert.deepEqual(document.items[0]!.effects, [{ name: 'fleet slots', amount: 3, unit: 'amount' }])
})

void test('a cooldown kind reports the duration the page started counting down', () => {
  const document = readGrowth(
    pageOf(timedCatalogueBody(), GROWTH_PAGES.ancientContainerShop),
    'ancientContainerShop',
  )
  assert.deepEqual(
    document.items.map((item) => item.remainingSeconds),
    [120, 0],
  )
})

void test('a kind without a countdown reports no duration at all', () => {
  const document = readGrowth(pageOf(officerCatalogueBody, GROWTH_PAGES.officer), 'officer')
  assert.deepEqual(
    document.items.map((item) => item.remainingSeconds),
    [null, null],
  )
})

void test('a choice reports the one entry the heading names as the selection', () => {
  const document = readGrowth(pageOf(raceChoiceCatalogueBody, GROWTH_PAGES.race), 'race')
  assert.equal(document.selectedElementId, 101)
  assert.deepEqual(
    document.items.map((item) => [item.elementId, item.isSelected]),
    [
      [101, true],
      [102, false],
    ],
  )
})

void test('a heading naming none of the catalogue’s entries leaves every entry unmarked', () => {
  const document = readGrowth(pageOf(raceChoiceWithoutSelectionBody, GROWTH_PAGES.race), 'race')
  assert.equal(document.selectedElementId, null)
  assert.deepEqual(
    document.items.map((item) => item.isSelected),
    [null, null],
  )
})

void test('a heading naming several entries states no single selection', () => {
  const document = readGrowth(pageOf(duplicatedRaceChoice(), GROWTH_PAGES.race), 'race')
  assert.equal(document.selectedElementId, null)
  assert.deepEqual(
    document.items.map((item) => item.isSelected),
    [null, null, null],
  )
})

void test('a page without the heading reports no selection rather than a failure', () => {
  const document = readGrowth(pageOf(raceChoiceWithoutHeading(), GROWTH_PAGES.race), 'race')
  assert.equal(document.selectedElementId, null)
  assert.deepEqual(
    document.items.map((item) => item.isSelected),
    [null, null],
  )
})

void test('a non-choice catalogue reports no selection whatever the page renders', () => {
  const document = readGrowth(pageOf(raceChoiceCatalogueBody, GROWTH_PAGES.officer), 'officer')
  assert.equal(document.selectedElementId, null)
  assert.deepEqual(
    document.items.map((item) => item.isSelected),
    [null, null],
  )
})

void test('a page without the content container the reading requires is a decoding failure', () => {
  assert.throws(() => readGrowth(harnessPage(contentContainerWithoutPage), 'officer'), {
    code: ErrorCode.ParseError,
    message: 'Expected one #page > #content, found 0',
  })
})

function duplicatedRaceChoice(): string {
  const body = raceChoiceCatalogueBody
  const start = body.indexOf('<div id="ofic_101"')
  const end = body.indexOf('<div id="ofic_102"')
  return body.replace(
    '<div id="ofic_102"',
    `${body.slice(start, end).replaceAll('101', '103')}<div id="ofic_102"`,
  )
}

function raceChoiceWithoutHeading(): string {
  return raceChoiceCatalogueBody.replace(/<div class="gray_flettab"[\s\S]*?<\/div>/, '')
}
