import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { MarketPage } from '../../../src/index.ts'
import {
  ErrorCode,
  market,
  marketCreateLot,
  marketCancelLot,
  marketBuyLot,
  parsePage,
  readMarket,
} from '../../../src/index.ts'
import {
  emptyLot,
  emptyLotTooltip,
  emptyMarketPageContent,
  lotInFirstSectionPage,
  lotOwnLotButton,
  lotPriceButton,
  lotPriceButtonWithoutLink,
  lotPriceButtonWithoutPrice,
  lotPurchaseLink,
  lotTooltip,
  lotsPage,
  marketLotRow,
  marketPageContent,
  marketPageMissingSections,
  sellForm,
  sellFormOnlyPageContent,
  stockNode,
  unknownResourceMarketPage,
} from '../../fixtures/game/economy.ts'
import {
  BASE_URL,
  PLANET_ID,
  expectOperation,
  fakeServer,
  gamePage,
  httpResponse,
  pageReply,
  sessionOn,
  tickerHeader,
} from '../../helpers.ts'

const HEADER = tickerHeader({
  metal: ['1000', '10', '100000'],
  crystal: ['2000', '20', '200000'],
  deuterium: ['3000', '30', '300000'],
  energy: ['500', '1234'],
}).concat(stockNode('antimatter', '7000'))

const HEADER_WITHOUT_CURRENCY = tickerHeader({
  metal: ['1000', '10', '100000'],
  crystal: ['2000', '20', '200000'],
  deuterium: ['3000', '30', '300000'],
  energy: ['500', '1234'],
})

const READ_URL = `${BASE_URL}game.php?page=market&cp=${PLANET_ID}`

function document(content: string, header = HEADER): string {
  return gamePage(content, { header })
}

function marketOf(answer: Awaited<ReturnType<typeof market>>): MarketPage {
  const data = answer.data
  if (data.kind !== 'market') assert.fail(`expected the market, answered with ${data.kind}`)
  return data
}

function foreignLot(
  category: number,
  tooltip: string,
  button: string,
  time = '01.01.2024 12:00:00',
): string {
  return gamePage(lotInFirstSectionPage(marketLotRow(category, tooltip, time, button)), {
    header: HEADER,
  })
}

void test('the market is read for the planet the request names', async () => {
  const server = fakeServer(pageReply(document(marketPageContent)))
  const answer = await market(sessionOn(server), { planetId: PLANET_ID })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, READ_URL)
  const front = marketOf(answer)
  assert.equal(front.kind, 'market')
  assert.equal(front.planetId, PLANET_ID)
})

void test('each lot states its category, its contents, its time and what may be done with it', async () => {
  const front = marketOf(
    await market(sessionOn(fakeServer(pageReply(document(marketPageContent)))), {
      planetId: PLANET_ID,
    }),
  )
  assert.deepEqual(front.lots, [
    {
      id: 77,
      owned: false,
      hasCancelControl: false,
      category: 3,
      price: 20000,
      createdAtText: '01.01.2024 12:00:00',
      elements: new Map([
        [202, 5],
        [203, 2],
      ]),
    },
    {
      id: 88,
      owned: true,
      hasCancelControl: true,
      category: 4,
      price: null,
      createdAtText: '02.01.2024 08:30:00',
      elements: new Map([[401, 120]]),
    },

    {
      id: null,
      owned: true,
      hasCancelControl: false,
      category: 5,
      price: null,
      createdAtText: '03.01.2024 09:00:00',
      elements: new Map([[204, 30]]),
    },
  ])
})

void test('the sell form states what the planet may list, the categories and the currency', async () => {
  const front = marketOf(
    await market(sessionOn(fakeServer(pageReply(document(marketPageContent)))), {
      planetId: PLANET_ID,
    }),
  )
  assert.deepEqual([...front.inventory], [[202, 1000000]])
  assert.deepEqual(front.categories, [
    { value: 1, label: 'All' },
    { value: 2, label: 'Metal' },
    { value: 3, label: 'Fleet' },
  ])
  assert.equal(front.currencyId, 922)
  assert.equal(front.balance, 7000)
  assert.equal(front.resources.get(901), 1000)
})

