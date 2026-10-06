import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../src/index.ts'
import {
  ErrorCode,
  RESOURCE_IDS,
  TICKER_RESOURCES,
  hasTicker,
  headerBalance,
  headerCapacity,
  headerResource,
  parseContext,
  parsePage,
  headerBalances,
  resourceSupply,
  resourceTicker,
} from '../../src/index.ts'
import {
  BASE_URL,
  gamePage,
  httpResponse,
  pageReply,
  plainHeader,
  tickerHeader,
} from '../helpers.ts'

const GAME_URL = `${BASE_URL}game.php?page=overview&cp=1000`

const STOCK = { metal: 901, crystal: 902, deuterium: 903 } as const
const ENERGY = 911

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: gamePage(body) }, GAME_URL))
}

function tickerCall(resource: string, config: string): string {
  return `resourceTicker({${config}, valueElem: "current_${resource}"}, true);`
}

function script(...calls: string[]): string {
  return `<script>${calls.join('')}</script>`
}

const FULL_HEADER = tickerHeader({
  metal: ['1000', '600', '100000'],
  crystal: ['500', '300', '100000'],
  deuterium: ['100', '60', '50000'],
  energy: ['500', '1234'],
})

const VACATION_HEADER = plainHeader({
  metal: ['1000', '100000'],
  crystal: ['500', '100000'],
  deuterium: ['100', '50000'],
  energy: ['500', '1234'],
})

void test('the resources the library describes are stated once, in id order', () => {
  assert.deepEqual(RESOURCE_IDS, [901, 902, 903, 911, 912, 913, 914, 915, 916, 921, 922, 923, 924])

  assert.deepEqual(TICKER_RESOURCES, [
    { id: 901, name: 'metal' },
    { id: 902, name: 'crystal' },
    { id: 903, name: 'deuterium' },
  ])
  for (const id of [901, 902, 903]) assert.equal(hasTicker(id), true, String(id))
  for (const id of [911, 921, 999]) assert.equal(hasTicker(id), false, String(id))
})

void test('a resource ticker is read from the call the header makes for it', () => {
  const page = pageOf(FULL_HEADER)
  assert.deepEqual(resourceTicker(page, STOCK.metal), {
    available: 1000,
    capacity: 100000,
    production: 600,
  })

  assert.equal(resourceTicker(page, ENERGY), null)
  assert.equal(resourceTicker(pageOf('<p>x</p>'), STOCK.metal), null)
})

void test('a header whose tickers are not the ones the page writes is refused', () => {
  const broken: [string, Page, string][] = [
    [
      'a ticker whose valueElem names no ticked resource',
      pageOf(script('resourceTicker({available: "1", valueElem: "x"}, true);')),
      'Invalid resource ticker configuration',
    ],
    [
      'a ticker with no valueElem',
      pageOf(script('resourceTicker({available: "1"}, true);')),
      'Missing resource ticker element',
    ],
    [
      'a ticker naming an unknown resource',
      pageOf(script(tickerCall('plasma', 'available: "1"'))),
      'Invalid resource ticker configuration',
    ],
    [
      'two tickers for one resource',
      pageOf(
        script(
          tickerCall('metal', 'available: "1", limit: [0, "100"], production: "2"'),
          tickerCall('metal', 'available: "2", limit: [0, "100"], production: "2"'),
        ),
      ),
      'Invalid resource ticker configuration',
    ],
    [
      'a call that is not configured by an object',
      pageOf(script('resourceTicker("metal", true);')),
      'Expected static object',
    ],
  ]
  for (const [name, page, message] of broken)
    assert.throws(
      () => resourceTicker(page, STOCK.metal),
      { code: ErrorCode.ParseError, message },
      name,
    )
})

void test('a header resource is read as it stands and as the attribute carries it', () => {
  const page = pageOf(FULL_HEADER)
  assert.deepEqual(headerResource(page, STOCK.metal), {
    resourceId: 901,
    name: 'metal',
    kind: 'stock',
    text: '1000',
    dataReal: '1000',
  })
  assert.equal(headerResource(page, ENERGY)?.kind, 'supply')

  assert.equal(headerResource(page, 921), null)
  assert.equal(headerResource(pageOf('<p>x</p>'), STOCK.metal), null)

  const bare = pageOf('<span id="current_metal">7</span>')
  assert.deepEqual(headerResource(bare, STOCK.metal)?.dataReal, null)
  assert.equal(headerResource(bare, STOCK.metal)?.text, '7')
})

