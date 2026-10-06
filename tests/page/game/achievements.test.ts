import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ErrorCode, achievements, parsePage, readAchievements } from '../../../src/index.ts'
import {
  achievementTooltipBody,
  achievementTooltipWithoutHeadingBody,
  cataloguePageBody,
} from '../../fixtures/game/growth.ts'
import {
  BASE_URL,
  PLANET_ID,
  expectOperation,
  expectRefusal,
  fakeServer,
  httpResponse,
  pageHtml,
  pageReply,
  read,
  sessionOn,
  DEFAULT_HEADER,
} from '../../helpers.ts'

const PAGE_URL = `${BASE_URL}game.php?page=achievements`

function document(content: string): string {
  return pageHtml(cataloguePageBody(content, PLANET_ID, DEFAULT_HEADER))
}

function withoutPlanet(content: string): string {
  return document(content).replace(/<span class="active_urlpalnet"[^>]*><\/span>/, '')
}

void test('a planet-dependent catalogue without its planet header cannot be decoded', async () => {
  const response = pageReply(withoutPlanet(achievementTooltipBody))
  await assert.rejects(achievements(sessionOn(fakeServer(response)), { planetId: PLANET_ID }), {
    code: ErrorCode.ParseError,
  })
})

void test('a planet the caller names is addressed, and reported where the header states one', async () => {
  const response = pageReply(document(achievementTooltipBody))
  await expectOperation(
    (session) => achievements(session, { planetId: PLANET_ID }),
    { method: 'GET', url: `${PAGE_URL}&cp=${PLANET_ID}` },
    response,
  )
  const catalogue = await read(
    (session) => achievements(session, { planetId: PLANET_ID }),
    response,
  )
  assert.equal(catalogue.planetId, PLANET_ID)
})

void test('an entry states its level and the bonuses its tooltip lists', async () => {
  const catalogue = await read(
    (session) => achievements(session, { planetId: PLANET_ID }),
    pageReply(document(achievementTooltipBody)),
  )
  assert.equal(catalogue.items.length, 1)
  const admiral = catalogue.items[0]!
  assert.equal(admiral.elementId, 601)
  assert.equal(admiral.name, 'Admiral')
  assert.deepEqual([admiral.owned, admiral.maximumLevel], [3, 20])

  assert.deepEqual(admiral.effects, [{ name: 'Fleet speed', amount: 10, unit: 'percent' }])
  assert.deepEqual(admiral.requirements, [
    { elementId: null, name: 'Energy tech 5', progress: null },
  ])

  assert.equal(admiral.hasSubmitControl, false)
  assert.equal(admiral.remainingSeconds, null)
})

void test('a bonus tooltip without its heading is a decoding failure', async () => {
  await assert.rejects(
    () =>
      achievements(
        sessionOn(fakeServer(pageReply(document(achievementTooltipWithoutHeadingBody)))),
        { planetId: PLANET_ID },
      ),
    { code: ErrorCode.ParseError, message: 'Missing growth bonus heading' },
  )
})

void test('a refusal is reported as the message page the server rendered in its place', async () => {
  await expectRefusal(
    (session) => achievements(session, { planetId: PLANET_ID }),
    'Not permitted',
    PLANET_ID,
  )
})

void test('the reader decodes a response the caller already holds', () => {
  const decoded = readAchievements(
    parsePage(httpResponse({ body: document(achievementTooltipBody) })),
  )
  assert.equal(decoded.kind, 'achievements')
  assert.equal(decoded.planetId, PLANET_ID)
  assert.equal(decoded.observedAtMs, 1)
  assert.equal(decoded.items.length, 1)
})
