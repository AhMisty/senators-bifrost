import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Ack, HttpResponse } from '../../src/index.ts'
import { ErrorCode, ackOf, parsePage, readReply, receiptOf } from '../../src/index.ts'
import { BASE_URL, fakeServer, gamePage, httpResponse, pageReply, sessionOn } from '../helpers.ts'

const SESSION = sessionOn(fakeServer())

const GAME_URL = `${BASE_URL}game.php?page=overview`
const INDEX_URL = `${BASE_URL}index.php?page=login`
const ADMIN_URL = `${BASE_URL}admin.php`

void test('explicit JSON failures raise their server message while success flags remain data', () => {
  const response = httpResponse(
    { body: '{"error":true,"message":"Gate is cooling down"}' },
    GAME_URL,
  )
  assert.throws(() => ackOfResponse(response), {
    code: ErrorCode.ServerError,
    message: 'Gate is cooling down',
  })
  assert.deepEqual(
    ackOfResponse(httpResponse({ body: '{"error":false,"message":"Gate ready"}' }, GAME_URL)),
    {
      kind: 'json',
      value: { error: false, message: 'Gate ready' },
    },
  )
  assert.throws(() => ackOfResponse(httpResponse({ body: '{"error":true}' }, GAME_URL)), {
    code: ErrorCode.ParseError,
  })
})

function ackOfResponse(response: HttpResponse, receipt = true): Ack {
  return ackOf(SESSION, response, () => parsePage(response), receipt)
}

function refusal(message: string): HttpResponse {
  return httpResponse(pageReply(gamePage(`<div class="ally_contents">${message}</div>`)), GAME_URL)
}

const PUBLIC_CARD = [
  '<main role="main">',
  '<div class="card mb-3">',
  '<h5 class="card-header">Login</h5>',
  '<div class="card-body"><p class="card-text">Wrong password</p></div>',
  '</div>',
  '</main>',
].join('')

void test('a rendered message page is reported as the message it carries', () => {
  assert.deepEqual(ackOfResponse(refusal('That planet is not yours')), {
    kind: 'message',
    message: 'That planet is not yours',
  })
})

void test('a document without a message block is reported as a page', () => {
  const response = httpResponse(pageReply(gamePage('<div class="build_box">ok</div>')), GAME_URL)
  assert.deepEqual(ackOfResponse(response), { kind: 'page' })
})

void test('an HTTP failure is raised before the document decoder runs', () => {
  const response = httpResponse(
    { status: 503, body: gamePage('<div id="content">Service unavailable</div>') },
    GAME_URL,
  )
  assert.throws(
    () =>
      readReply(SESSION, response, () => {
        throw new Error('An error response must not enter the document decoder')
      }),
    { code: ErrorCode.ServerError, serverCode: 503 },
  )
})

void test('two message blocks are ambiguous rather than silently one of them', () => {
  const response = httpResponse(
    pageReply(gamePage('<div class="ally_contents">one</div><div class="ally_contents">two</div>')),
    GAME_URL,
  )
  assert.throws(() => ackOfResponse(response), {
    code: ErrorCode.ParseError,
    message: 'Ambiguous message page',
  })
})

void test('a redirect is reported by its target, resolved against the response', () => {
  const response = httpResponse(
    { status: 302, headers: { Location: './index.php?page=login' }, body: '' },
    GAME_URL,
  )
  const ack = ackOfResponse(response)
  assert.equal(ack.kind, 'redirect')
  assert.equal(ack.target.href, `${BASE_URL}index.php?page=login`)
})

void test('the administrative redirect denying a player session raises its server response', () => {
  const response = httpResponse(
    { status: 302, headers: { Location: 'game.php' }, body: '' },
    `${BASE_URL}admin.php?page=news`,
  )
  assert.throws(() => ackOfResponse(response), {
    code: ErrorCode.ServerError,
    serverCode: 'admin-authentication',
    response,
  })
  const external = httpResponse(
    { status: 302, headers: { Location: 'https://example.invalid/game.php' }, body: '' },
    `${BASE_URL}admin.php`,
  )
  assert.equal(ackOfResponse(external).kind, 'redirect')
})

void test('nonzero fleet redirect codes raise the failure and zero preserves the redirect', () => {
  const source = `${BASE_URL}game.php?page=fleetStep3`
  const response = httpResponse(
    { status: 302, headers: { Location: 'game.php?page=fleetTable&code=1' }, body: '' },
    source,
  )
  assert.throws(() => ackOfResponse(response), {
    code: ErrorCode.ServerError,
    serverCode: '1',
    response,
  })
  for (const target of ['game.php?page=fleetTable&code=0', 'game.php?page=overview&code=1'])
    assert.equal(
      ackOfResponse(httpResponse({ status: 302, headers: { Location: target }, body: '' }, source))
        .kind,
      'redirect',
    )
})

void test('fleet diagnostics preserve a nonzero failure code and its server message', () => {
  const body =
    './includes/pages/game/ShowFleetStep3Page.class.php on 47 | Code: 1 | Error: No token'
  const response = httpResponse({ body }, `${BASE_URL}game.php?page=fleetStep3`)
  assert.throws(() => ackOfResponse(response), {
    code: ErrorCode.ServerError,
    serverCode: '1',
    message: 'No token',
    response,
  })
  assert.equal(
    ackOfResponse(httpResponse({ body: body.replace('Code: 1', 'Code: 0') }, GAME_URL)).kind,
    'text',
  )
  assert.equal(ackOfResponse(httpResponse({ body }, `${BASE_URL}index.php`)).kind, 'text')
})

