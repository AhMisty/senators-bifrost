import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ErrorCode,
  overview,
  overviewDelete,
  overviewRename,
  parsePage,
  readOverview,
} from '../../../src/index.ts'
import {
  bonusClaimControl,
  bonusClaimedControl,
  overviewPageContent,
  serverTimeControl,
} from '../../fixtures/game/economy.ts'
import {
  overviewBody,
  overviewDetailsWithoutDiameterBody,
  overviewFleetLogBody,
} from '../../fixtures/game/space.ts'
import {
  BASE_URL,
  PLANET_ID,
  answer,
  expectOperation,
  fakeServer,
  gamePage,
  httpResponse,
  pageReply,
  read,
  sessionOn,
  tickerHeader,
} from '../../helpers.ts'

const HEADER = tickerHeader({
  metal: ['1234', '500', '100000'],
  crystal: ['500', '200', '50000'],
  deuterium: ['100', '50', '10000'],
  energy: ['500', '1234'],
})

const OVERVIEW_URL = `${BASE_URL}game.php?page=overview&cp=${PLANET_ID}`

const SLOT_LINE =
  '<div class="gray_flettab"><div class="transparent">Fleets 2 / 5\n' +
  '<div class="transparent"><span>0 / 1 Expeditions</span></div></div></div>'

const DETAILS_ONLY = '<div id="big_panet"><div class="planetname">Homeworld</div></div>'

function detailsBody(parts: string[]): string {
  const blocks = parts.map((part) => `<div class="right_part">${part}</div>`).join('')
  return `<div id="big_panet"><div class="planetname">Homeworld</div><div class="palnet_big_info">${blocks}</div></div>`
}

function menuEntry(attributes: string, label: string): string {
  return `<a class="big_btn blue btn_menu btn_menu_big" ${attributes}>${label}</a>`
}

void test('the planet home page and its queues come from one response', async () => {
  const server = fakeServer(pageReply(gamePage(overviewBody, { header: HEADER })))
  const observed = await overview(sessionOn(server), { planetId: PLANET_ID })

  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.url.href, OVERVIEW_URL)
  assert.equal(server.requests[0]!.method, 'GET')

  assert.equal(observed.data.kind, 'overview')
  const page = observed.data
  assert.equal(page.planetId, PLANET_ID)

  assert.equal(page.observedAtMs, observed.response.observedAtMs)
  assert.equal(page.name, 'Homeworld')
  assert.deepEqual(page.coordinate, { galaxy: 1, system: 2, planet: 3 })
  assert.equal(page.diameter, 8660)
  assert.deepEqual(page.fields, { used: 10, total: 163 })
  assert.deepEqual(page.temperature, { minimum: -20, maximum: 40 })
  assert.equal(page.rankingText, 'Rank 7 of 100')
  assert.deepEqual(page.selections, { race: 1501, ethic: 1600, government: 1700 })
  assert.equal(page.onlinePlayers, 12)
  assert.equal(page.news, 'News of the day')

  assert.deepEqual(page.construction, [
    { kind: 'building', text: 'Research Lab', remainingSeconds: 120 },
    { kind: 'research', text: 'Espionage Technology', remainingSeconds: null },
  ])

  assert.equal(page.fleetSlots, null)
  assert.equal(page.expeditionSlots, null)
  assert.deepEqual(page.events, [])
  assert.deepEqual(page.dailyBonus, { hasClaimControl: null, nextClaimTimeText: null })
})

void test('the overview explicitly addresses the requested planet', async () => {
  const server = fakeServer(pageReply(gamePage(overviewBody, { header: HEADER })))
  const observed = await overview(sessionOn(server), { planetId: PLANET_ID })
  assert.equal(observed.data.kind, 'overview')
  assert.equal(observed.data.planetId, PLANET_ID)
  assert.equal(server.requests[0]!.url.searchParams.get('cp'), String(PLANET_ID))
})

void test('the fleet slots and the events the page lists are read from that same response', async () => {
  const body = gamePage(SLOT_LINE + overviewFleetLogBody, { header: HEADER })
  const page = await read((session) => overview(session, { planetId: PLANET_ID }), pageReply(body))
  assert.deepEqual(page.fleetSlots, { used: 2, total: 5 })
  assert.deepEqual(page.expeditionSlots, { used: 0, total: 1 })
  assert.equal(page.events.length, 2)
  assert.equal(page.events[0]!.state, 'return')
  assert.equal(page.events[0]!.occursAtMs, 1767225600 * 1000)
  assert.equal(page.events[1]!.state, 'holding')

  assert.equal(page.diameter, null)
  assert.equal(page.fields, null)
  assert.equal(page.temperature, null)
  assert.equal(page.rankingText, null)
  assert.equal(page.coordinate, null)
  assert.deepEqual(page.selections, { race: null, ethic: null, government: null })
  assert.equal(page.onlinePlayers, null)
  assert.equal(page.news, null)
  assert.deepEqual(page.construction, [])
})

void test('a header that renders one slot pair reports the other as absent', async () => {
  const body = gamePage(
    `${DETAILS_ONLY}<div class="gray_flettab"><div class="transparent">Fleets 2 / 5</div></div>`,
    { header: HEADER },
  )
  const page = await read((session) => overview(session, { planetId: PLANET_ID }), pageReply(body))
  assert.deepEqual(page.fleetSlots, { used: 2, total: 5 })
  assert.equal(page.expeditionSlots, null)
})

