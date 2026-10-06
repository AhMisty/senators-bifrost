import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Fetch, LoginArguments, SessionOptions } from '../src/index.ts'
import {
  Session,
  ServerError,
  buildings,
  publicIndex,
  publicLogin,
  logout,
  dispatchFleet,
  sendMessage,
  post,
} from '../src/index.ts'
import { fleetStep1PreviewBody } from './fixtures/game/space.ts'
import { BASE_URL, fakeServer, gamePage, pageReply } from './helpers.ts'

const CREDENTIALS = { username: 'pilot', password: 'secret' }
const CONFIRMED = {
  status: 302,
  headers: { Location: './game.php', 'Set-Cookie': '2Moons=fresh; path=/' },
}
const EXPIRED = { status: 302, headers: { Location: './index.php?code=3' } }
const COMPOSE =
  '<div class="message_recipient_name">Scout [1:2:3]</div>' +
  '<form name="message" action="" method="post"><input name="subject" value="New subject"><textarea name="text"></textarea></form>'

void test('confirmed credential overrides become defaults for automatic login', async () => {
  const server = fakeServer([CONFIRMED, EXPIRED, CONFIRMED, {}])
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    autoLogin: true,
    fetch: server.fetch,
  })
  await publicLogin(session, {
    universe: 2,
    username: 'other',
    password: 'changed',
    language: 'zh',
  })
  await buildings(session, { planetId: 1000 })
  assert.equal(session.universe, 2)
  assert.equal(session.sessionToken, 'fresh')
  assert.equal(server.requests.length, 4)
  for (const index of [0, 2]) {
    const request = server.requests[index]!
    assert.equal(request.url.searchParams.get('uni'), '2')
    assert.equal(request.url.searchParams.get('lang'), 'zh')
    assert.equal(request.body?.get('username'), 'other')
    assert.equal(request.body?.get('password'), 'changed')
  }
})

void test('failed credential overrides preserve the token and defaults', async () => {
  const server = fakeServer([
    { status: 302, headers: { Location: './index.php?code=1' } },
    CONFIRMED,
  ])
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    sessionToken: 'old',
    fetch: server.fetch,
  })
  await assert.rejects(session.login({ universe: 2, username: 'other' }), ServerError)
  assert.equal(session.universe, 1)
  assert.equal(session.sessionToken, 'old')
  await session.login()
  assert.equal(server.requests[1]!.body?.get('username'), CREDENTIALS.username)
  assert.equal(server.requests[1]!.url.searchParams.get('uni'), '1')
})

void test('manual logins each send their own request', async () => {
  const server = fakeServer(CONFIRMED)
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    fetch: server.fetch,
  })
  const results = await Promise.all([session.login(), session.login()])
  assert.ok(results.every((result) => result.data.kind === 'login'))
  assert.equal(server.requests.length, 2)
})

void test('automatic login is opt-in and public calls do not trigger it', async () => {
  const manual = fakeServer(EXPIRED)
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    fetch: manual.fetch,
  })
  await assert.rejects(buildings(session, { planetId: 1000 }), ServerError)
  assert.equal(manual.requests.length, 1)
  const server = fakeServer({})
  const automatic = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    autoLogin: true,
    fetch: server.fetch,
  })
  await publicIndex(automatic)
  await automatic.request({ url: automatic.endpoint('json.php'), withCookie: false })
  assert.equal(server.requests.length, 2)
  assert.ok(server.requests.every((request) => request.headers.Cookie === undefined))
})

void test('a missing token triggers login before the first authenticated request', async () => {
  const server = fakeServer([CONFIRMED, {}])
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    autoLogin: true,
    fetch: server.fetch,
  })
  await buildings(session, { planetId: 1000 })
  assert.equal(server.requests.length, 2)
  assert.equal(server.requests[0]!.url.searchParams.get('page'), 'login')
  assert.equal(server.requests[1]!.headers.Cookie, '2Moons=fresh')
})

