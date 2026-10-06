import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../src/index.ts'
import { ErrorCode, parsePage, readLevelShop, readUnitShop } from '../../src/index.ts'
import { shopPageContent, stockNode } from '../fixtures/game/economy.ts'
import { BASE_URL, PLANET_ID, gamePage, httpResponse, tickerHeader } from '../helpers.ts'

type ShopRoute = 'buyFleet' | 'buyDefense' | 'buyBuild' | 'buyTech'

const CURRENCY = 921

const HEADER = tickerHeader({
  metal: ['1000', '10', '100000'],
  crystal: ['1000', '10', '100000'],
  deuterium: ['1000', '10', '100000'],
  energy: ['500', '1234'],
}).concat(stockNode('darkmatter', '500'))

const COST_INFO = '{"1": ["15", "Metal Mine", "4000", "1.4"]}'

function pageOf(route: ShopRoute, options: { costInfo?: string; header?: string } = {}): Page {
  const body = shopPageContent(route, CURRENCY, [1, 2], options.costInfo ?? COST_INFO)
  const url = `${BASE_URL}game.php?page=${route}&cp=${PLANET_ID}`
  return parsePage(
    httpResponse({ body: gamePage(body, { header: options.header ?? HEADER }) }, url),
  )
}

void test('a level shop states the price of a further level and the factor it is raised by', () => {
  const catalogue = readLevelShop(pageOf('buyBuild'))
  assert.deepEqual(catalogue.items, [
    { elementId: 1, name: 'Metal Mine', owned: 15, basePrice: 4000, priceFactor: 1.4 },
  ])
})

void test('a unit shop states what one unit costs and leaves the factor unread', () => {
  const catalogue = readUnitShop(pageOf('buyFleet'))
  assert.deepEqual(catalogue.items, [
    { elementId: 1, name: 'Metal Mine', owned: 15, unitPrice: 4000 },
  ])
})

void test('the currency is the account’s instant-purchase resource, read from the charge control', () => {
  assert.deepEqual(
    [
      readLevelShop(pageOf('buyBuild')).currencyId,
      readLevelShop(pageOf('buyTech')).currencyId,
      readUnitShop(pageOf('buyFleet')).currencyId,
      readUnitShop(pageOf('buyDefense')).currencyId,
    ],
    [CURRENCY, CURRENCY, CURRENCY, CURRENCY],
  )
})

void test('the balance is the header’s figure for that currency, or none where it states none', () => {
  const withoutCurrency = shopPageContent('buyBuild', CURRENCY, [1], COST_INFO)
  const url = `${BASE_URL}game.php?page=buyBuild&cp=${PLANET_ID}`
  const unstated = parsePage(httpResponse({ body: gamePage(withoutCurrency) }, url))
  assert.deepEqual(
    [readLevelShop(pageOf('buyBuild')).balance, readLevelShop(unstated).balance],
    [500, null],
  )
})

void test('an entry the page could not have bound is a decoding failure', () => {
  const malformed: [string, string][] = [
    ['an entry that is not an array', '{"1": 5}'],
    ['an entry of three values', '{"1": ["15", "Metal Mine", "4000"]}'],
    ['an entry of five values', '{"1": ["15", "Metal Mine", "4000", "1.4", "x"]}'],
    ['a figure that is not text', '{"1": [null, "Metal Mine", "4000", "1.4"]}'],
    ['a name that is not text', '{"1": ["15", null, "4000", "1.4"]}'],
  ]
  for (const [name, costInfo] of malformed) {
    assert.throws(
      () => readLevelShop(pageOf('buyBuild', { costInfo })),
      { code: ErrorCode.ParseError, message: 'Invalid direct purchase item' },
      name,
    )
    assert.throws(
      () => readUnitShop(pageOf('buyFleet', { costInfo })),
      { code: ErrorCode.ParseError, message: 'Invalid direct purchase item' },
      name,
    )
  }
})

void test('a document without the catalogue binding is a decoding failure', () => {
  const bound = shopPageContent('buyBuild', CURRENCY, [1, 2], COST_INFO)
  const withoutCatalogue = bound.replace(
    /<script type="text\/javascript">var CostInfo = .*?;<\/script>/,
    '',
  )
  const url = `${BASE_URL}game.php?page=buyBuild&cp=${PLANET_ID}`
  const document = parsePage(
    httpResponse({ body: gamePage(withoutCatalogue, { header: HEADER }) }, url),
  )
  assert.throws(() => readLevelShop(document), {
    code: ErrorCode.ParseError,
    message: 'Expected one CostInfo binding, found 0',
  })
})

void test('a document of the other shape is refused rather than read as this one’s catalogue', () => {
  assert.throws(() => readLevelShop(pageOf('buyFleet')), {
    code: ErrorCode.ParseError,
    message: 'Missing level purchase total',
  })
  assert.throws(() => readUnitShop(pageOf('buyBuild')), {
    code: ErrorCode.ParseError,
    message: 'Missing unit purchase total',
  })
})

void test('a charge control that names no currency is a decoding failure', () => {
  const shapes = [
    shopPageContent('buyBuild', CURRENCY, [1], COST_INFO).replace(
      'class="colore921"',
      'class="price"',
    ),
    shopPageContent('buyBuild', CURRENCY, [1], COST_INFO).replace('id="price"', 'id="total"'),
  ]
  for (const body of shapes) {
    const url = `${BASE_URL}game.php?page=buyBuild&cp=${PLANET_ID}`
    const document = parsePage(httpResponse({ body: gamePage(body, { header: HEADER }) }, url))

    assert.throws(() => readLevelShop(document), {
      code: ErrorCode.ParseError,
      message: 'Expected a numeric value',
    })
  }
})
