import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { HttpResponse } from '../src/index.ts'
import { ServerError, Session, get, post } from '../src/index.ts'
import { BASE_URL, PLANET_ID, TOKEN, fakeServer, pageReply, sessionOn } from './helpers.ts'

const LOGIN_URL = `${BASE_URL}index.php?page=login&uni=42`

const LOGIN_REFUSED = pageReply(
  [
    '<main role="main">',
    '<div class="card mb-3">',
    '<h5 class="card-header">Login</h5>',
    '<div class="card-body"><p class="card-text">Wrong password</p></div>',
    '</div>',
    '</main>',
  ].join(''),
)

const CREDENTIALS = { username: 'pilot', password: 'secret' }

void test('manual raw requests preserve redirect headers without parsing them', async () => {
  const server = fakeServer({
    status: 302,
    headers: { Location: 'http://[' },
    body: 'Raw response',
  })
  const session = sessionOn(server)
  const received = await session.request({ url: session.endpoint('game.php') })
  assert.equal(received.status, 302)
  assert.equal(received.body, 'Raw response')
  assert.equal(received.headers.get('Location'), 'http://[')
  assert.equal(server.requests.length, 1)
  assert.throws(() => session.location(received), {
    code: 'parse',
    message: 'Invalid response URL',
  })
})

void test('a login posts the credentials to the public script without a cookie', async () => {
  const server = fakeServer({ status: 302, headers: { Location: './game.php' } })
  await sessionOn(server).login(CREDENTIALS)
  assert.equal(server.requests.length, 1)
  const request = server.requests[0]!
  assert.equal(request.method, 'POST')
  assert.equal(request.url.href, LOGIN_URL)
  assert.equal(request.headers['Cookie'], undefined)
  assert.equal(request.headers['Content-Type'], 'application/x-www-form-urlencoded')

  assert.deepEqual(
    [...(request.body ?? [])],
    [
      ['username', 'pilot'],
      ['password', 'secret'],
    ],
  )
})

void test('a login is confirmed by the cookie and the redirect together', async () => {
  const server = fakeServer({
    status: 302,
    headers: { Location: './game.php', 'Set-Cookie': ['2Moons=confirmed; path=/'] },
  })
  const session = sessionOn(server, { sessionToken: '' })
  const answer = await session.login(CREDENTIALS)
  assert.deepEqual(answer.data, { kind: 'login', sessionToken: 'confirmed' })

  assert.equal(session.sessionToken, 'confirmed')
  await session.request({ url: new URL(`${BASE_URL}game.php?page=overview`) })
  assert.equal(server.requests[1]!.headers['Cookie'], '2Moons=confirmed')
})

void test('the last cookie the server set is the one the session keeps', async () => {
  const server = fakeServer({
    headers: {
      Location: './game.php',
      'Set-Cookie': ['2Moons=stale; path=/', 'other=1; path=/', '2Moons=live; path=/'],
    },
    status: 302,
  })
  const answer = await sessionOn(server, { sessionToken: '' }).login(CREDENTIALS)
  assert.deepEqual(answer.data, { kind: 'login', sessionToken: 'live' })
})

void test('an answer with only one half of the handshake is reported, not trusted', async () => {
  const cases: [string, Record<string, string>][] = [
    ['no cookie', { Location: './game.php' }],
    ['no redirect', { 'Set-Cookie': '2Moons=confirmed; path=/' }],
    ['redirect elsewhere', { Location: './register.php', 'Set-Cookie': '2Moons=x' }],
    ['a cookie the server cleared', { Location: './game.php', 'Set-Cookie': '2Moons=; path=/' }],
  ]
  for (const [name, headers] of cases) {
    const server = fakeServer({ status: 302, headers, body: LOGIN_REFUSED.body })
    const session = sessionOn(server, { sessionToken: '' })
    const answer = await session.login(CREDENTIALS)
    assert.notEqual(answer.data.kind, 'login', name)
    assert.equal(session.sessionToken, '', name)
  }

  const server = fakeServer({
    headers: { 'Set-Cookie': '2Moons=confirmed; path=/' },
    body: LOGIN_REFUSED.body,
  })
  const answer = await sessionOn(server, { sessionToken: '' }).login(CREDENTIALS)
  assert.deepEqual(answer.data, { kind: 'message', message: 'Wrong password' })
})

