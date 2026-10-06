import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { EndpointFile, PageRoute } from '../../src/index.ts'
import {
  ADMIN_ROUTES,
  GAME_ROUTES,
  JSON_ROUTE,
  PUBLIC_ROUTES,
  routeRequest,
} from '../../src/index.ts'
import { sessionOn, fakeServer } from '../helpers.ts'

type Named = { name: string; route: PageRoute; group: string }

function namedRoutes<T extends { [K in keyof T]: PageRoute }>(group: string, routes: T): Named[] {
  const named: Named[] = []
  for (const name in routes) named.push({ name, route: routes[name], group })
  return named
}

const ROUTES: readonly Named[] = [
  ...namedRoutes('game.php', GAME_ROUTES),
  ...namedRoutes('admin.php', ADMIN_ROUTES),
  ...namedRoutes('index.php', PUBLIC_ROUTES),
  { name: 'json', route: JSON_ROUTE, group: 'json.php' },
]

void test('bracketed form fields cannot replace owned route parameters', () => {
  const body = new URLSearchParams(
    'page=other&page[]=other&mode[x]=send&cp[]=999&uni[]=2&action[]=delete&keep[]=1&keep[]=2',
  )
  const request = routeRequest(
    sessionOn(fakeServer()),
    { path: 'index.php', page: 'login', query: { action: 'confirm' } },
    { planetId: 1000, method: 'POST', body },
  )
  assert.ok(request.method === 'POST')
  assert.deepEqual(
    [...request.body],
    [
      ['keep[]', '1'],
      ['keep[]', '2'],
    ],
  )
  assert.equal(body.has('page[]'), true)
})

void test('PHP-normalized aliases cannot replace route parameters', () => {
  const aliases = new URLSearchParams([
    [' page', 'settings'],
    ['mode\0suffix', 'send'],
    [' cp[]', '999'],
    ['uni\0suffix', '2'],
    [' action', 'delete'],
    ['trace.id', 'attacker'],
    ['keep', 'yes'],
  ])
  const route: PageRoute = {
    path: 'index.php',
    page: 'login',
    query: { action: 'confirm', trace_id: 'owned' },
  }
  const session = sessionOn(fakeServer())
  const get = routeRequest(session, route, { planetId: 1000, query: aliases })
  assert.equal(get.url.searchParams.has(' page'), false)
  assert.equal(get.url.searchParams.has('mode\0suffix'), false)
  assert.equal(get.url.searchParams.get('trace_id'), 'owned')
  const post = routeRequest(session, route, { planetId: 1000, method: 'POST', body: aliases })
  assert.ok(post.method === 'POST')
  assert.deepEqual([...post.body], [['keep', 'yes']])
  assert.equal(aliases.has(' page'), true)
})

const ENDPOINTS: ReadonlySet<EndpointFile> = new Set<EndpointFile>([
  'game.php',
  'index.php',
  'json.php',
  'admin.php',
])

function triple(route: PageRoute): string {
  return [route.path, route.page ?? '-', route.mode ?? '-', JSON.stringify(route.query ?? {})].join(
    ' ',
  )
}

void test('no two routes name the same document', () => {
  const seen = new Map<string, string>()
  for (const { name, route } of ROUTES) {
    const key = triple(route)
    const previous = seen.get(key)
    assert.equal(previous, undefined, `${name} and ${previous} both name ${key}`)
    seen.set(key, name)
  }
  assert.equal(seen.size, ROUTES.length)
})

void test('each table names one endpoint', () => {
  for (const { name, route } of ROUTES)
    assert.ok(ENDPOINTS.has(route.path), `${name} names ${route.path}`)
  for (const [name, route] of Object.entries(GAME_ROUTES))
    assert.equal(route.path, 'game.php', name)
  for (const [name, route] of Object.entries(ADMIN_ROUTES))
    assert.equal(route.path, 'admin.php', name)
  for (const [name, route] of Object.entries(PUBLIC_ROUTES))
    assert.equal(route.path, 'index.php', name)
  assert.equal(JSON_ROUTE.path, 'json.php')
})