void test('an unconfirmed automatic login reports its actual response', async () => {
  const server = fakeServer({ body: 'Unconfirmed' })
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    autoLogin: true,
    fetch: server.fetch,
  })
  await assert.rejects(session.request({ url: session.endpoint('json.php') }), (error: unknown) => {
    assert.ok(error instanceof ServerError)
    assert.equal(error.serverCode, 'login-unconfirmed')
    assert.equal(error.response?.body, 'Unconfirmed')
    return true
  })
  assert.equal(server.requests.length, 1)
})

void test('concurrent first requests wait for one automatic login', async () => {
  const started = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  let logins = 0,
    reads = 0
  const fetch: Fetch = async (input) => {
    assert.ok(input instanceof URL)
    if (input.searchParams.get('page') === 'login') {
      logins++
      started.resolve()
      await release.promise
      return new Response(null, { status: 302, headers: CONFIRMED.headers })
    }
    reads++
    return new Response('Ready')
  }
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    autoLogin: true,
    fetch,
  })
  const first = session.request({ url: session.endpoint('json.php') })
  await started.promise
  const second = session.requestBytes({ url: session.endpoint('json.php') })
  assert.equal(reads, 0)
  release.resolve()
  const [text, bytes] = await Promise.all([first, second])
  assert.equal(text.body, 'Ready')
  assert.equal(new TextDecoder().decode(bytes.body), 'Ready')
  assert.equal(logins, 1)
  assert.equal(reads, 2)
})

void test('failed automatic login releases every waiter and permits another attempt', async () => {
  const started = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  let logins = 0,
    reads = 0
  const fetch: Fetch = async (input) => {
    assert.ok(input instanceof URL)
    if (input.searchParams.get('page') !== 'login') {
      reads++
      return new Response('Ready')
    }
    logins++
    if (logins === 1) {
      started.resolve()
      await release.promise
      return new Response(null, { status: 302, headers: { Location: './index.php?code=1' } })
    }
    return new Response(null, { status: 302, headers: CONFIRMED.headers })
  }
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    autoLogin: true,
    fetch,
  })
  const first = session.request({ url: session.endpoint('json.php') })
  await started.promise
  const second = session.requestBytes({ url: session.endpoint('json.php') })
  const settled = Promise.allSettled([first, second])
  release.resolve()
  for (const result of await settled) {
    assert.equal(result.status, 'rejected')
    if (result.status === 'rejected') assert.ok(result.reason instanceof ServerError)
  }
  assert.equal(reads, 0)
  assert.equal((await session.request({ url: session.endpoint('json.php') })).body, 'Ready')
  assert.equal(logins, 2)
})

void test('concurrent expiry responses share an in-progress automatic login', async () => {
  const started = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  let logins = 0
  const cookies: (string | null)[] = []
  const fetch: Fetch = async (input, init) => {
    assert.ok(input instanceof URL)
    if (input.searchParams.get('page') === 'login') {
      logins++
      started.resolve()
      await release.promise
      return new Response(null, { status: 302, headers: CONFIRMED.headers })
    }
    const cookie = new Headers(init?.headers).get('Cookie')
    cookies.push(cookie)
    return cookie === '2Moons=old'
      ? new Response(null, { status: 302, headers: EXPIRED.headers })
      : new Response('Ready')
  }
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    autoLogin: true,
    sessionToken: 'old',
    fetch,
  })
  const requests = Array.from({ length: 4 }, () =>
    session.request({ url: session.endpoint('json.php') }),
  )
  await started.promise
  release.resolve()
  assert.ok((await Promise.all(requests)).every((response) => response.body === 'Ready'))
  assert.equal(logins, 1)
  assert.equal(cookies.filter((cookie) => cookie === '2Moons=old').length, 4)
  assert.equal(cookies.filter((cookie) => cookie === '2Moons=fresh').length, 4)
})

