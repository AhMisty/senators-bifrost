import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { TraderTradePage, TraderPage } from '../../../src/index.ts'
import {
  ErrorCode,
  parsePage,
  readTraderTrade,
  trader,
  traderSend,
  traderTrade,
} from '../../../src/index.ts'
import {
  tradePageContent,
  traderColumn,
  traderPageContent,
  unnamedTraderColumn,
  withoutSourceResourceName,
} from '../../fixtures/game/economy.ts'
import {
  BASE_URL,
  DEFAULT_HEADER,
  PLANET_ID,
  expectOperation,
  fakeServer,
  gamePage,
  httpResponse,
  pageReply,
  sessionOn,
} from '../../helpers.ts'

const READ_URL = `${BASE_URL}game.php?page=trader&cp=${PLANET_ID}`
const SEND_URL = `${BASE_URL}game.php?page=trader&cp=${PLANET_ID}&mode=send`
const TRADE_URL = `${BASE_URL}game.php?resource=901&page=trader&cp=${PLANET_ID}&mode=trade`

function pageDocument(columns: string, fee: boolean): string {
  return gamePage(traderPageContent(columns, fee), { header: DEFAULT_HEADER })
}

function quoteDocument(charge: string): string {
  return gamePage(tradePageContent(charge), { header: DEFAULT_HEADER })
}

function merchantOf(answer: Awaited<ReturnType<typeof trader>>): TraderPage {
  const data = answer.data
  if (data.kind !== 'trader') assert.fail(`expected the merchant, answered with ${data.kind}`)
  return data
}

function quoteOf(answer: Awaited<ReturnType<typeof traderTrade>>): TraderTradePage {
  const data = answer.data
  if (data.kind !== 'traderTrade') assert.fail(`expected a trade quote, answered with ${data.kind}`)
  return data
}

void test('the merchant is read for the planet the request names', async () => {
  const server = fakeServer(pageReply(pageDocument(traderColumn(903, 'Deuterium', true), true)))
  const answer = await trader(sessionOn(server), { planetId: PLANET_ID })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, READ_URL)
  const merchant = merchantOf(answer)
  assert.equal(merchant.kind, 'trader')
  assert.equal(merchant.planetId, PLANET_ID)
})

void test('the merchant and quote use their inner trader nodes when the body shares the id', async () => {
  const merchantHtml = pageDocument(traderColumn(903, 'Deuterium', true), true).replace(
    '<body>',
    '<body id="trader">',
  )
  const merchant = merchantOf(
    await trader(sessionOn(fakeServer(pageReply(merchantHtml))), { planetId: PLANET_ID }),
  )
  assert.equal(merchant.resources.length, 1)

  const quoteHtml = quoteDocument('{"902": 2, "903": 4}').replace('<body>', '<body id="trader">')
  const quote = quoteOf(
    await traderTrade(sessionOn(fakeServer(pageReply(quoteHtml))), {
      planetId: PLANET_ID,
      resourceId: 901,
    }),
  )
  assert.equal(quote.resourceId, 901)
})

void test('a resource column states the resource it buys and whether it can be bought', async () => {
  const merchant = merchantOf(
    await trader(
      sessionOn(
        fakeServer(
          pageReply(
            pageDocument(
              traderColumn(903, 'Deuterium', true) + traderColumn(902, 'Crystal', false),
              true,
            ),
          ),
        ),
      ),
      { planetId: PLANET_ID },
    ),
  )
  assert.deepEqual(merchant.resources, [
    { resourceId: 903, name: 'Deuterium', hasSubmitControl: true },
    { resourceId: 902, name: 'Crystal', hasSubmitControl: false },
  ])
})

void test('a column whose image states no name is a decoding failure', async () => {
  await assert.rejects(
    () =>
      trader(sessionOn(fakeServer(pageReply(pageDocument(unnamedTraderColumn(903), true)))), {
        planetId: PLANET_ID,
      }),
    { code: ErrorCode.ParseError, message: 'Missing title on the selected element' },
  )
})

void test('the fee is the one figure the page prints last, and is absent where none is printed', async () => {
  const withFee = merchantOf(
    await trader(
      sessionOn(fakeServer(pageReply(pageDocument(traderColumn(903, 'Deuterium', true), true)))),
      { planetId: PLANET_ID },
    ),
  )
  assert.deepEqual(withFee.paragraphs, [
    'The exchange rate is: 4/2/1',
    'The value of the merchant is 750 Dark Matter!',
  ])
  assert.equal(withFee.fee, 750)
  const withoutFee = merchantOf(
    await trader(
      sessionOn(fakeServer(pageReply(pageDocument(traderColumn(903, 'Deuterium', true), false)))),
      { planetId: PLANET_ID },
    ),
  )
  assert.deepEqual(withoutFee.paragraphs, ['The exchange rate is: 4/2/1'])
  assert.equal(withoutFee.fee, null)
})

