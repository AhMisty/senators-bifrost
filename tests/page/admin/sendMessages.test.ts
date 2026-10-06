import assert from 'node:assert/strict'
import { test } from 'node:test'

import { adminSendMessages, adminSendMessagesSend } from '../../../src/index.ts'
import { adminNoticeCard, adminSendMessagesForm } from '../../fixtures/admin/index.ts'
import {
  BASE_URL,
  expectOperation,
  fakeServer,
  pageHtml,
  pageReply,
  read,
  sessionOn,
} from '../../helpers.ts'

const SEND_MESSAGES_URL = `${BASE_URL}admin.php?page=sendMessages`

const CHANNELS: (readonly [string, string])[] = [
  ['0', 'Game message'],
  ['1', 'Email to all players'],
  ['2', 'Game message + Email to all players'],
]
const LANGUAGES: (readonly [string, string])[] = [
  ['', 'Every language'],
  ['de', 'German'],
]

void test('the two selectors the form renders are reported with their own values and labels', async () => {
  const body = adminSendMessagesForm(CHANNELS, LANGUAGES)
  const page = await read(adminSendMessages, pageReply(pageHtml(body)))

  assert.deepEqual(page.channels, [
    { value: 0, label: 'Game message' },
    { value: 1, label: 'Email to all players' },
    { value: 2, label: 'Game message + Email to all players' },
  ])
  assert.deepEqual(page.languages, [
    { value: '', label: 'Every language' },
    { value: 'de', label: 'German' },
  ])
  assert.equal(page.kind, 'adminSendMessages')

  assert.equal('planetId' in page, false)

  assert.ok(page.observedAtMs > 0)
  await expectOperation(adminSendMessages, { url: SEND_MESSAGES_URL })
})

void test('an installation with mail disabled offers only game messages', async () => {
  const page = await read(
    adminSendMessages,
    pageReply(pageHtml(adminSendMessagesForm([['0', 'Game message']], LANGUAGES))),
  )
  assert.deepEqual(page.channels, [{ value: 0, label: 'Game message' }])
})

void test('an unknown channel in a response is rejected', async () => {
  const server = fakeServer(
    pageReply(pageHtml(adminSendMessagesForm([['3', 'Unknown channel']], LANGUAGES))),
  )
  await assert.rejects(adminSendMessages(sessionOn(server)), {
    code: 'parse',
    message: 'Unknown broadcast channel',
  })
})

void test('a broadcast is sent under the four field names the form carries', async () => {
  await expectOperation(
    (session) =>
      adminSendMessagesSend(session, {
        broadcast: {
          channel: 2,
          subject: 'Maintenance',
          text: 'Hello {USERNAME}, the universe restarts tonight.',
          language: 'de',
        },
      }),
    {
      method: 'POST',
      url: `${BASE_URL}admin.php?action=send&page=sendMessages`,
      body: [
        ['key', '2'],
        ['subject', 'Maintenance'],
        ['text', 'Hello {USERNAME}, the universe restarts tonight.'],
        ['globalmessagelang', 'de'],
      ],
    },
  )
})

void test('a broadcast with no language restriction sends the field empty rather than omitting it', async () => {
  await expectOperation(
    (session) =>
      adminSendMessagesSend(session, {
        broadcast: { channel: 1, subject: '', text: 'Hello' },
      }),
    {
      method: 'POST',
      url: `${BASE_URL}admin.php?action=send&page=sendMessages`,
      body: [
        ['key', '1'],
        ['subject', ''],
        ['text', 'Hello'],
        ['globalmessagelang', ''],
      ],
    },
  )
})

void test('the sentence the page answers a broadcast with is reported as it stands', async () => {
  const server = fakeServer(pageReply(pageHtml(adminNoticeCard('Sent to 12 accounts'))))
  const observed = await adminSendMessagesSend(sessionOn(server), {
    broadcast: { channel: 1, subject: 'x', text: 'y' },
  })
  assert.deepEqual(observed.data, { kind: 'message', message: 'Sent to 12 accounts' })
})

void test('a player session raises the administrative-access failure', async () => {
  const server = fakeServer({ status: 302, headers: { Location: './game.php' } })
  await assert.rejects(adminSendMessages(sessionOn(server)), {
    code: 'server',
    serverCode: 'admin-authentication',
  })
})
