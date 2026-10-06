import assert from 'node:assert/strict'
import { test } from 'node:test'

import { publicBoard } from '../../../src/index.ts'
import { BAN_LIST_BODY, REFUSAL_CARD_BODY } from '../../fixtures/public/index.ts'
import { BASE_URL, answer, expectOperation, pageHtml, pageReply } from '../../helpers.ts'

const BOARD_URL = `${BASE_URL}index.php?page=board&uni=42`

void test('the page is asked for at its own route, and adds nothing of its own', async () => {
  await expectOperation((session) => publicBoard(session), { url: BOARD_URL })
})

void test('a configured forum is reported as the redirect the page sent', async () => {
  const observed = await answer((session) => publicBoard(session), {
    status: 302,
    headers: { Location: 'https://forum.example.com/index.php' },
  })
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL('https://forum.example.com/index.php'),
  })
})

void test('an address the installation cannot use is reported as the message it printed', async () => {
  const observed = await answer(
    (session) => publicBoard(session),
    pageReply(pageHtml(REFUSAL_CARD_BODY)),
  )
  assert.deepEqual(observed.data, { kind: 'message', message: 'Wrong password' })
})

void test('a document is reported as the page it is, never as a decoded document', async () => {
  const observed = await answer(
    (session) => publicBoard(session),
    pageReply(pageHtml(BAN_LIST_BODY)),
  )
  assert.deepEqual(observed.data, { kind: 'page' })
})

void test('an empty body is reported as its own kind', async () => {
  const observed = await answer((session) => publicBoard(session), { body: '' })
  assert.deepEqual(observed.data, { kind: 'empty' })
})