void test('a page that prints no paragraph at all states no fee', async () => {
  const bare = gamePage('<div id="trader"></div>', { header: DEFAULT_HEADER })
  const merchant = merchantOf(
    await trader(sessionOn(fakeServer(pageReply(bare))), { planetId: PLANET_ID }),
  )
  assert.deepEqual(merchant.paragraphs, [])
  assert.equal(merchant.fee, null)
})

void test('a page without the merchant block is a decoding failure', async () => {
  await assert.rejects(
    () =>
      trader(sessionOn(fakeServer(pageReply(gamePage('<p>nothing here</p>')))), {
        planetId: PLANET_ID,
      }),
    { code: ErrorCode.ParseError, message: 'Expected one div#trader, found 0' },
  )
})

void test('a trade quote is read from the resource its own form names', async () => {
  const server = fakeServer(pageReply(quoteDocument('{"902": 2, "903": 4}')))
  const answer = await traderTrade(sessionOn(server), { planetId: PLANET_ID, resourceId: 901 })
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, TRADE_URL)
  const quote = quoteOf(answer)
  assert.equal(quote.kind, 'traderTrade')
  assert.equal(quote.planetId, PLANET_ID)
  assert.equal(quote.resourceId, 901)
  assert.equal(quote.sourceResourceName, 'Metal')
  assert.deepEqual(quote.targetResourceIds, [902, 903])
  assert.deepEqual(
    [...quote.rates],
    [
      [902, 2],
      [903, 4],
    ],
  )
})

void test('a quote that prints no name for the resource it sells states none', async () => {
  const quote = quoteOf(
    await traderTrade(
      sessionOn(
        fakeServer(
          pageReply(
            gamePage(withoutSourceResourceName(tradePageContent('{"902": 2, "903": 4}')), {
              header: DEFAULT_HEADER,
            }),
          ),
        ),
      ),
      { planetId: PLANET_ID, resourceId: 901 },
    ),
  )
  assert.equal(quote.sourceResourceName, null)
})

void test('a quote is read from its own form, not from whatever else names a resource', async () => {
  const beside = `${tradePageContent('{"902": 2, "903": 4}')}
    <form action="game.php?page=trader" method="post">
      <input type="hidden" name="mode" value="trade">
      <input type="hidden" name="resource" value="902">
    </form>`
  const quote = quoteOf(
    await traderTrade(
      sessionOn(fakeServer(pageReply(gamePage(beside, { header: DEFAULT_HEADER })))),
      {
        planetId: PLANET_ID,
        resourceId: 901,
      },
    ),
  )
  assert.equal(quote.resourceId, 901)
  assert.deepEqual(quote.targetResourceIds, [902, 903])
})

void test('a quote the page could not have priced is a decoding failure', async () => {
  const malformed: [string, string, string][] = [
    ['a target the quote itself sells', '{"901": 1, "903": 4}', 'Missing or invalid trade rate'],
    ['a target with no rate', '{"903": 4}', 'Missing or invalid trade rate'],
    [
      'a target quoted at a negative rate',
      '{"902": -2, "903": 4}',
      'Missing or invalid trade rate',
    ],
    ['a target quoted at no rate', '{"902": 0, "903": 4}', 'Missing or invalid trade rate'],
  ]
  for (const [name, charge, message] of malformed)
    await assert.rejects(
      () =>
        traderTrade(sessionOn(fakeServer(pageReply(quoteDocument(charge)))), {
          planetId: PLANET_ID,
          resourceId: 901,
        }),
      { code: ErrorCode.ParseError, message },
      name,
    )
})

void test('a quote without the rate table its script binds is a decoding failure', async () => {
  const withoutRates = quoteDocument('{}').replace(/<script[^>]*>var charge = .*?<\/script>/, '')
  await assert.rejects(
    () =>
      traderTrade(sessionOn(fakeServer(pageReply(withoutRates))), {
        planetId: PLANET_ID,
        resourceId: 901,
      }),
    { code: ErrorCode.ParseError, message: 'Expected one charge binding, found 0' },
  )
})

void test('a trade sends the resource it spends and what it receives for it', async () => {
  const server = await expectOperation(
    (session) =>
      traderSend(session, {
        planetId: PLANET_ID,
        resourceId: 901,
        receive: new Map([
          [902, 5],
          [903, 2],
        ]),
      }),
    {
      method: 'POST',
      url: SEND_URL,
      body: [
        ['resource', '901'],
        ['trade[902]', '5'],
        ['trade[903]', '2'],
      ],
    },
  )
  assert.equal(server.requests[0]!.url.searchParams.get('mode'), 'send')
})

void test('the trade quote has a reader of its own, beside the page’s', () => {
  const quote = readTraderTrade(
    parsePage(httpResponse({ body: quoteDocument('{"902": 2, "903": 4}') })),
  )
  assert.equal(quote.kind, 'traderTrade')
  assert.equal(quote.resourceId, 901)
  assert.deepEqual(quote.targetResourceIds, [902, 903])
})
