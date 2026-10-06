import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import { ErrorCode, parsePage, publicIndex, readPublicIndex } from '../../../src/index.ts'
import { INDEX_BODY } from '../../fixtures/public/index.ts'
import {
  BASE_URL,
  decode,
  expectOperation,
  httpResponse,
  pageHtml,
  pageReply,
  read,
} from '../../helpers.ts'

const INDEX_URL = `${BASE_URL}index.php?page=index&uni=42`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, INDEX_URL))
}

function withAlert(call: string): string {
  const markup = INDEX_BODY.replace('alert("Wrong password");', call)
  assert.notEqual(markup, INDEX_BODY, call)
  return markup
}

void test('the front page is read from the markup its own template rendered', () => {
  assert.deepEqual(readPublicIndex(pageOf(INDEX_BODY)), {
    kind: 'publicIndex',
    observedAtMs: 1,
    headline: 'Welcome to Universe One',
    description: 'A test installation.',
    loginInfo: 'By logging in you accept the rules.',
    universes: [
      { value: '42', label: 'Universe One' },
      { value: '43', label: 'Universe Two' },
    ],
    newsFrame: 'Maintenance on Sunday.',
    loginError: 'Wrong password',
  })
})

void test('a page the address carried no code for states no error', () => {
  const document = readPublicIndex(pageOf(withAlert('')))
  assert.equal(document.loginError, null)

  assert.equal(document.headline, 'Welcome to Universe One')
  assert.equal(document.newsFrame, 'Maintenance on Sunday.')
})

void test('an announcement the operator did not enable leaves the card’s sentence unstated', () => {
  const markup = INDEX_BODY.replace('<p class="card-text">Maintenance on Sunday.</p>', '')
  assert.notEqual(markup, INDEX_BODY)
  assert.equal(readPublicIndex(pageOf(markup)).newsFrame, null)
})

void test('a code stated as a binding alone is not the message the page alerted', () => {
  const document = readPublicIndex(pageOf(withAlert('var loginError = "Wrong password";')))
  assert.equal(document.loginError, null)
})

void test('two alerts state no single message', () => {
  const document = readPublicIndex(
    pageOf(withAlert('alert("Wrong password");alert("Account locked");')),
  )
  assert.equal(document.loginError, null)
})

void test('an alert whose argument is not the code’s string states no message', () => {
  const values = ['alert(false);', 'alert(null);', 'alert(["Wrong password"]);']
  for (const call of values)
    assert.equal(readPublicIndex(pageOf(withAlert(call))).loginError, null, call)
})

void test('a front page that states no headline, description or login line is a decoding failure', () => {
  const broken: [string, string, string, string][] = [
    ['no headline', '<h1>Welcome to Universe One</h1>', '', 'Missing page headline'],
    ['an empty headline', '<h1>Welcome to Universe One</h1>', '<h1></h1>', 'Missing page headline'],
    ['no description', '<p class="lead">A test installation.</p>', '', 'Missing page description'],
    [
      'an empty description',
      '<p class="lead">A test installation.</p>',
      '<p class="lead"></p>',
      'Missing page description',
    ],
    [
      'no login line',
      '<span class="small">By logging in you accept the <a href="index.php?page=rules">rules</a>.</span>',
      '',
      'Missing login information',
    ],
  ]
  for (const [name, rendered, replacement, message] of broken) {
    const markup = INDEX_BODY.replace(rendered, replacement)
    assert.notEqual(markup, INDEX_BODY, name)
    assert.throws(
      () => readPublicIndex(pageOf(markup)),
      { code: ErrorCode.ParseError, message },
      name,
    )
  }
})

void test('the page is asked for at its own route', async () => {
  await expectOperation((session) => publicIndex(session), { url: INDEX_URL })
})

void test('the document the page answered with is the one the caller reads', async () => {
  const document = await read((session) => publicIndex(session), pageReply(pageHtml(INDEX_BODY)))
  assert.equal(document.kind, 'publicIndex')
  assert.equal(document.loginError, 'Wrong password')
})

void test('an answer carrying no document is reported as the receipt it is', async () => {
  const observed = await decode((session) => publicIndex(session), { body: '' })
  assert.deepEqual(observed.data, { kind: 'empty' })
})
