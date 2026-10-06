import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  DirectShop,
  Observed,
  PageReply,
  PlanetReference,
  Session,
  ShopAction,
  ShopPage,
} from '../../../src/index.ts'
import {
  buyBuild,
  buyBuildSend,
  buyDefense,
  buyDefenseSend,
  buyFleet,
  buyFleetSend,
  buyTech,
  buyTechSend,
} from '../../../src/index.ts'
import { shopPageContent, stockNode } from '../../fixtures/game/economy.ts'
import {
  BASE_URL,
  PLANET_ID,
  expectOperation,
  gamePage,
  pageReply,
  read,
  tickerHeader,
} from '../../helpers.ts'

type Reader = (
  session: Session,
  options: PlanetReference,
) => Promise<Observed<PageReply<ShopPage<DirectShop>>>>

type Row = {
  shop: DirectShop

  entry: { id: number; info: string; items: readonly Record<string, unknown>[] }
  read: Reader
  send: ShopAction
}

const HEADER = tickerHeader({
  metal: ['1000', '10', '100000'],
  crystal: ['1000', '10', '100000'],
  deuterium: ['1000', '10', '100000'],
  energy: ['500', '1234'],
}).concat(stockNode('darkmatter', '500'))

const CURRENCY = 921

const OWNED = '15'

const ROWS: readonly Row[] = [
  {
    shop: 'buyBuild',
    entry: {
      id: 1,
      info: `{"1": ["${OWNED}", "Metal Mine", "4000", "1.4"]}`,
      items: [{ elementId: 1, name: 'Metal Mine', owned: 15, basePrice: 4000, priceFactor: 1.4 }],
    },
    read: buyBuild,
    send: buyBuildSend,
  },

  {
    shop: 'buyTech',
    entry: {
      id: 106,
      info: `{"106": ["${OWNED}", "Spy Technology", "200", "2"]}`,
      items: [
        { elementId: 106, name: 'Spy Technology', owned: 15, basePrice: 200, priceFactor: 2 },
      ],
    },
    read: buyTech,
    send: buyTechSend,
  },

  {
    shop: 'buyFleet',
    entry: {
      id: 202,
      info: `{"202": ["${OWNED}", "Light Cargo", "2000", "1.4"]}`,
      items: [{ elementId: 202, name: 'Light Cargo', owned: 15, unitPrice: 2000 }],
    },
    read: buyFleet,
    send: buyFleetSend,
  },

  {
    shop: 'buyDefense',
    entry: {
      id: 401,
      info: `{"401": ["${OWNED}", "Missile Launcher", "2000", "1.4"]}`,
      items: [{ elementId: 401, name: 'Missile Launcher', owned: 15, unitPrice: 2000 }],
    },
    read: buyDefense,
    send: buyDefenseSend,
  },
]

function readUrl(row: Row): string {
  return `${BASE_URL}game.php?page=${row.shop}&cp=${PLANET_ID}`
}

function documentOf(row: Row): string {
  return gamePage(shopPageContent(row.shop, CURRENCY, [row.entry.id], row.entry.info), {
    header: HEADER,
  })
}

for (const row of ROWS) {
  void test(`the ${row.shop} shop is read from its own address`, async () => {
    const response = pageReply(documentOf(row))

    await expectOperation(
      (session) => row.read(session, { planetId: PLANET_ID }),
      { method: 'GET', url: readUrl(row) },
      response,
    )
    const shop = await read((session) => row.read(session, { planetId: PLANET_ID }), response)
    assert.equal(shop.kind, row.shop)
    assert.equal(shop.planetId, PLANET_ID)
    assert.equal(shop.currencyId, CURRENCY)
    assert.equal(shop.balance, 500)
  })

  void test(`a ${row.shop} entry states what the page holds and what the shop charges for it`, async () => {
    const shop = await read(
      (session) => row.read(session, { planetId: PLANET_ID }),
      pageReply(documentOf(row)),
    )
    assert.deepEqual(shop.items, row.entry.items)
  })

  void test(`a ${row.shop} purchase is sent to the page's own mode rather than to a catalogue address`, async () => {
    const elementId = row.entry.id
    const server = await expectOperation(
      (session) => row.send(session, { planetId: PLANET_ID, elementId, amount: 5 }),
      {
        method: 'POST',
        url: `${readUrl(row)}&mode=send`,
        body: [
          ['Element', String(elementId)],
          ['count', '5'],
        ],
      },
    )
    assert.equal(server.requests[0]!.url.searchParams.get('mode'), 'send')
  })
}
