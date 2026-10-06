import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ErrorCode, adminActive, adminActiveDelete } from '../../../src/index.ts'
import {
  ACTIVE_BODY,
  ACTIVE_NO_TOTAL_BODY,
  ACTIVE_WITHOUT_ACTIVATION_BODY,
  ACTIVE_WITHOUT_SUMMARY_BODY,
  ACTIVE_WITH_EMPTY_KEY_BODY,
} from '../../fixtures/admin/listPages.ts'
import {
  BASE_URL,
  expectOperation,
  fakeServer,
  pageHtml,
  pageReply,
  read,
  sessionOn,
} from '../../helpers.ts'

const ACTIVE_URL = `${BASE_URL}admin.php?page=active`

void test('the list is read row by row, with the count the summary row states', async () => {
  const observed = await read(adminActive, pageReply(pageHtml(ACTIVE_BODY)))
  const { observedAtMs, ...active } = observed
  assert.ok(observedAtMs > 0, 'the document carries the time it was read')
  assert.deepEqual(active, {
    kind: 'adminActive',
    total: 3,
    registrations: [
      {
        id: 17,
        name: 'Newcomer',
        registeredAtText: '01.02.2026 10:00:00',
        email: 'newcomer@example.com',
        ip: '10.0.0.7',
        validationKey: 'k3y-17',
      },
      {
        id: 18,
        name: 'Recruit',
        registeredAtText: '01.02.2026 10:00:00',
        email: 'recruit@example.com',
        ip: '10.0.0.8',
        validationKey: 'k3y-18',
      },
    ],
  })
  assert.equal('planetId' in active, false)
})

void test('a summary sentence that carries two numbers states no total', async () => {
  const active = await read(adminActive, pageReply(pageHtml(ACTIVE_NO_TOTAL_BODY)))
  assert.equal(active.total, null)
  assert.deepEqual(
    active.registrations.map((registration) => registration.id),
    [18],
  )
})

void test('a list without its summary row states no total', async () => {
  const active = await read(adminActive, pageReply(pageHtml(ACTIVE_WITHOUT_SUMMARY_BODY)))
  assert.equal(active.total, null)
  assert.deepEqual(
    active.registrations.map((registration) => registration.id),
    [18],
  )
})

void test('a row whose activation call cannot be read is a decoding failure', async () => {
  const unreadable: [string, string, string][] = [
    ['the anchor carries no call', ACTIVE_WITHOUT_ACTIVATION_BODY, 'Missing activation key'],
    ['the call passes an empty key', ACTIVE_WITH_EMPTY_KEY_BODY, 'Missing activation key'],
  ]
  for (const [name, body, message] of unreadable)
    await assert.rejects(
      () => adminActive(sessionOn(fakeServer(pageReply(pageHtml(body))))),
      { code: ErrorCode.ParseError, message },
      name,
    )
})

void test('the list an address reads is the one the page owns', async () => {
  await expectOperation((session) => adminActive(session), { url: ACTIVE_URL })
})

void test('the delete control is this address read with the row’s id', async () => {
  await expectOperation((session) => adminActiveDelete(session, { validationId: 17 }), {
    url: `${BASE_URL}admin.php?action=delete&id=17&page=active`,
  })
})

void test('the delete is a read of the page, so the server rendered one rather than a message', async () => {
  const server = fakeServer(pageReply(pageHtml(ACTIVE_BODY)))
  const answered = await adminActiveDelete(sessionOn(server), { validationId: 17 })
  assert.equal(server.requests.length, 1)
  assert.deepEqual(answered.data, { kind: 'page' })
})
