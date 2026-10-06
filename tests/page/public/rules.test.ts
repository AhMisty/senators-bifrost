import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import { ErrorCode, parsePage, publicRules, readPublicRules } from '../../../src/index.ts'
import { REFUSAL_CARD_BODY, RULES_BODY } from '../../fixtures/public/index.ts'
import {
  BASE_URL,
  decode,
  expectOperation,
  httpResponse,
  pageHtml,
  pageReply,
  read,
} from '../../helpers.ts'

const RULES_URL = `${BASE_URL}index.php?page=rules&uni=42`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, RULES_URL))
}

void test('the rules are read as the text of the card that prints them', () => {
  assert.deepEqual(readPublicRules(pageOf(RULES_BODY)), {
    kind: 'publicRules',
    observedAtMs: 1,
    rules: 'Do not cheat.\nOne account per player.',
  })
})

void test('the layout body ID does not match the rules card', () => {
  const response = httpResponse(
    { body: pageHtml(RULES_BODY).replace('<body', '<body id="rules"') },
    RULES_URL,
  )
  assert.equal(readPublicRules(parsePage(response)).rules, 'Do not cheat.\nOne account per player.')
})

void test('a refusal card is not read as the rules', () => {
  assert.throws(() => readPublicRules(pageOf(REFUSAL_CARD_BODY)), {
    code: ErrorCode.ParseError,
    message: 'Expected one .card-body #rules, found 0',
  })
})

void test('a page the reader cannot settle on one rules block for is a decoding failure', () => {
  const doubled =
    '<div class="card-body"><ul id="rules"><li>Do not cheat.</li></ul></div>' +
    '<div class="card-body"><ul id="rules"><li>One account per player.</li></ul></div>'
  assert.throws(() => readPublicRules(pageOf(doubled)), {
    code: ErrorCode.ParseError,
    message: 'Expected one .card-body #rules, found 2',
  })
})

void test('rules the language file left empty are a decoding failure', () => {
  assert.throws(
    () => readPublicRules(pageOf('<div class="card-body"><ul id="rules"></ul></div>')),
    { code: ErrorCode.ParseError, message: 'Missing rules' },
  )
})

void test('the page is asked for at its own route', async () => {
  await expectOperation((session) => publicRules(session), { url: RULES_URL })
})

void test('the document the page answered with is the one the caller reads', async () => {
  const document = await read((session) => publicRules(session), pageReply(pageHtml(RULES_BODY)))
  assert.equal(document.kind, 'publicRules')
  assert.equal(document.rules, 'Do not cheat.\nOne account per player.')
})

void test('an answer carrying no document is reported as the receipt it is', async () => {
  const observed = await decode((session) => publicRules(session), { body: '' })
  assert.deepEqual(observed.data, { kind: 'empty' })
})