void test('a redirect the library cannot resolve falls through to the body it carried', () => {
  const body = gamePage('<div class="ally_contents">Session expired</div>')
  const withoutLocation: Record<string, string>[] = [{}, { Location: '' }]
  for (const headers of withoutLocation) {
    const response = httpResponse({ status: 302, headers, body }, GAME_URL)
    assert.deepEqual(ackOfResponse(response), { kind: 'message', message: 'Session expired' })
  }
})

void test('a Location the runtime cannot read raises rather than being reported as a page', () => {
  const response = httpResponse(
    { status: 302, headers: { Location: 'http://[' }, body: '' },
    GAME_URL,
  )
  assert.throws(() => ackOfResponse(response), {
    code: ErrorCode.ParseError,
    message: 'Invalid response URL',
  })
})

void test('a JSON payload is reported with its numeric literals kept as text', () => {
  const response = httpResponse(
    { body: '{"msg":3,"big":12345678901234567890}' },
    `${BASE_URL}json.php`,
  )
  assert.deepEqual(ackOfResponse(response), {
    kind: 'json',
    value: { msg: '3', big: '12345678901234567890' },
  })
})

void test('an empty body is its own kind even where the header claims JSON', () => {
  const response = httpResponse(
    { body: '', headers: { 'Content-Type': 'application/json' } },
    GAME_URL,
  )
  assert.deepEqual(ackOfResponse(response), { kind: 'empty' })
})

void test('a body that is not markup is reported as the text it is', () => {
  const response = httpResponse({ body: '42' }, GAME_URL)
  assert.deepEqual(ackOfResponse(response), { kind: 'text', text: '42' })
})

void test('the public card is a message for a receipt and only on the public scripts', () => {
  const index = httpResponse(pageReply(PUBLIC_CARD), INDEX_URL)
  const admin = httpResponse(pageReply(PUBLIC_CARD), ADMIN_URL)
  const game = httpResponse(pageReply(PUBLIC_CARD), GAME_URL)
  assert.deepEqual(ackOfResponse(index), { kind: 'message', message: 'Wrong password' })
  assert.deepEqual(ackOfResponse(admin), { kind: 'message', message: 'Wrong password' })
  assert.deepEqual(ackOfResponse(index, false), { kind: 'page' })
  assert.deepEqual(ackOfResponse(game), { kind: 'page' })
  assert.deepEqual(ackOfResponse(game, false), { kind: 'page' })
})

void test('the card is read only where the page renders nothing but it', () => {
  const shapes: Record<string, string> = {
    'no main': PUBLIC_CARD.replace('<main role="main">', '<div>').replace('</main>', '</div>'),
    'two children of main': PUBLIC_CARD.replace('</main>', '<div>extra</div></main>'),
    'no card': PUBLIC_CARD.replace('class="card mb-3"', 'class="panel"'),
    'no header': PUBLIC_CARD.replace('<h5 class="card-header">Login</h5>', ''),
    'two children of the body': PUBLIC_CARD.replace(
      '<p class="card-text">Wrong password</p>',
      '<p class="card-text">Wrong password</p><p class="card-text">again</p>',
    ),
    'a form': PUBLIC_CARD.replace(
      '<p class="card-text">Wrong password</p>',
      '<p class="card-text">Wrong password</p><input name="x">',
    ),
    'no card text': PUBLIC_CARD.replace(
      '<p class="card-text">Wrong password</p>',
      '<p>Wrong password</p>',
    ),
  }
  for (const [name, markup] of Object.entries(shapes)) {
    const response = httpResponse(pageReply(markup), INDEX_URL)
    assert.deepEqual(ackOfResponse(response), { kind: 'page' }, name)
  }
})

function neverParsed(): never {
  throw new Error('parsed a body that is not a document')
}

void test('the document is parsed only where the body is one', () => {
  for (const body of ['{"a":1}', '', '42'])
    ackOf(SESSION, httpResponse({ body }, GAME_URL), neverParsed)
  ackOf(
    SESSION,
    httpResponse({ status: 302, headers: { Location: '/x' }, body: '' }, GAME_URL),
    neverParsed,
  )
})

void test('a receipt is everything but a document', () => {
  const acks: Ack[] = [
    { kind: 'message', message: 'no' },
    { kind: 'redirect', target: new URL(GAME_URL) },
    { kind: 'json', value: null },
    { kind: 'page' },
    { kind: 'text', text: '42' },
    { kind: 'empty' },
  ]
  for (const ack of acks) assert.deepEqual(receiptOf(ack), ack.kind === 'page' ? null : ack)
})

void test('a PHP fatal-error fragment is thrown even when its HTTP status is 200', () => {
  const response = httpResponse({ body: '<br><b>Fatal error</b>: missing handler<br>' }, GAME_URL)
  assert.throws(() => ackOfResponse(response), {
    code: 'server',
    message: 'Fatal error: missing handler',
  })
  assert.deepEqual(
    ackOfResponse(
      httpResponse({ body: '<main><b>Fatal error</b> is a quoted label</main>' }, GAME_URL),
    ),
    { kind: 'page' },
  )
})
