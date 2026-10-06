import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import {
  ErrorCode,
  parsePage,
  publicLostPassword,
  publicLostPasswordNew,
  publicLostPasswordSend,
  readPublicLostPassword,
} from '../../../src/index.ts'
import {
  LOST_PASSWORD_BODY,
  LOST_PASSWORD_CAPTCHA_BODY,
  REFUSAL_CARD_BODY,
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

const LOST_PASSWORD_URL = `${BASE_URL}index.php?page=lostPassword&uni=42`
const LOST_PASSWORD_NEW_URL = `${BASE_URL}index.php?page=lostPassword&mode=newPassword&uni=42`
const LOST_PASSWORD_SEND_URL = `${BASE_URL}index.php?page=lostPassword&mode=send&uni=42`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, LOST_PASSWORD_URL))
}

const REFUSAL_WITH_BUTTON = REFUSAL_CARD_BODY.replace(
  '<p class="card-text">Wrong password</p>',
  '<p class="card-text">Wrong password <a href="index.php?page=lostPassword">' +
    '<button class="btn btn-default">Back</button></a></p>',
)

void test('the recovery form is read from the card the template rendered', () => {
  assert.deepEqual(readPublicLostPassword(pageOf(LOST_PASSWORD_BODY)), {
    kind: 'publicLostPassword',
    observedAtMs: 1,
    info: 'Enter the account name and the mail address it was registered with.',
    universes: [
      { value: '42', label: 'Universe One' },
      { value: '43', label: 'Universe Two' },
    ],

    captchaSiteKey: null,
  })
})

void test('an installation requiring a captcha states the key the widget is built with', () => {
  const document = readPublicLostPassword(pageOf(LOST_PASSWORD_CAPTCHA_BODY))
  assert.equal(document.captchaSiteKey, '6Lc-password-key')
  assert.equal(document.info, 'Enter the account name and the mail address it was registered with.')
})

void test('a captcha the template rendered without a key is a decoding failure', () => {
  const markup = LOST_PASSWORD_CAPTCHA_BODY.replace(' data-sitekey="6Lc-password-key"', '')
  assert.notEqual(markup, LOST_PASSWORD_CAPTCHA_BODY)
  assert.throws(() => readPublicLostPassword(pageOf(markup)), {
    code: ErrorCode.ParseError,
    message: 'Missing data-sitekey on the selected element',
  })
})

void test('a form that states no instructions is a decoding failure', () => {
  const markup = LOST_PASSWORD_BODY.replace(
    '<p class="card-text">Enter the account name and the mail address it was registered with.</p>',
    '',
  )
  assert.notEqual(markup, LOST_PASSWORD_BODY)
  assert.throws(() => readPublicLostPassword(pageOf(markup)), {
    code: ErrorCode.ParseError,
    message: 'Missing password recovery instructions',
  })
})

void test('the form is asked for at the page’s own route, with no mode at all', async () => {
  await expectOperation((session) => publicLostPassword(session), { url: LOST_PASSWORD_URL })
})

void test('the document the form answered with is the one the caller reads', async () => {
  const document = await read(
    (session) => publicLostPassword(session),
    pageReply(pageHtml(LOST_PASSWORD_CAPTCHA_BODY)),
  )
  assert.equal(document.kind, 'publicLostPassword')
  assert.equal(document.captchaSiteKey, '6Lc-password-key')
})

void test('an answer carrying no document is reported as the receipt it is', async () => {
  const observed = await decode((session) => publicLostPassword(session), { body: '' })
  assert.deepEqual(observed.data, { kind: 'empty' })
})

void test('spending the recovery token posts it to the mode the mail links to', async () => {
  await expectOperation(
    (session) => publicLostPasswordNew(session, { playerId: 7, key: 'a1b2c3d4' }),
    {
      method: 'POST',
      url: LOST_PASSWORD_NEW_URL,
      body: [
        ['u', '7'],
        ['k', 'a1b2c3d4'],
      ],
    },
  )
})

void test('both recovery submissions carry the requested public-page language', async () => {
  await expectOperation(
    (session) => publicLostPasswordNew(session, { playerId: 7, key: 'token', language: 'de' }),
    {
      method: 'POST',
      url: `${BASE_URL}index.php?lang=de&page=lostPassword&mode=newPassword&uni=42`,
      body: [
        ['u', '7'],
        ['k', 'token'],
      ],
    },
  )
  await expectOperation(
    (session) =>
      publicLostPasswordSend(session, {
        username: 'AhMisty',
        mail: 'a@example.com',
        language: 'de',
      }),
    {
      method: 'POST',
      url: `${BASE_URL}index.php?lang=de&page=lostPassword&mode=send&uni=42`,
      body: [
        ['username', 'AhMisty'],
        ['mail', 'a@example.com'],
      ],
    },
  )
})

void test('the recovery the token bought is reported as the message it printed', async () => {
  const observed = await answer(
    (session) => publicLostPasswordNew(session, { playerId: 7, key: 'a1b2c3d4' }),
    pageReply(pageHtml(REFUSAL_WITH_BUTTON)),
  )
  assert.deepEqual(observed.data, { kind: 'message', message: 'Wrong password Back' })
})

void test('a token the server spent already is reported as the refusal it printed', async () => {
  const observed = await answer(
    (session) => publicLostPasswordNew(session, { playerId: 7, key: 'stale' }),
    { status: 302, headers: { Location: 'index.php?page=lostPassword' } },
  )
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}index.php?page=lostPassword`),
  })
})

void test('the recovery request posts the two fields the form itself submits', async () => {
  await expectOperation(
    (session) => publicLostPasswordSend(session, { username: 'AhMisty', mail: 'a@example.com' }),
    {
      method: 'POST',
      url: LOST_PASSWORD_SEND_URL,
      body: [
        ['username', 'AhMisty'],
        ['mail', 'a@example.com'],
      ],
    },
  )
})

void test('an installation requiring a captcha sends the widget’s answer with the request', async () => {
  await expectOperation(
    (session) =>
      publicLostPasswordSend(session, {
        username: 'AhMisty',
        mail: 'a@example.com',
        captcha: 'captcha-answer',
      }),
    {
      method: 'POST',
      url: LOST_PASSWORD_SEND_URL,
      body: [
        ['username', 'AhMisty'],
        ['mail', 'a@example.com'],
        ['g-recaptcha-response', 'captcha-answer'],
      ],
    },
  )
})

void test('the mail the recovery sent is reported as the message it printed', async () => {
  const observed = await answer(
    (session) => publicLostPasswordSend(session, { username: 'AhMisty', mail: 'a@example.com' }),
    pageReply(pageHtml(REFUSAL_WITH_BUTTON)),
  )
  assert.deepEqual(observed.data, { kind: 'message', message: 'Wrong password Back' })
})