void test('a refusal that is not a message page is reported as what it was', async () => {
  const server = fakeServer({ body: '', headers: { 'Content-Type': 'text/html' } })
  const answer = await sessionOn(server, { sessionToken: '' }).login(CREDENTIALS)
  assert.deepEqual(answer.data, { kind: 'empty' })
})

void test('a request carries the headers the endpoint reads and nothing else', async () => {
  const server = fakeServer({})
  const session = sessionOn(server)
  const url = new URL(`${BASE_URL}game.php?page=overview`)
  await session.request({ url })
  await session.request({ url, method: 'POST', body: new URLSearchParams() })
  assert.deepEqual(server.requests[0]!.headers, { Cookie: `2Moons=${TOKEN}` })
  assert.deepEqual(server.requests[1]!.headers, {
    'Content-Type': 'application/x-www-form-urlencoded',
    Cookie: `2Moons=${TOKEN}`,
  })
})

void test('a request may be made without the session cookie', async () => {
  const server = fakeServer({})
  await sessionOn(server).request({
    url: new URL(`${BASE_URL}index.php?page=register`),
    withCookie: false,
  })
  assert.deepEqual(server.requests[0]!.headers, {})
})

void test('authenticated requests stay within the installation', async () => {
  const server = fakeServer({})
  const session = sessionOn(server)
  for (const address of [
    'https://other.example.com/play/game.php',
    'https://uni.example.com/other/game.php',
    'https://uni.example.com/playback/game.php',

    'https://uni.example.com/play/..%2fadmin.php',
    'https://uni.example.com/play/%2e%2e%2fadmin.php',
    'https://uni.example.com/play/..%5cadmin.php',

    'https://uni.example.com/play/%2e%2e/admin.php',
    'https://uni.example.com/play/./../../admin.php',

    'https://uni.example.com/play/%2e%2f..%2fadmin.php',
    'https://uni.example.com/%2e%2e%2f..%2fadmin.php',

    'https://uni.example.com/play/a%zz/',
  ]) {
    const url = new URL(address)
    await assert.rejects(session.request({ url }), { code: 'validation' })
    await assert.rejects(session.requestBytes({ url }), { code: 'validation' })
  }
  assert.equal(server.requests.length, 0)
  await session.request({ url: new URL('https://other.example.com/'), withCookie: false })
  assert.equal(server.requests[0]!.headers['Cookie'], undefined)
})

void test('a directory below the installation is still inside it', async () => {
  const server = fakeServer({})
  await sessionOn(server).request({ url: new URL(`${BASE_URL}sub/page.php`) })
  assert.equal(server.requests[0]!.headers['Cookie'], `2Moons=${TOKEN}`)
})

void test('an installation behind a proxy sends the address it forwards for', async () => {
  const server = fakeServer({})
  const session = sessionOn(server, { forwardedIp: '203.0.113.7' })
  await session.request({
    url: new URL(`${BASE_URL}game.php?page=overview`),
  })
  assert.equal(server.requests[0]!.headers['X-Forwarded-For'], '203.0.113.7')
  await session.request({ url: new URL('https://other.example/'), withCookie: false })
  assert.equal(server.requests[1]!.headers['X-Forwarded-For'], undefined)
})

void test('an unauthenticated session sends no cookie', async () => {
  const server = fakeServer({})
  await sessionOn(server, { sessionToken: '' }).request({
    url: new URL(`${BASE_URL}game.php?page=overview`),
  })
  assert.deepEqual(server.requests[0]!.headers, {})
})

