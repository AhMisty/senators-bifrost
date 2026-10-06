import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { StorePage } from '../../../src/index.ts'
import { ErrorCode, store } from '../../../src/index.ts'
import { storeCatalogueBody, storeLinkWithoutPageBody } from '../../fixtures/game/growth.ts'
import {
  BASE_URL,
  fakeServer,
  gamePage,
  pageHtml,
  pageReply,
  sessionOn,
  DEFAULT_HEADER,
} from '../../helpers.ts'

const PAGE_URL = `${BASE_URL}game.php?page=store`

function storeOf(answer: Awaited<ReturnType<typeof store>>): StorePage {
  const data = answer.data
  if (data.kind !== 'store') assert.fail(`expected the store, answered with ${data.kind}`)
  return data
}

function withoutPlanet(): string {
  return pageHtml(`<div id="content">${storeCatalogueBody}</div>`)
}

function cardAt(href: string): string {
  return gamePage(storeLinkWithoutPageBody.replace('href="game.php"', `href="${href}"`), {
    header: DEFAULT_HEADER,
  })
}

void test('the store front is read without naming a planet', async () => {
  const server = fakeServer(pageReply(gamePage(storeCatalogueBody, { header: DEFAULT_HEADER })))
  const answer = await store(sessionOn(server))
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, PAGE_URL)
  const front = storeOf(answer)
  assert.equal(front.kind, 'store')
  assert.equal('planetId' in front, false)
})

void test('store results omit navigation context in popups', async () => {
  const front = storeOf(await store(sessionOn(fakeServer(pageReply(withoutPlanet())))))
  assert.equal('planetId' in front, false)
  assert.equal(front.shops.length, 3)
})

void test('the account store omits the navigation planet', async () => {
  const server = fakeServer(
    pageReply(gamePage(storeCatalogueBody, { planetId: 4242, header: DEFAULT_HEADER })),
  )
  const answer = await store(sessionOn(server))
  assert.equal(server.requests[0]!.url.href, PAGE_URL)
  assert.equal('planetId' in storeOf(answer), false)
})

void test('each card names the shop its address opens and the title it prints', async () => {
  const front = storeOf(
    await store(
      sessionOn(fakeServer(pageReply(gamePage(storeCatalogueBody, { header: DEFAULT_HEADER })))),
    ),
  )
  assert.deepEqual(front.shops, [
    { page: 'artifact', name: 'Artifacts' },
    { page: 'blueprints', name: 'Blueprints' },
    { page: 'premium', name: 'Premium' },
  ])
})

void test('a card leading off this installation is a decoding failure', async () => {
  await assert.rejects(
    () =>
      store(
        sessionOn(
          fakeServer(pageReply(cardAt('https://other.example.com/play/game.php?page=premium'))),
        ),
      ),
    { code: ErrorCode.ParseError, message: 'Unexpected store destination' },
  )
})

void test('a card leading to another script is a decoding failure', async () => {
  await assert.rejects(
    () => store(sessionOn(fakeServer(pageReply(cardAt('./sub/game.php?page=premium'))))),
    { code: ErrorCode.ParseError, message: 'Unexpected store destination' },
  )
})

void test('a card naming no page is a decoding failure', async () => {
  await assert.rejects(
    () => store(sessionOn(fakeServer(pageReply(gamePage(storeLinkWithoutPageBody))))),
    { code: ErrorCode.ParseError, message: 'Unexpected store destination' },
  )
})

void test('a page without the market block is a decoding failure', async () => {
  await assert.rejects(
    () => store(sessionOn(fakeServer(pageReply(gamePage('<p>nothing here</p>'))))),
    { code: ErrorCode.ParseError, message: 'Expected one #market, found 0' },
  )
})
