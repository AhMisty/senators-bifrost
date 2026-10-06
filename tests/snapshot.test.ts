import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setImmediate } from 'node:timers/promises'

import {
  information,
  overview,
  searchResult,
  Session,
  snapshotAccount,
  snapshotPlanet,
  OperationError,
  ServerError,
} from '../src/index.ts'
import type { SnapshotResult } from '../src/index.ts'
import { empireMatrixBody } from './fixtures/game/planets.ts'
import {
  BASE_URL,
  DEFAULT_HEADER,
  fakeServer,
  fulfilled,
  gamePage,
  pageReply,
  sessionOn,
} from './helpers.ts'

const REDIRECT = { status: 302, headers: { Location: 'index.php?code=3' } }
const INTERNAL_REDIRECT = { status: 302, headers: { Location: 'game.php?page=overview' } }

function rejected<T>(result: SnapshotResult<T>): unknown {
  if (result.status !== 'rejected') assert.fail('Missing rejected entry')
  return result.reason
}

void test('planet snapshots read six core pages and caller-selected extensions', async () => {
  const server = fakeServer(INTERNAL_REDIRECT)
  const snapshot = await snapshotPlanet(sessionOn(server), {
    concurrency: 6,
    planetId: 1000,
    additional: [
      {
        name: 'detail',
        read: (session, planet) => information(session, { ...planet, elementId: 202 }),
      },
    ],
  })
  assert.equal(snapshot.kind, 'planetSnapshot')
  assert.equal(snapshot.planetId, 1000)
  assert.ok(snapshot.completedAtMs >= snapshot.startedAtMs)
  for (const result of [
    snapshot.overview,
    snapshot.buildings,
    snapshot.shipyard,
    snapshot.resources,
    snapshot.planet,
    snapshot.findDebris,
  ])
    if (result.status === 'fulfilled') assert.equal(result.value.data.kind, 'redirect')
    else assert.fail('Missing core observation')
  assert.equal(snapshot.additional[0]?.name, 'detail')
  assert.equal(fulfilled(snapshot.additional[0].result).data.kind, 'redirect')
  assert.deepEqual(
    server.requests.map((request) => request.url.searchParams.get('page')),
    ['overview', 'buildings', 'shipyard', 'resources', 'planet', 'findDebris', 'information'],
  )
  assert.ok(
    server.requests.every(
      (request) => request.method === 'GET' && request.url.searchParams.get('cp') === '1000',
    ),
  )
  assert.equal(server.requests.at(-1)?.url.searchParams.get('id'), '202')
})

void test('account snapshots read account state once and bind extensions to the correct body', async () => {
  const server = fakeServer([
    pageReply(gamePage(empireMatrixBody(), { header: DEFAULT_HEADER })),
    ...Array.from({ length: 20 }, () => INTERNAL_REDIRECT),
  ])
  const snapshot = await snapshotAccount(sessionOn(server), {
    concurrency: 6,
    planetId: 1000,
    additionalByPlanet: new Map([
      [
        1001,
        [
          {
            name: 'detail',
            read: (session, planet) => information(session, { ...planet, elementId: 202 }),
          },
        ],
      ],
    ]),
    additional: [{ name: 'search', read: (session) => searchResult(session, { term: 'Scout' }) }],
  })
  assert.equal(snapshot.kind, 'accountSnapshot')
  assert.equal(fulfilled(snapshot.control).data.kind, 'control')
  assert.equal(fulfilled(snapshot.notifications).data.kind, 'redirect')
  assert.equal(fulfilled(snapshot.research).data.kind, 'redirect')
  assert.deepEqual(
    snapshot.planets.map((planet) => planet.planetId),
    [1000, 1001],
  )
  assert.deepEqual(snapshot.planets[0]?.additional, [])
  assert.equal(snapshot.planets[1]?.additional[0]?.name, 'detail')
  assert.equal(snapshot.additional[0]?.name, 'search')
  assert.ok(snapshot.completedAtMs >= snapshot.startedAtMs)
  assert.equal(server.requests.length, 17)
  const researchRequests = server.requests.filter(
    (request) => request.url.searchParams.get('page') === 'research',
  )
  assert.equal(researchRequests.length, 1)
  assert.equal(researchRequests[0]?.url.searchParams.get('cp'), '1000')
  const detail = server.requests.find(
    (request) => request.url.searchParams.get('page') === 'information',
  )
  assert.equal(detail?.url.searchParams.get('cp'), '1001')
  assert.equal(server.requests.at(-1)?.url.searchParams.has('cp'), false)
})