void test('a caller’s header cannot replace one the session decides', async () => {
  const server = fakeServer({})
  await sessionOn(server, { forwardedIp: '203.0.113.7' }).request({
    url: new URL(`${BASE_URL}game.php?page=overview`),
    headers: { Cookie: 'other=1', 'X-Forwarded-For': '198.51.100.9', 'Accept-Language': 'en' },
  })
  assert.deepEqual(server.requests[0]!.headers, {
    Cookie: `2Moons=${TOKEN}`,
    'X-Forwarded-For': '203.0.113.7',
    'Accept-Language': 'en',
  })
})

void test('the session reports its endpoint and installation', () => {
  const session = sessionOn(fakeServer())
  assert.equal(session.baseUrl.href, BASE_URL)
  assert.equal(session.universe, 42)
  assert.equal(session.endpoint('game.php').href, `${BASE_URL}game.php`)
  assert.equal(session.endpoint('json.php').href, `${BASE_URL}json.php`)
})

void test('bracketed query fields cannot replace route scalars', () => {
  const session = sessionOn(fakeServer())
  const url = session.pageUrl(
    { path: 'index.php', page: 'login', query: { action: 'confirm' } },
    PLANET_ID,
    'page[]=register&mode[]=send&cp[]=2000&uni[]=2&action[]=delete&other[]=keep',
  )
  assert.deepEqual(
    [...url.searchParams],
    [
      ['other[]', 'keep'],
      ['action', 'confirm'],
      ['page', 'login'],
      ['cp', String(PLANET_ID)],
      ['uni', '42'],
    ],
  )
})

void test('session header policy is case insensitive for text and binary requests', async () => {
  const server = fakeServer({})
  const session = sessionOn(server, { forwardedIp: '203.0.113.7' })
  const options = {
    url: session.endpoint('game.php'),
    method: 'POST' as const,
    headers: {
      cookie: '2Moons=other',
      'x-forwarded-for': '198.51.100.9',
      'content-type': 'application/json',
      Accept: 'text/html',
    },
  }
  await session.request(options)
  await session.requestBytes(options)
  for (const request of server.requests) {
    const headers = new Headers(request.headers)
    assert.equal(headers.get('cookie'), `2Moons=${TOKEN}`)
    assert.equal(headers.get('x-forwarded-for'), '203.0.113.7')
    assert.equal(headers.get('content-type'), 'application/x-www-form-urlencoded')
    assert.equal(headers.get('accept'), 'text/html')
  }
})

void test('disabled credentials cannot be restored through caller headers', async () => {
  const server = fakeServer({})
  const session = sessionOn(server)
  const headers = { Cookie: '2Moons=other', 'X-Forwarded-For': '198.51.100.9' }
  await session.request({ url: session.endpoint('index.php'), withCookie: false, headers })
  await session.requestBytes({ url: new URL('https://other.example/'), withCookie: false, headers })
  for (const request of server.requests) {
    assert.equal(new Headers(request.headers).has('cookie'), false)
    assert.equal(new Headers(request.headers).has('x-forwarded-for'), false)
  }
})

void test('mutating the exposed base URL cannot change the credential boundary', async () => {
  const server = fakeServer({})
  const session = sessionOn(server)
  const exposed = session.baseUrl
  exposed.hostname = 'other.example'
  exposed.pathname = '/'
  assert.equal(session.baseUrl.href, BASE_URL)
  await assert.rejects(session.request({ url: new URL('https://other.example/play/game.php') }), {
    code: 'validation',
  })
  assert.equal(server.requests.length, 0)
})

void test('responses retain the address sent when a caller reuses a URL', async () => {
  const session = sessionOn(fakeServer({ body: 'ok' }))
  const url = session.endpoint('game.php')
  url.searchParams.set('cp', '1000')
  const pending = session.request({ url })
  url.searchParams.set('cp', '1001')
  const observed = await pending
  assert.equal(observed.url.searchParams.get('cp'), '1000')
})

