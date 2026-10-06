import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import { ErrorCode, parsePage, publicDisclaimer, readPublicDisclaimer } from '../../../src/index.ts'
import { DISCLAMER_BODY, DISCLAMER_EMPTY_BODY } from '../../fixtures/public/index.ts'
import {
  BASE_URL,
  decode,
  expectOperation,
  httpResponse,
  pageHtml,
  pageReply,
  read,
} from '../../helpers.ts'

const DISCLAMER_URL = `${BASE_URL}index.php?page=disclamer&uni=42`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, DISCLAMER_URL))
}

void test('each value is read from its own block, in the template’s own order', () => {
  assert.deepEqual(readPublicDisclaimer(pageOf(DISCLAMER_BODY)), {
    kind: 'publicDisclaimer',
    observedAtMs: 1,
    address: 'Example Street 1\nExample City',
    phone: '+49 30 123456',
    mail: 'support@example.com',
    notice: 'This installation is a private test server.',
  })
})

void test('a setting the operator left blank reads as the empty text it is', () => {
  assert.deepEqual(readPublicDisclaimer(pageOf(DISCLAMER_EMPTY_BODY)), {
    kind: 'publicDisclaimer',
    observedAtMs: 1,
    address: '',
    phone: '',
    mail: '',
    notice: '',
  })
})

void test('formatting in configured content preserves its text', () => {
  const markup = DISCLAMER_BODY.replace(
    'This installation is a private test server.',
    '<strong>Service notice:</strong> <span>Contact <strong>support</strong>.</span>',
  )
  assert.equal(readPublicDisclaimer(pageOf(markup)).notice, 'Service notice: Contact support.')
})

void test('a page that does not render four blocks is a decoding failure', () => {
  const fewer =
    '<div class="card-body"><address><strong>Address</strong><br>Example Street</address></div>'
  assert.throws(() => readPublicDisclaimer(pageOf(fewer)), {
    code: ErrorCode.ParseError,
    message: 'Missing disclaimer blocks',
  })
})

void test('the page is asked for at its own route', async () => {
  await expectOperation((session) => publicDisclaimer(session), { url: DISCLAMER_URL })
})

void test('the document the page answered with is the one the caller reads', async () => {
  const document = await read(
    (session) => publicDisclaimer(session),
    pageReply(pageHtml(DISCLAMER_BODY)),
  )
  assert.equal(document.kind, 'publicDisclaimer')
  assert.equal(document.phone, '+49 30 123456')
})

void test('an answer carrying no document is reported as the receipt it is', async () => {
  const observed = await decode((session) => publicDisclaimer(session), { body: '' })
  assert.deepEqual(observed.data, { kind: 'empty' })
})