void test('an inaccessible empire preserves account observations without inventing planets', async () => {
  const server = fakeServer(INTERNAL_REDIRECT)
  const snapshot = await snapshotAccount(sessionOn(server), { concurrency: 6, planetId: 1000 })
  assert.equal(fulfilled(snapshot.control).data.kind, 'redirect')
  assert.deepEqual(snapshot.planets, [])
  assert.deepEqual(snapshot.additional, [])
  assert.equal(server.requests.length, 3)
})

void test('external redirects remain fulfilled receipts', async () => {
  const server = fakeServer({ status: 302, headers: { Location: 'https://other.example/' } })
  const snapshot = await snapshotPlanet(sessionOn(server), { concurrency: 6, planetId: 1000 })
  assert.equal(fulfilled(snapshot.overview).data.kind, 'redirect')
  assert.equal(server.requests.length, 6)
})

void test('initial authentication failure skips remaining core and extension requests', async () => {
  for (const code of ['1', '3', '4', '5']) {
    const server = fakeServer({ status: 302, headers: { Location: `index.php?code=${code}` } })
    const snapshot = await snapshotPlanet(sessionOn(server), {
      concurrency: 6,
      planetId: 1000,
      additional: [{ name: 'extra', read: overview }],
    })
    const reason = rejected(snapshot.overview)
    assert.ok(reason instanceof ServerError)
    assert.equal(reason.serverCode, code)
    assert.equal(snapshot.buildings.status, 'skipped')
    assert.equal(snapshot.additional[0]?.result.status, 'skipped')
    assert.equal(server.requests.length, 1)
  }
  const server = fakeServer(REDIRECT)
  const snapshot = await snapshotAccount(sessionOn(server), {
    concurrency: 6,
    planetId: 1000,
    additional: [{ name: 'extra', read: (session) => overview(session, { planetId: 1000 }) }],
  })
  assert.ok(rejected(snapshot.control) instanceof ServerError)
  assert.equal(snapshot.notifications.status, 'skipped')
  assert.equal(snapshot.research.status, 'skipped')
  assert.deepEqual(snapshot.planets, [])
  assert.equal(snapshot.additional[0]?.result.status, 'skipped')
  assert.equal(server.requests.length, 1)
})

void test('authentication loss preserves in-flight observations and skips later extensions', async () => {
  const server = fakeServer([
    INTERNAL_REDIRECT,
    REDIRECT,
    ...Array.from({ length: 4 }, () => INTERNAL_REDIRECT),
  ])
  const snapshot = await snapshotPlanet(sessionOn(server), {
    concurrency: 6,
    planetId: 1000,
    additional: [{ name: 'extra', read: overview }],
  })
  assert.equal(fulfilled(snapshot.overview).data.kind, 'redirect')
  assert.ok(rejected(snapshot.buildings) instanceof ServerError)
  assert.equal(snapshot.findDebris.status, 'fulfilled')
  assert.equal(snapshot.additional[0]?.result.status, 'skipped')
  assert.equal(server.requests.length, 6)
})

void test('authentication loss after control retains known bodies with skipped components', async () => {
  const server = fakeServer([
    pageReply(gamePage(empireMatrixBody(), { header: DEFAULT_HEADER })),
    REDIRECT,
    INTERNAL_REDIRECT,
  ])
  const snapshot = await snapshotAccount(sessionOn(server), { concurrency: 6, planetId: 1000 })
  assert.equal(fulfilled(snapshot.control).data.kind, 'control')
  assert.ok(rejected(snapshot.notifications) instanceof ServerError)
  assert.equal(snapshot.research.status, 'fulfilled')
  assert.deepEqual(
    snapshot.planets.map((planet) => planet.planetId),
    [1000, 1001],
  )
  assert.ok(
    snapshot.planets.every(
      (planet) => planet.overview.status === 'skipped' && planet.buildings.status === 'skipped',
    ),
  )
  assert.equal(server.requests.length, 3)
})