void test('a delayed expiry reuses the session established by another request', async () => {
  const release = Promise.withResolvers<void>()
  let logins = 0
  const cookies: (string | null)[] = []
  const fetch: Fetch = async (input, init) => {
    assert.ok(input instanceof URL)
    if (input.searchParams.get('page') === 'login') {
      logins++
      return new Response(null, { status: 302, headers: CONFIRMED.headers })
    }
    const cookie = new Headers(init?.headers).get('Cookie')
    cookies.push(cookie)
    if (cookie !== '2Moons=old') return new Response('Ready')
    if (cookies.length === 2) await release.promise
    return new Response(null, { status: 302, headers: EXPIRED.headers })
  }
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    autoLogin: true,
    sessionToken: 'old',
    fetch,
  })
  const first = session.request({ url: session.endpoint('json.php') })
  const second = session.requestBytes({ url: session.endpoint('json.php') })
  assert.equal((await first).body, 'Ready')
  release.resolve()
  assert.equal(new TextDecoder().decode((await second).body), 'Ready')
  assert.equal(logins, 1)
  assert.deepEqual(cookies, ['2Moons=old', '2Moons=old', '2Moons=fresh', '2Moons=fresh'])
})

void test('one request retries an expiry once and reports a second refusal', async () => {
  const server = fakeServer([EXPIRED, CONFIRMED, EXPIRED])
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    autoLogin: true,
    sessionToken: 'old',
    fetch: server.fetch,
  })
  await assert.rejects(buildings(session, { planetId: 1000 }), { code: 'server', serverCode: '3' })
  assert.equal(server.requests.length, 3)
})

void test('credential refusals and foreign redirects do not trigger recovery', async () => {
  for (const location of [
    './index.php?code=1',
    './game.php?code=3',
    'https://other.example/index.php?code=3',
  ]) {
    const server = fakeServer({ status: 302, headers: { Location: location } })
    const session = new Session({
      baseUrl: BASE_URL,
      universe: 1,
      ...CREDENTIALS,
      autoLogin: true,
      sessionToken: 'old',
      fetch: server.fetch,
    })
    const response = await session.request({ url: session.endpoint('json.php') })
    assert.equal(response.headers.get('Location'), location)
    assert.equal(server.requests.length, 1)
  }
})

void test('token replacement is independent of stored login defaults', async () => {
  const server = fakeServer([{}, EXPIRED, CONFIRMED, {}])
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    autoLogin: true,
    sessionToken: 'old',
    fetch: server.fetch,
  })
  await session.request({ url: session.endpoint('json.php') })
  session.sessionToken = 'replacement'
  await session.request({ url: session.endpoint('json.php') })
  assert.equal(server.requests[0]!.headers.Cookie, '2Moons=old')
  assert.equal(server.requests[1]!.headers.Cookie, '2Moons=replacement')
  assert.equal(server.requests[2]!.body?.get('username'), CREDENTIALS.username)
  assert.equal(server.requests[3]!.headers.Cookie, '2Moons=fresh')
})

void test('logout clears the token without changing the automatic-login setting', async () => {
  const server = fakeServer([{}, CONFIRMED, {}])
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    autoLogin: true,
    sessionToken: 'old',
    fetch: server.fetch,
  })
  await logout(session)
  assert.equal(session.sessionToken, '')
  assert.equal(session.autoLogin, true)
  await buildings(session, { planetId: 1000 })
  assert.deepEqual(
    server.requests.map((request) => request.url.searchParams.get('page')),
    ['logout', 'login', 'buildings'],
  )
})

void test('raw POST recovery resends the current request without interpreting its form', async () => {
  const server = fakeServer([EXPIRED, CONFIRMED, { body: 'Server refusal' }])
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    autoLogin: true,
    sessionToken: 'old',
    fetch: server.fetch,
  })
  const response = await post(session, {
    url: 'game.php?page=messages',
    body: { mode: 'send', id: 7, text: 'Hello' },
  })
  assert.equal(response.body, 'Server refusal')
  assert.equal(server.requests.length, 3)
  assert.equal(server.requests[0]!.body?.toString(), server.requests[2]!.body?.toString())
})

