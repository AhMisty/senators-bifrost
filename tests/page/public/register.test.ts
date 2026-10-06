import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import {
  ErrorCode,
  parsePage,
  publicRegister,
  publicRegisterSend,
  readPublicRegister,
} from '../../../src/index.ts'
import {
  REFUSAL_CARD_BODY,
  REGISTER_BODY,
  REGISTER_MINIMAL_BODY,
} from '../../fixtures/public/index.ts'
import {
  BASE_URL,
  answer,
  decode,
  expectOperation,
  httpResponse,
  pageHtml,
  pageReply,
  read,
} from '../../helpers.ts'

const REGISTER_URL = `${BASE_URL}index.php?page=register&uni=42`
const REGISTER_SEND_URL = `${BASE_URL}index.php?page=register&mode=send&uni=42`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, REGISTER_URL))
}

function without(rendered: string, blank = ''): string {
  const markup = REGISTER_BODY.replace(rendered, blank)
  assert.notEqual(markup, REGISTER_BODY, rendered)
  return markup
}

const FORM = {
  username: 'AhMisty',
  password: 'hunter2',
  passwordReplay: 'hunter2',
  email: 'a@example.com',
  emailReplay: 'a@example.com',
  rules: true,
}

void test('the form is read with every group the installation rendered', () => {
  assert.deepEqual(readPublicRegister(pageOf(REGISTER_BODY)), {
    kind: 'publicRegister',
    observedAtMs: 1,
    universes: [
      { value: '42', label: 'Universe One' },
      { value: '43', label: 'Universe Two' },
    ],
    languages: [
      { value: 'en', label: 'English' },
      { value: 'de', label: 'German' },
    ],

    referral: { id: 9, name: 'AhMisty' },
    externalAuth: { account: 'uid-1', method: 'facebook' },
    captchaSiteKey: '6Lc-register-key',
  })
})

void test('a form without the optional groups states the values the template fell back to', () => {
  assert.deepEqual(readPublicRegister(pageOf(REGISTER_MINIMAL_BODY)), {
    kind: 'publicRegister',
    observedAtMs: 1,
    universes: [
      { value: '42', label: 'Universe One' },
      { value: '43', label: 'Universe Two' },
    ],
    languages: [],
    referral: null,
    externalAuth: { account: '0', method: '' },
    captchaSiteKey: null,
  })
})

void test('a form whose identity field is missing or doubled is a decoding failure', () => {
  const missing = without('<input type="hidden" value="uid-1" name="externalAuth[account]">')
  const doubled = without(
    '<input type="hidden" value="uid-1" name="externalAuth[account]">',
    '<input type="hidden" value="uid-1" name="externalAuth[account]">' +
      '<input type="hidden" value="uid-2" name="externalAuth[account]">',
  )
  assert.throws(() => readPublicRegister(pageOf(missing)), {
    code: ErrorCode.ParseError,
    message: 'Missing externalAuth[account] form field',
  })
  assert.throws(() => readPublicRegister(pageOf(doubled)), {
    code: ErrorCode.ParseError,
    message: 'Missing externalAuth[account] form field',
  })
})

void test('a referral group without the field it submits or the name it prints fails to decode', () => {
  const noId = without('<input type="hidden" value="9" name="referralID">')
  const noName = without(
    '<span class="inputDesc">AhMisty</span>',
    '<span class="other">AhMisty</span>',
  )
  assert.throws(() => readPublicRegister(pageOf(noId)), {
    code: ErrorCode.ParseError,
    message: 'Missing referralID form field',
  })
  assert.throws(() => readPublicRegister(pageOf(noName)), {
    code: ErrorCode.ParseError,
    message: 'Missing referring account name',
  })
})

void test('a captcha the template rendered without a key is a decoding failure', () => {
  const markup = without(' data-sitekey="6Lc-register-key"')
  assert.throws(() => readPublicRegister(pageOf(markup)), {
    code: ErrorCode.ParseError,
    message: 'Missing data-sitekey on the selected element',
  })
})

void test('the form is asked for at the page’s own route, with no mode at all', async () => {
  await expectOperation((session) => publicRegister(session), { url: REGISTER_URL })
})

void test('the document the form answered with is the one the caller reads', async () => {
  const document = await read(
    (session) => publicRegister(session),
    pageReply(pageHtml(REGISTER_BODY)),
  )
  assert.equal(document.kind, 'publicRegister')
  assert.deepEqual(document.referral, { id: 9, name: 'AhMisty' })
})

void test('an answer carrying no document is reported as the receipt it is', async () => {
  const observed = await decode((session) => publicRegister(session), { body: '' })
  assert.deepEqual(observed.data, { kind: 'empty' })
})

void test('the registration is posted under the field names the form itself submits', async () => {
  await expectOperation((session) => publicRegisterSend(session, FORM), {
    method: 'POST',
    url: REGISTER_SEND_URL,
    body: [
      ['username', 'AhMisty'],
      ['password', 'hunter2'],
      ['passwordReplay', 'hunter2'],
      ['email', 'a@example.com'],
      ['emailReplay', 'a@example.com'],

      ['rules', '1'],
    ],
  })
})

void test('every optional field of the form travels with the submission it belongs to', async () => {
  await expectOperation(
    (session) =>
      publicRegisterSend(session, {
        ...FORM,
        language: 'de',
        referralId: 9,
        externalAuth: { account: 'uid-1', method: 'facebook' },
        captcha: 'captcha-answer',
      }),
    {
      method: 'POST',
      url: REGISTER_SEND_URL,
      body: [
        ['username', 'AhMisty'],
        ['password', 'hunter2'],
        ['passwordReplay', 'hunter2'],
        ['email', 'a@example.com'],
        ['emailReplay', 'a@example.com'],
        ['rules', '1'],
        ['lang', 'de'],
        ['referralID', '9'],
        ['externalAuth[account]', 'uid-1'],
        ['externalAuth[method]', 'facebook'],
        ['g-recaptcha-response', 'captcha-answer'],
      ],
    },
  )
})

void test('an unchecked agreement and an omitted field send nothing at all', async () => {
  await expectOperation((session) => publicRegisterSend(session, { ...FORM, rules: false }), {
    method: 'POST',
    url: REGISTER_SEND_URL,
    body: [
      ['username', 'AhMisty'],
      ['password', 'hunter2'],
      ['passwordReplay', 'hunter2'],
      ['email', 'a@example.com'],
      ['emailReplay', 'a@example.com'],
    ],
  })
})

void test('what the registration ended in is reported as the message it printed', async () => {
  const observed = await answer(
    (session) => publicRegisterSend(session, FORM),
    pageReply(pageHtml(REFUSAL_CARD_BODY)),
  )
  assert.deepEqual(observed.data, { kind: 'message', message: 'Wrong password' })
})

void test('an installation that needs no verification mail redirects to the same token', async () => {
  const observed = await answer((session) => publicRegisterSend(session, FORM), {
    status: 302,
    headers: { Location: 'index.php?page=vertify&i=12&k=a1b2c3d4' },
  })
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}index.php?page=vertify&i=12&k=a1b2c3d4`),
  })
})
