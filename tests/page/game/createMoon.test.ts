import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { CreateMoonPage, Page } from '../../../src/index.ts'
import {
  ErrorCode,
  createMoon,
  createMoonBuy,
  parsePage,
  readCreateMoon,
} from '../../../src/index.ts'
import { affordableMoonOffer, unaffordableMoonOffer } from '../../fixtures/game/planets.ts'
import {
  BASE_URL,
  PLANET_ID,
  answer,
  expectOperation,
  gamePage,
  httpResponse,
  pageReply,
  read,
} from '../../helpers.ts'

const OFFER_URL = `${BASE_URL}game.php?page=createMoon&cp=${PLANET_ID}`

const ANSWERED_PLANET_ID = 2000

const PRICE_TEXT = '100.000 Deuterium'

const AFFORDABLE: CreateMoonPage = {
  kind: 'createMoon',
  planetId: PLANET_ID,
  observedAtMs: 1,
  priceText: PRICE_TEXT,
  hasSubmitControl: true,
}

const UNAFFORDABLE: CreateMoonPage = { ...AFFORDABLE, hasSubmitControl: false }

function pageOf(content: string, planetId = PLANET_ID): Page {
  return parsePage(httpResponse({ body: gamePage(content, { planetId }) }, OFFER_URL))
}

function submitWithoutLabel(): string {
  return affordableMoonOffer.replace(' value="100.000 Deuterium"', '')
}

function labelWithoutPrice(): string {
  return unaffordableMoonOffer.replace('<span>100.000 Deuterium</span>', '<span></span>')
}

void test('a price the account can pay is read from the submit control’s own label', () => {
  assert.deepEqual(readCreateMoon(pageOf(affordableMoonOffer)), AFFORDABLE)
})

void test('a price the account cannot pay is read from the plain label the control gives way to', () => {
  const document = readCreateMoon(pageOf(unaffordableMoonOffer))
  assert.deepEqual(document, UNAFFORDABLE)

  assert.equal(document.priceText, readCreateMoon(pageOf(affordableMoonOffer)).priceText)
})

void test('a submit whose label the template left out is a decoding failure', () => {
  assert.throws(() => readCreateMoon(pageOf(submitWithoutLabel())), {
    code: ErrorCode.ParseError,
    message: 'Missing value on the selected element',
  })
})

void test('a label stating no price is a decoding failure rather than an empty price', () => {
  assert.throws(() => readCreateMoon(pageOf(labelWithoutPrice())), {
    code: ErrorCode.ParseError,
    message: 'Missing moon price',
  })
})

void test('a document rendering no band is a decoding failure', () => {
  assert.throws(() => readCreateMoon(pageOf('<p>No moon on offer here</p>')), {
    code: ErrorCode.ParseError,
    message: 'Expected one .ticket_bottom_band, found 0',
  })
})

void test('the offer is asked for by address, with no form body', async () => {
  await expectOperation((session) => createMoon(session, { planetId: PLANET_ID }), {
    method: 'GET',
    url: OFFER_URL,
  })
})

void test('the answer to that request is decoded into the offer it rendered', async () => {
  const document = await read(
    (session) => createMoon(session, { planetId: PLANET_ID }),
    pageReply(gamePage(affordableMoonOffer)),
  )

  assert.deepEqual({ ...document, observedAtMs: 1 }, AFFORDABLE)
})

void test('the planet the band was rendered for is reported, not the one the request named', async () => {
  const document = await read(
    (session) => createMoon(session, { planetId: PLANET_ID }),
    pageReply(gamePage(affordableMoonOffer, { planetId: ANSWERED_PLANET_ID })),
  )
  assert.notEqual(ANSWERED_PLANET_ID, PLANET_ID)
  assert.equal(document.planetId, ANSWERED_PLANET_ID)
})

void test('buying the moon posts one empty form to the page’s buy mode', async () => {
  await expectOperation((session) => createMoonBuy(session, { planetId: PLANET_ID }), {
    method: 'POST',

    url: `${OFFER_URL}&mode=buy`,
    body: [],
  })
})

void test('the purchase reports itself as the message page it is answered with', async () => {
  const outcomes = ['The moon has been created', 'You cannot afford this']
  for (const message of outcomes) {
    const observed = await answer(
      (session) => createMoonBuy(session, { planetId: PLANET_ID }),
      pageReply(gamePage(`<div class="ally_contents">${message}</div>`)),
    )
    assert.deepEqual(observed.data, { planetId: 1000, kind: 'message', message }, message)
  }
})