void test('a balance is preferred from the ticker, which prints it at full precision', () => {
  const page = pageOf(
    [
      '<span id="current_metal" data-real="999">999</span>',
      script(tickerCall('metal', 'available: "1000", limit: [0, "100000"], production: "600"')),
    ].join(''),
  )
  assert.equal(headerBalance(page, STOCK.metal), 1000)
})

void test('a balance falls back to the attribute where the header carries no ticker', () => {
  const page = pageOf('<span id="current_metal" data-real="1000.5">1.000</span>')
  assert.equal(headerBalance(page, STOCK.metal), 1000.5)

  assert.equal(headerBalance(pageOf('<p>x</p>'), STOCK.metal), null)
  assert.equal(headerBalance(pageOf('<span id="current_metal">7</span>'), STOCK.metal), null)
  assert.throws(
    () => headerBalance(pageOf(script(tickerCall('metal', 'limit: [0, "100000"]'))), STOCK.metal),
    { code: ErrorCode.ParseError },
  )
})

void test('the balances a header states are the stock resources it renders', () => {
  const full = pageOf(FULL_HEADER)
  assert.deepEqual(
    [...headerBalances(full)],
    [
      [901, 1000],
      [902, 500],
      [903, 100],
    ],
  )

  const partial = pageOf(
    script(
      tickerCall('metal', 'available: "1000", limit: [0, "100000"], production: "600"'),
      tickerCall('crystal', 'available: "500", limit: [0, "100000"], production: "300"'),
    ),
  )
  assert.deepEqual([...headerBalances(partial).keys()], [901, 902])
})

void test('a capacity and a production are read from the ticker where there is one', () => {
  const full = pageOf(FULL_HEADER)
  assert.deepEqual(headerCapacity(full, STOCK.metal), { capacity: 100000, production: 600 })

  assert.throws(
    () => headerCapacity(pageOf(script(tickerCall('metal', 'available: "1000"'))), STOCK.metal),
    {
      code: ErrorCode.ParseError,
      message: 'Missing resource limit pair',
    },
  )
  assert.throws(
    () =>
      headerCapacity(
        pageOf(script(tickerCall('metal', 'available: "1000", limit: "100000"'))),
        STOCK.metal,
      ),
    { code: ErrorCode.ParseError, message: 'Missing resource limit pair' },
  )
  assert.throws(
    () =>
      headerCapacity(
        pageOf(script(tickerCall('metal', 'available: "1000", limit: [0]'))),
        STOCK.metal,
      ),
    { code: ErrorCode.ParseError, message: 'Missing resource limit pair' },
  )
})

void test('a capacity is read from the tooltip in vacation mode, where no ticker is rendered', () => {
  const page = pageOf(VACATION_HEADER)
  assert.deepEqual(headerCapacity(page, STOCK.metal), { capacity: 100000, production: null })

  assert.deepEqual(headerCapacity(pageOf('<p>x</p>'), STOCK.metal), {
    capacity: null,
    production: null,
  })
  assert.deepEqual(
    headerCapacity(
      pageOf('<div id="res_block_metal" data-tooltip-content="<span>metal</span>"></div>'),
      STOCK.metal,
    ),
    { capacity: null, production: null },
  )
})

void test('the energy supply is the pair the header renders, at the display’s precision', () => {
  assert.deepEqual(resourceSupply(pageOf(FULL_HEADER), ENERGY), { available: 500, total: 1234 })
  assert.deepEqual(resourceSupply(pageOf(VACATION_HEADER), ENERGY), { available: 500, total: 1234 })
  assert.deepEqual(
    resourceSupply(
      pageOf('<div class="stock_text"><span id="current_energy">1,23 K</span>/ 2,5 K</div>'),
      ENERGY,
    ),
    { available: 1230, total: 2500 },
  )
})

