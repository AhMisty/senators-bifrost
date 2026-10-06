import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import { ErrorCode, adminPassword, parsePage, readAdminPassword } from '../../../src/index.ts'
import {
  ACCOUNT_EDITOR_SHIPS_BODY,
  PASSWORD_BLANK_BODY,
  passwordBody,
} from '../../fixtures/admin/formPages.ts'
import {
  BASE_URL,
  decode,
  expectOperation,
  fakeServer,
  httpResponse,
  pageHtml,
  pageReply,
  read,
  sessionOn,
} from '../../helpers.ts'

const PASSWORD_URL = `${BASE_URL}admin.php?page=password`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, PASSWORD_URL))
}

void test('a plain read states both fields, empty, as the template renders them', async () => {
  const server = fakeServer(pageReply(pageHtml(passwordBody('', ''))))
  const observed = await adminPassword(sessionOn(server))
  assert.equal(observed.data.kind, 'adminPassword')

  assert.equal('planetId' in observed.data, false)
  assert.equal(observed.data.text, '')
  assert.equal(observed.data.hash, '')
  assert.ok(observed.data.observedAtMs > 0)

  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, PASSWORD_URL)
})

void test('the two password fields are read out of the form they are rendered in', () => {
  assert.deepEqual(readAdminPassword(pageOf(passwordBody('', ''))), {
    kind: 'adminPassword',
    observedAtMs: 1,
    text: '',
    hash: '',
  })
  assert.deepEqual(readAdminPassword(pageOf(passwordBody('secret', 'a1b2c3$d4e5f6'))), {
    kind: 'adminPassword',
    observedAtMs: 1,
    text: 'secret',
    hash: 'a1b2c3$d4e5f6',
  })
})

void test('a text the caller asks about is posted as the field the page reads', async () => {
  const server = await expectOperation(
    (session) => adminPassword(session, { text: 'secret' }),
    {
      method: 'POST',
      url: PASSWORD_URL,
      body: [['md5q', 'secret']],
    },
    pageReply(pageHtml(passwordBody('secret', 'a1b2c3$d4e5f6'))),
  )
  assert.equal(server.requests[0]!.headers['Content-Type'], 'application/x-www-form-urlencoded')
})

void test('the answer states the text it was asked about and the form the server stores', async () => {
  const page = await read(
    (session) => adminPassword(session, { text: 'secret' }),
    pageReply(pageHtml(passwordBody('secret', 'a1b2c3$d4e5f6'))),
  )
  assert.equal(page.text, 'secret')
  assert.equal(page.hash, 'a1b2c3$d4e5f6')

  assert.equal('planetId' in page, false)
})

void test('a field rendered with a blank value states the empty text it holds', () => {
  assert.deepEqual(readAdminPassword(pageOf(PASSWORD_BLANK_BODY)), {
    kind: 'adminPassword',
    observedAtMs: 1,
    text: '',
    hash: '',
  })
})

void test('a document that is not the tool cannot be read as one', async () => {
  await assert.rejects(
    () => adminPassword(sessionOn(fakeServer(pageReply(pageHtml(ACCOUNT_EDITOR_SHIPS_BODY))))),
    { code: ErrorCode.ParseError, message: 'Expected one input[name="md5q"], found 0' },
  )
  await assert.rejects(
    () => adminPassword(sessionOn(fakeServer(pageReply(pageHtml('<main role="main"></main>'))))),
    { code: ErrorCode.ParseError, message: 'Expected one input[name="md5q"], found 0' },
  )
})

void test('a session the server ends is reported as the redirect it answered with', async () => {
  const ended = await decode(adminPassword, {
    status: 302,
    headers: { Location: './index.php?page=login' },
  })
  assert.deepEqual(ended.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}index.php?page=login`),
  })
})