void test('an element the header also reports is read from the header, not from the row', async () => {
  const form = sellForm.replace('name="lot202"', 'name="lot901"')
  const front = marketOf(
    await market(
      sessionOn(
        fakeServer(
          pageReply(
            document(
              `<div id="market_1"></div><div id="market_2">${form}</div><div id="market_3"></div>`,
            ),
          ),
        ),
      ),
      { planetId: PLANET_ID },
    ),
  )
  assert.deepEqual([...front.inventory], [[901, 1000]])
})

void test('a market with nothing to sell states neither a currency nor a balance', async () => {
  const front = marketOf(
    await market(sessionOn(fakeServer(pageReply(document(emptyMarketPageContent)))), {
      planetId: PLANET_ID,
    }),
  )
  assert.deepEqual(front.lots, [])
  assert.deepEqual([...front.inventory], [])
  assert.deepEqual(front.categories, [])
  assert.equal(front.currencyId, null)
  assert.equal(front.balance, null)
})

void test('a currency the header states no balance for is reported as none rather than zero', async () => {
  const front = marketOf(
    await market(
      sessionOn(fakeServer(pageReply(document(sellFormOnlyPageContent, HEADER_WITHOUT_CURRENCY)))),
      { planetId: PLANET_ID },
    ),
  )
  assert.equal(front.currencyId, 922)
  assert.equal(front.balance, null)
})

void test('a lot outside the resource table takes its count from the row it is rendered in', async () => {
  const front = marketOf(
    await market(sessionOn(fakeServer(pageReply(document(unknownResourceMarketPage)))), {
      planetId: PLANET_ID,
    }),
  )
  assert.deepEqual([...front.inventory], [[999, 1000]])
})

void test('a market section the page does not render is a decoding failure', async () => {
  await assert.rejects(
    () =>
      market(sessionOn(fakeServer(pageReply(document(marketPageMissingSections)))), {
        planetId: PLANET_ID,
      }),
    { code: ErrorCode.ParseError, message: 'Missing market sections' },
  )
  const withoutOwnOffers = `${marketPageMissingSections}<div id="market_2"></div>`
  await assert.rejects(
    () =>
      market(sessionOn(fakeServer(pageReply(document(withoutOwnOffers)))), {
        planetId: PLANET_ID,
      }),
    { code: ErrorCode.ParseError, message: 'Missing market sections' },
  )
})

void test('a lot that lists no contents is a decoding failure', async () => {
  await assert.rejects(
    () =>
      market(
        sessionOn(
          fakeServer(pageReply(foreignLot(3, emptyLotTooltip, lotPurchaseLink + lotPriceButton))),
        ),
        { planetId: PLANET_ID },
      ),
    { code: ErrorCode.ParseError, message: 'Missing market lot contents' },
  )
})

void test('a lot listing one element twice is a decoding failure', async () => {
  const twice = lotTooltip([
    [202, 'Light Cargo', '5'],
    [202, 'Light Cargo', '2'],
  ])
  await assert.rejects(
    () =>
      market(
        sessionOn(fakeServer(pageReply(foreignLot(3, twice, lotPurchaseLink + lotPriceButton)))),
        { planetId: PLANET_ID },
      ),
    { code: ErrorCode.ParseError, message: 'Duplicate market lot element' },
  )
})

void test('a foreign lot without a purchase link or a price is a decoding failure', async () => {
  await assert.rejects(
    () =>
      market(
        sessionOn(
          fakeServer(
            pageReply(
              foreignLot(3, lotTooltip([[202, 'Light Cargo', '5']]), lotPriceButtonWithoutLink),
            ),
          ),
        ),
        { planetId: PLANET_ID },
      ),
    { code: ErrorCode.ParseError, message: 'Missing market lot purchase link' },
  )
  await assert.rejects(
    () =>
      market(
        sessionOn(
          fakeServer(
            pageReply(
              foreignLot(
                3,
                lotTooltip([[202, 'Light Cargo', '5']]),
                lotPurchaseLink + lotPriceButtonWithoutPrice,
              ),
            ),
          ),
        ),
        { planetId: PLANET_ID },
      ),
    { code: ErrorCode.ParseError, message: 'Missing market lot price' },
  )
})