void test('core parsing errors retain their response without discarding independent observations', async () => {
  const server = fakeServer([
    INTERNAL_REDIRECT,
    pageReply(gamePage('')),
    ...Array.from({ length: 4 }, () => INTERNAL_REDIRECT),
  ])
  const snapshot = await snapshotPlanet(sessionOn(server), { concurrency: 6, planetId: 1000 })
  const reason = rejected(snapshot.buildings)
  assert.ok(reason instanceof OperationError)
  assert.equal(reason.code, 'parse')
  assert.equal(reason.response?.url.searchParams.get('page'), 'buildings')
  assert.equal(snapshot.findDebris.status, 'fulfilled')
  assert.equal(server.requests.length, 6)
})

void test('failed primary parsing still allows independent planet and account observations', async () => {
  const planetServer = fakeServer([
    pageReply(gamePage('')),
    ...Array.from({ length: 5 }, () => INTERNAL_REDIRECT),
  ])
  const planet = await snapshotPlanet(sessionOn(planetServer), { concurrency: 6, planetId: 1000 })
  assert.ok(rejected(planet.overview) instanceof OperationError)
  assert.equal(planet.findDebris.status, 'fulfilled')
  assert.equal(planetServer.requests.length, 6)
  const accountServer = fakeServer([pageReply(gamePage('')), INTERNAL_REDIRECT, INTERNAL_REDIRECT])
  const account = await snapshotAccount(sessionOn(accountServer), {
    concurrency: 6,
    planetId: 1000,
  })
  assert.ok(rejected(account.control) instanceof OperationError)
  assert.deepEqual(account.planets, [])
  assert.equal(account.notifications.status, 'fulfilled')
  assert.equal(account.research.status, 'fulfilled')
  assert.equal(accountServer.requests.length, 3)
})

void test('network errors retain their identity and are not retried', async () => {
  const failure = new TypeError('Connection failed')
  let calls = 0
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    fetch: async () => {
      calls++
      if (calls === 1) throw failure
      return new Response(null, INTERNAL_REDIRECT)
    },
  })
  const snapshot = await snapshotPlanet(session, { concurrency: 6, planetId: 1000 })
  assert.equal(rejected(snapshot.overview), failure)
  assert.equal(snapshot.findDebris.status, 'fulfilled')
  assert.equal(calls, 6)
})

void test('core and extension reads honor sequential, bounded and unlimited budgets', async () => {
  for (const concurrency of [1, 3, null]) {
    const pending: (() => void)[] = []
    let active = 0,
      maximum = 0,
      calls = 0,
      finished = false
    const session = new Session({
      baseUrl: BASE_URL,
      universe: 1,
      fetch: () => {
        calls++
        if (calls === 1) return Promise.resolve(new Response(null, INTERNAL_REDIRECT))
        const deferred = Promise.withResolvers<Response>()
        active++
        maximum = Math.max(maximum, active)
        pending.push(() => {
          active--
          deferred.resolve(new Response(null, INTERNAL_REDIRECT))
        })
        return deferred.promise
      },
    })
    const request = snapshotPlanet(session, {
      concurrency,
      planetId: 1000,
      additional: [
        { name: 'first', read: overview },
        { name: 'second', read: overview },
      ],
    }).then((result) => {
      finished = true
      return result
    })
    await setImmediate()
    assert.equal(active, concurrency === null ? 5 : concurrency)
    for (let turn = 0; turn < 20; turn++) {
      if (finished) break
      for (const resolve of pending.splice(0)) resolve()
      await setImmediate()
    }
    assert.equal(finished, true)
    const result = await request
    assert.equal(maximum, concurrency === null ? 5 : concurrency)
    assert.equal(calls, 8)
    assert.equal(result.additional.length, 2)
  }
})

void test('authentication failure cancels queued core reads under a sequential budget', async () => {
  const server = fakeServer([INTERNAL_REDIRECT, REDIRECT])
  const snapshot = await snapshotPlanet(sessionOn(server), { concurrency: 1, planetId: 1000 })
  assert.equal(snapshot.overview.status, 'fulfilled')
  assert.ok(rejected(snapshot.buildings) instanceof ServerError)
  assert.equal(snapshot.shipyard.status, 'skipped')
  assert.equal(snapshot.findDebris.status, 'skipped')
  assert.equal(server.requests.length, 2)
})