void test('a route without a page is the bare script it names', () => {
  const bare = ROUTES.filter(({ route }) => route.page === undefined).map(({ name }) => name)
  assert.deepEqual(bare, ['adminLogin', 'json'])
})

void test('a page and a mode belong to the route and cannot be supplied by a caller', () => {
  const session = sessionOn(fakeServer())
  for (const { name, route } of ROUTES) {
    const injected = session.pageUrl(route, undefined, { page: 'settled', mode: 'settled' })
    assert.equal(
      injected.searchParams.get('page'),
      route.page ?? null,
      `${name} let a caller name the page`,
    )
    assert.equal(
      injected.searchParams.get('mode'),
      route.mode ?? null,
      `${name} let a caller name the mode`,
    )
  }
})

void test('an injected page or mode does not displace the ones beside it', () => {
  const session = sessionOn(fakeServer())
  const url = session.pageUrl(GAME_ROUTES.overview, undefined, {
    mode: 'settled',
    page: 'settled',
    foo: 'bar',
  })
  assert.equal(url.search, '?foo=bar&page=overview')
})

void test('the route carries its own parameters past the caller', () => {
  const session = sessionOn(fakeServer())
  const url = session.pageUrl(GAME_ROUTES.allianceAdminClose, undefined, { action: 'transfer' })
  assert.equal(url.searchParams.get('action'), 'close')
  assert.equal(url.searchParams.get('mode'), 'admin')
  assert.equal(url.searchParams.get('page'), 'alliance')
})

void test('post fields cannot override a route or its chosen planet and universe', () => {
  const session = sessionOn(fakeServer())
  const request = routeRequest(session, GAME_ROUTES.allianceAdminClose, {
    planetId: 1000,
    method: 'POST',
    body: { page: 'settings', mode: 'show', action: 'transfer', cp: 2, message: 'close' },
  })
  assert.equal(request.url.searchParams.get('page'), 'alliance')
  assert.equal(request.url.searchParams.get('mode'), 'admin')
  assert.equal(request.url.searchParams.get('action'), 'close')
  assert.equal(request.url.searchParams.get('cp'), '1000')
  assert.equal(request.method, 'POST')
  if (request.method === 'POST') assert.deepEqual([...request.body], [['message', 'close']])

  const registration = routeRequest(session, PUBLIC_ROUTES.registerSend, {
    method: 'POST',
    body: { uni: 7, username: 'pilot' },
  })
  assert.equal(registration.url.searchParams.get('uni'), '42')
  assert.equal(registration.method, 'POST')
  if (registration.method === 'POST')
    assert.deepEqual([...registration.body], [['username', 'pilot']])

  const settings = routeRequest(session, GAME_ROUTES.settings, {
    method: 'POST',
    body: { action: 'send' },
  })
  assert.equal(settings.method, 'POST')
  if (settings.method === 'POST') assert.equal(settings.body.get('action'), 'send')
})

void test('the public script carries the universe and the game script does not', () => {
  const session = sessionOn(fakeServer())
  const publicScript = session.pageUrl(PUBLIC_ROUTES.register, undefined, { uni: '7' })
  assert.equal(publicScript.searchParams.get('uni'), '42')
  const game = session.pageUrl(GAME_ROUTES.overview)
  assert.equal(game.searchParams.get('uni'), null)
})

void test('the planet is written as cp and named by the caller', () => {
  const session = sessionOn(fakeServer())
  assert.equal(session.pageUrl(GAME_ROUTES.overview).searchParams.get('cp'), null)
  assert.equal(session.pageUrl(GAME_ROUTES.overview, 1000).searchParams.get('cp'), '1000')

  assert.equal(
    session.pageUrl(GAME_ROUTES.overview, undefined, { cp: 5 }).searchParams.get('cp'),
    '5',
  )
  assert.equal(
    session.pageUrl(GAME_ROUTES.overview, 1000, { cp: 5 }).searchParams.get('cp'),
    '1000',
  )
})

void test('every route resolves against the installation it is addressed to', () => {
  const session = sessionOn(fakeServer())
  for (const { name, route } of ROUTES) {
    const url = session.pageUrl(route)
    assert.equal(url.origin, 'https://uni.example.com', name)
    assert.equal(url.pathname, `/play/${route.path}`, name)
  }
})