void test('a lot whose category icon cannot be read is a decoding failure', async () => {
  const withoutCategory = marketLotRow(
    3,
    lotTooltip([[202, 'Light Cargo', '5']]),
    '01.01.2024 12:00:00',
    lotPurchaseLink + lotPriceButton,
  ).replace('market_3.png', 'market.png')
  await assert.rejects(
    () =>
      market(
        sessionOn(
          fakeServer(
            pageReply(gamePage(lotInFirstSectionPage(withoutCategory), { header: HEADER })),
          ),
        ),
        {
          planetId: PLANET_ID,
        },
      ),
    { code: ErrorCode.ParseError, message: 'Expected a numeric value' },
  )
})

void test('a lot row that states no creation time is a decoding failure', async () => {
  const row = marketLotRow(
    3,
    lotTooltip([[202, 'Light Cargo', '5']]),
    '',
    lotPurchaseLink + lotPriceButton,
  ).replace('<div class="count_blocks"><span style="color:#FC6;float:right;"></span></div>', '')
  await assert.rejects(
    () =>
      market(
        sessionOn(fakeServer(pageReply(gamePage(lotInFirstSectionPage(row), { header: HEADER })))),
        {
          planetId: PLANET_ID,
        },
      ),
    { code: ErrorCode.ParseError, message: 'Missing market lot creation time' },
  )
})

void test('an empty market section is passed over rather than read as a lot', async () => {
  const front = marketOf(
    await market(sessionOn(fakeServer(pageReply(document(lotsPage(emptyLot))))), {
      planetId: PLANET_ID,
    }),
  )
  assert.deepEqual(front.lots, [])
})

void test('a lot whose own control states no address reports no ID', async () => {
  const row = marketLotRow(
    5,
    lotTooltip([[204, 'Light Fighter', '30']]),
    '03.01.2024 09:00:00',
    lotOwnLotButton,
  )
  const front = marketOf(
    await market(
      sessionOn(
        fakeServer(pageReply(document(`<div id="market_1"></div><div id="market_3">${row}</div>`))),
      ),
      { planetId: PLANET_ID },
    ),
  )
  assert.deepEqual(
    front.lots.map((lot) => [lot.id, lot.owned, lot.hasCancelControl, lot.price]),
    [[null, true, false, null]],
  )
})

void test('listing a lot sends the price, the category and every element it holds', async () => {
  const server = await expectOperation(
    (session) =>
      marketCreateLot(session, {
        planetId: PLANET_ID,
        elements: new Map([
          [202, 5],
          [203, 2],
        ]),
        price: 20000,
        category: 3,
      }),
    {
      method: 'POST',
      url: `${READ_URL}&mode=add`,
      body: [
        ['price', '20000'],
        ['class', '3'],
        ['lot202', '5'],
        ['lot203', '2'],
      ],
    },
  )
  assert.equal(server.requests[0]!.url.searchParams.get('mode'), 'add')
})

void test('buying and taking back a lot each name the mode that acts on it', async () => {
  await expectOperation((session) => marketBuyLot(session, { planetId: PLANET_ID, lotId: 77 }), {
    method: 'POST',
    url: `${READ_URL}&mode=sell`,
    body: [['id', '77']],
  })
  await expectOperation((session) => marketCancelLot(session, { planetId: PLANET_ID, lotId: 88 }), {
    method: 'POST',
    url: `${READ_URL}&mode=cancel_lot`,
    body: [['id', '88']],
  })
})

void test('the reader decodes a response the caller already holds', () => {
  const decoded = readMarket(parsePage(httpResponse({ body: document(marketPageContent) })))
  assert.equal(decoded.kind, 'market')
  assert.equal(decoded.planetId, PLANET_ID)
  assert.deepEqual(
    decoded.lots.map((lot) => lot.id),
    [77, 88, null],
  )
})