void test('binary HTTP failures retain bytes and the server status', async () => {
  await assert.rejects(
    sessionOn(fakeServer({ status: 503, body: 'unavailable' })).requestBytes({
      url: new URL(`${BASE_URL}userpic.php`),
    }),
    (error: unknown) => {
      assert.ok(error instanceof ServerError)
      assert.equal(error.serverCode, 503)
      assert.deepEqual(error.response?.body, new TextEncoder().encode('unavailable'))
      return true
    },
  )
})

function response(
  status: number,
  headers: Record<string, string>,
  url = `${BASE_URL}game.php?page=overview`,
): HttpResponse {
  return { url: new URL(url), status, headers: new Headers(headers), body: '', observedAtMs: 1 }
}

void test('a redirect is resolved against the response and reported only where there is one', () => {
  const session = sessionOn(fakeServer())

  for (const status of [300, 399])
    assert.equal(
      session.location(response(status, { Location: './index.php' }))?.href,
      `${BASE_URL}index.php`,
      String(status),
    )
  for (const status of [200, 400])
    assert.equal(
      session.location(response(status, { Location: './index.php' })),
      null,
      String(status),
    )
  assert.equal(session.location(response(302, {})), null)
})

void test('every request asks the transport to report a redirect rather than follow it', async () => {
  const server = fakeServer([
    {
      status: 302,
      headers: { Location: './game.php', 'Set-Cookie': ['2Moons=confirmed; path=/'] },
    },
    { status: 302, headers: { Location: './index.php' } },
    { status: 302, headers: { Location: './index.php' } },
  ])
  const session = sessionOn(server, { sessionToken: '' })
  await session.login(CREDENTIALS)
  await get(session, { url: 'game.php?page=overview' })
  await post(session, { url: 'game.php?page=settings&mode=send', body: { delete: 1 } })

  assert.equal(session.sessionToken, 'confirmed')
  assert.equal(server.requests.length, 3)
  for (const request of server.requests)
    assert.equal(request.redirect, 'manual', `${request.method} ${request.url.href}`)
})

void test('a redirect is recognised by where it points', () => {
  const session = sessionOn(fakeServer())
  assert.equal(session.redirectsTo(response(302, { Location: './game.php' }), 'game.php'), true)
  assert.equal(session.redirectsTo(response(302, { Location: './index.php' }), 'game.php'), false)
  assert.equal(
    session.redirectsTo(
      response(302, { Location: 'https://other.example.com/play/game.php' }),
      'game.php',
    ),
    false,
  )

  assert.equal(session.redirectsTo(response(200, { Location: './game.php' }), 'game.php'), false)
})

void test('a session token may be set and read', () => {
  const session = sessionOn(fakeServer(), { sessionToken: '' })
  assert.equal(session.sessionToken, '')
  session.sessionToken = 'renewed'
  assert.equal(session.sessionToken, 'renewed')
})

void test('a session is built from the options it is given', () => {
  const session = new Session({ baseUrl: BASE_URL, universe: 1 })
  assert.equal(session.sessionToken, '')
  assert.equal(session.universe, 1)
  assert.equal(session.baseUrl.href, BASE_URL)
})

void test('a base address that names no directory is refused', () => {
  for (const baseUrl of ['https://uni.example.com/play', 'https://uni.example.com/play/game.php'])
    assert.throws(() => new Session({ baseUrl, universe: 1 }), { code: 'validation' })

  assert.throws(() => new Session({ baseUrl: 'https://uni.example.com/pl%zzay/', universe: 1 }), {
    code: 'validation',
    message: 'Unreadable baseUrl path',
  })

  assert.equal(
    new Session({ baseUrl: 'https://uni.example.com/', universe: 1 }).baseUrl.href,
    'https://uni.example.com/',
  )
})