void test('the daily reward is read from the left menu entry alone', async () => {
  const claims = await read(
    (session) => overview(session, { planetId: PLANET_ID }),
    pageReply(gamePage(overviewPageContent(bonusClaimControl), { header: HEADER })),
  )
  assert.deepEqual(claims.dailyBonus, { hasClaimControl: true, nextClaimTimeText: null })
  const claimed = await read(
    (session) => overview(session, { planetId: PLANET_ID }),
    pageReply(gamePage(overviewPageContent(bonusClaimedControl), { header: HEADER })),
  )
  assert.deepEqual(claimed.dailyBonus, {
    hasClaimControl: false,
    nextClaimTimeText: 'Available in 01:23:45',
  })

  const other = await read(
    (session) => overview(session, { planetId: PLANET_ID }),
    pageReply(gamePage(overviewPageContent(serverTimeControl), { header: HEADER })),
  )
  assert.deepEqual(other.dailyBonus, { hasClaimControl: null, nextClaimTimeText: null })
})

void test('a claim entry that addresses another page is not the reward link', async () => {
  const entry = menuEntry('href="game.php?page=overview"', 'Fleets')
  const page = await read(
    (session) => overview(session, { planetId: PLANET_ID }),
    pageReply(gamePage(overviewPageContent(entry), { header: HEADER })),
  )
  assert.deepEqual(page.dailyBonus, { hasClaimControl: false, nextClaimTimeText: null })
})

void test('two eligible left-menu entries are ambiguous rather than the first one', async () => {
  const page = await read(
    (session) => overview(session, { planetId: PLANET_ID }),
    pageReply(
      gamePage(overviewPageContent(bonusClaimControl + bonusClaimedControl), { header: HEADER }),
    ),
  )
  assert.deepEqual(page.dailyBonus, { hasClaimControl: null, nextClaimTimeText: null })
})

void test('a shipyard card states its own kind and the countdown it animates', async () => {
  const body = gamePage(
    `${DETAILS_ONLY}<div class="flotte"><div class="overvieew9">Recycler <span class="timer" data-time="60"></span></div></div>`,
    { header: HEADER },
  )
  const page = await read((session) => overview(session, { planetId: PLANET_ID }), pageReply(body))
  assert.deepEqual(page.construction, [
    { kind: 'shipyard', text: 'Recycler', remainingSeconds: 60 },
  ])
})

void test('an info block whose field spans are missing states no field counts', async () => {
  const page = await read(
    (session) => overview(session, { planetId: PLANET_ID }),
    pageReply(
      gamePage(detailsBody(['12.800 km (163 / 200)', 'approx. -10°C to 20°C', '[1:2:3]']), {
        header: HEADER,
      }),
    ),
  )
  assert.equal(page.diameter, 12800)
  assert.equal(page.fields, null)
  assert.deepEqual(page.temperature, { minimum: -10, maximum: 20 })
})

void test('a temperature block that states one figure states no range', async () => {
  const page = await read(
    (session) => overview(session, { planetId: PLANET_ID }),
    pageReply(gamePage(detailsBody(['12.800 km', 'approx. 20°C', '[1:2:3]']), { header: HEADER })),
  )
  assert.equal(page.temperature, null)
  assert.equal(page.rankingText, null)
})

void test('a details block that states no diameter is a decoding failure', async () => {
  await assert.rejects(
    () =>
      overview(
        sessionOn(
          fakeServer(pageReply(gamePage(overviewDetailsWithoutDiameterBody, { header: HEADER }))),
        ),
        { planetId: PLANET_ID },
      ),
    { code: ErrorCode.ParseError, message: 'Missing a quantity' },
  )
})

void test('a response without the planet details is a decoding failure', async () => {
  await assert.rejects(
    () =>
      overview(sessionOn(fakeServer(pageReply(gamePage('<p>nothing here</p>')))), {
        planetId: PLANET_ID,
      }),
    { code: ErrorCode.ParseError, message: 'Overview details unavailable' },
  )
})

void test('the planet the answer describes is the document’s own, not the request’s', async () => {
  const body = gamePage(overviewBody, { planetId: 2000, header: HEADER })
  const page = await read((session) => overview(session, { planetId: PLANET_ID }), pageReply(body))
  assert.equal(page.planetId, 2000)
  assert.notEqual(page.planetId, PLANET_ID)
})

void test('the page’s processors are addressed as the server dispatches them', async () => {
  await expectOperation(
    (session) => overviewRename(session, { planetId: PLANET_ID, name: 'Nova' }),
    {
      method: 'POST',
      url: `${OVERVIEW_URL}&mode=rename`,
      body: [['name', 'Nova']],
    },
  )
  await expectOperation(
    (session) => overviewDelete(session, { planetId: PLANET_ID, password: 'secret' }),
    { method: 'POST', url: `${OVERVIEW_URL}&mode=delete`, body: [['password', 'secret']] },
  )
})

void test('a processor reports its outcome in the payload rather than in the status', async () => {
  const accepted = await answer(
    (session) => overviewRename(session, { planetId: PLANET_ID, name: 'Nova' }),
    { body: '{"ok":"Renamed","message":"Planet renamed"}' },
  )
  assert.deepEqual(accepted.data, {
    kind: 'json',
    value: { ok: 'Renamed', message: 'Planet renamed' },
  })
  await assert.rejects(
    answer((session) => overviewDelete(session, { planetId: PLANET_ID, password: 'wrong' }), {
      body: '{"message":"The password is wrong"}',
    }),
    { code: 'server', message: 'The password is wrong' },
  )
})

void test('the decoder is reachable for a document the caller already holds', () => {
  const page = readOverview(
    parsePage(httpResponse({ body: gamePage(overviewBody, { header: HEADER }) })),
  )
  assert.equal(page.kind, 'overview')
  assert.equal(page.name, 'Homeworld')
})