void test('a supply the header does not render is a decoding failure', () => {
  assert.throws(() => resourceSupply(pageOf('<p>x</p>'), ENERGY), {
    code: ErrorCode.ParseError,
    message: 'Expected one #current_energy, found 0',
  })
  assert.throws(() => resourceSupply(pageOf('<span id="current_energy">500</span>'), ENERGY), {
    code: ErrorCode.ParseError,
    message: 'Missing resource supply',
  })
})

void test('the context of a planet is its header, read as one observation', () => {
  const context = parseContext(pageOf(FULL_HEADER))
  assert.deepEqual(context, {
    planetId: 1000,
    observedAtMs: 1,
    resources: new Map([
      [901, 1000],
      [902, 500],
      [903, 100],
    ]),
    productionPerHour: { metal: 600, crystal: 300, deuterium: 60 },
    storageCapacity: { metal: 100000, crystal: 100000, deuterium: 50000 },
    energy: { available: 500, total: 1234 },
  })
})

void test('a header with no ticker at all still states a context, without a production', () => {
  const context = parseContext(pageOf(VACATION_HEADER))
  assert.deepEqual(
    [...context.resources],
    [
      [901, 1000],
      [902, 500],
      [903, 100],
    ],
  )
  assert.deepEqual(context.storageCapacity, { metal: 100000, crystal: 100000, deuterium: 50000 })
  assert.equal(context.productionPerHour, null)
})

void test('the context carries every stock resource the header renders, not only the ticked ones', () => {
  const context = parseContext(
    pageOf(`${FULL_HEADER}<span id="current_darkmatter" data-real="250.5">250</span>`),
  )
  assert.equal(context.resources.get(921), 250.5)
  assert.deepEqual([...context.resources.keys()], [901, 902, 903, 921])
})

void test('a header that read only some of its tickers is not a complete observation', () => {
  for (const names of [['metal'], ['metal', 'crystal']]) {
    const page = pageOf(
      script(
        ...names.map((name) =>
          tickerCall(name, `available: "1", limit: [0, "2"], production: "3"`),
        ),
      ),
    )
    assert.throws(
      () => parseContext(page),
      { code: ErrorCode.ParseError, message: 'Incomplete resource tickers' },
      names.join(','),
    )
  }
})

void test('a header missing a balance or a capacity is a decoding failure', () => {
  const noVacationBalance = pageOf(VACATION_HEADER.replace('data-real="500"', ''))
  assert.throws(() => parseContext(noVacationBalance), {
    code: ErrorCode.ParseError,
    message: 'Missing crystal balance',
  })

  const noBalance = pageOf(
    script(
      tickerCall('metal', 'limit: [0, "100000"], production: "600"'),
      tickerCall('crystal', 'available: "500", limit: [0, "100000"], production: "300"'),
      tickerCall('deuterium', 'available: "100", limit: [0, "50000"], production: "60"'),
    ),
  )
  assert.throws(() => parseContext(noBalance), {
    code: ErrorCode.ParseError,
    message: 'Expected a numeric value',
  })

  const noCapacity = pageOf(
    script(
      tickerCall('metal', 'available: "1000", limit: "100000", production: "600"'),
      tickerCall('crystal', 'available: "500", limit: [0, "100000"], production: "300"'),
      tickerCall('deuterium', 'available: "100", limit: [0, "50000"], production: "60"'),
    ),
  )
  assert.throws(() => parseContext(noCapacity), {
    code: ErrorCode.ParseError,
    message: 'Missing resource limit pair',
  })

  const noTooltip = pageOf('<span id="current_metal" data-real="1000">1000</span>')
  assert.deepEqual(headerCapacity(noTooltip, STOCK.metal), { capacity: null, production: null })
  assert.throws(() => parseContext(noTooltip), {
    code: ErrorCode.ParseError,
    message: 'Missing metal capacity',
  })
})

void test('a completed response is reported with the time it was read', () => {
  const page = parsePage(httpResponse(pageReply(gamePage(FULL_HEADER)), GAME_URL))
  assert.equal(page.observedAtMs, 1)
  assert.equal(parseContext(page).planetId, 1000)
})