void test('message recovery does not rebuild the workflow form', async () => {
  const server = fakeServer([
    pageReply(gamePage(COMPOSE)),
    EXPIRED,
    CONFIRMED,
    { body: '"Missing message token"' },
  ])
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    autoLogin: true,
    sessionToken: 'old',
    fetch: server.fetch,
  })
  const result = await sendMessage(session, { recipientId: 7, text: 'Hello' })
  assert.equal(result.stage, 'send')
  if (result.stage !== 'send') assert.fail('Missing send result')
  assert.deepEqual(result.send.data, { kind: 'json', value: 'Missing message token' })
  assert.deepEqual(
    server.requests.map((request) => request.url.searchParams.get('mode')),
    ['write', 'send', null, 'send'],
  )
})

void test('fleet recovery does not rebuild draft tokens', async () => {
  const server = fakeServer([
    pageReply(gamePage(fleetStep1PreviewBody)),
    EXPIRED,
    CONFIRMED,
    { body: '"Missing fleet token"' },
  ])
  const session = new Session({
    baseUrl: BASE_URL,
    universe: 1,
    ...CREDENTIALS,
    autoLogin: true,
    sessionToken: 'old',
    fetch: server.fetch,
  })
  const result = await dispatchFleet(session, {
    origin: { planetId: 1000 },
    ships: new Map([[202, 5]]),
    target: { galaxy: 1, system: 2, planet: 4, type: 1 },
    speed: 10,
    mission: 3,
  })
  assert.equal(result.stage, 'destination')
  assert.deepEqual(
    server.requests.map((request) => request.url.searchParams.get('page')),
    ['fleetStep1', 'fleetStep2', 'login', 'fleetStep2'],
  )
  assert.equal(server.requests[1]!.body?.get('token'), server.requests[3]!.body?.get('token'))
})

void test('message workflows keep each recipient compose and send together', async () => {
  const started = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  const requests: string[] = []
  const fetch: Fetch = async (input) => {
    assert.ok(input instanceof URL)
    const id = input.searchParams.get('id'),
      mode = input.searchParams.get('mode')
    requests.push(`${mode}:${id}`)
    if (mode === 'write' && id === '7') {
      started.resolve()
      await release.promise
    }
    return new Response(mode === 'write' ? gamePage(COMPOSE) : '"Message sent"')
  }
  const session = new Session({ baseUrl: BASE_URL, universe: 1, sessionToken: 'old', fetch })
  const first = sendMessage(session, { recipientId: 7, text: 'First' })
  await started.promise
  const second = sendMessage(session, { recipientId: 8, text: 'Second' })
  assert.deepEqual(requests, ['write:7'])
  release.resolve()
  const results = await Promise.all([first, second])
  assert.ok(results.every((result) => result.stage === 'send'))
  assert.deepEqual(requests, ['write:7', 'send:7', 'write:8', 'send:8'])
})

/**
 * Credential requirements remain enforced when runtime checks rely on TypeScript callers.
 *
 * 调用方输入由 TypeScript 约束，凭据要求仍须在编译期验证。
 */
type Assert<Condition extends true> = Condition
type Base = { baseUrl: string; universe: number }
type Configured = Base & { username: string; password: string }
type PartialIdentity = Base & { username: string }

export type AutomaticNeedsCredentials = Assert<
  Base & { autoLogin: true } extends SessionOptions ? false : true
>
export type ConfiguredLoginCanUseDefaults = Assert<
  [] extends LoginArguments<Configured> ? true : false
>
export type MissingCredentialsNeedOverrides = Assert<[] extends LoginArguments<Base> ? false : true>
export type PartialDefaultsNeedPassword = Assert<
  [{ universe: number }] extends LoginArguments<PartialIdentity> ? false : true
>
export type PartialDefaultsCanSupplyPassword = Assert<
  [{ password: string }] extends LoginArguments<PartialIdentity> ? true : false
>
export type UniverseCanBeOverridden = Assert<
  [{ universe: number }] extends Parameters<Session<Configured>['login']> ? true : false
>
