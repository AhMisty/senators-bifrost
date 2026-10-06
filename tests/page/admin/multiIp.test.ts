import assert from 'node:assert/strict'
import { test } from 'node:test'

import { adminMultiIp, adminMultiIpMark } from '../../../src/index.ts'
import { MULTI_IP_BODY, MULTI_IP_EMPTY_BODY } from '../../fixtures/admin/listPages.ts'
import {
  BASE_URL,
  answer,
  decode,
  expectOperation,
  jsonResponse,
  pageHtml,
  pageReply,
  read,
} from '../../helpers.ts'

const MULTI_IP_URL = `${BASE_URL}admin.php?page=multiIP`

void test('each address is read with the accounts that share it', async () => {
  const observed = await read(adminMultiIp, pageReply(pageHtml(MULTI_IP_BODY)))
  const { observedAtMs, ...multiIp } = observed
  assert.ok(observedAtMs > 0, 'the document carries the time it was read')
  assert.deepEqual(multiIp, {
    kind: 'adminMultiIp',
    groups: [
      {
        ip: '10.0.0.1',
        accounts: [
          {
            id: 1,
            name: 'Yaro',
            email: 'yaro@example.com',
            registeredAtText: '01.02.2026 10:00:00',
            onlineAtText: '01.02.2026 11:00:00',
            known: false,
          },
          {
            id: 2,
            name: 'Cheater',
            email: 'cheater@example.com',
            registeredAtText: '01.02.2026 10:00:00',
            onlineAtText: '01.02.2026 11:00:00',
            known: true,
          },
        ],
      },
      {
        ip: '10.0.0.2',
        accounts: [
          {
            id: 3,
            name: 'Solo',
            email: 'solo@example.com',
            registeredAtText: '01.02.2026 10:00:00',
            onlineAtText: '01.02.2026 11:00:00',
            known: false,
          },
        ],
      },
    ],
  })
})

void test('an installation with nothing to group renders no group at all', async () => {
  const multiIp = await read(adminMultiIp, pageReply(pageHtml(MULTI_IP_EMPTY_BODY)))
  assert.deepEqual(multiIp.groups, [])
  assert.equal('planetId' in multiIp, false)
})

void test('the groups read is the one address the page owns', async () => {
  await expectOperation((session) => adminMultiIp(session), { url: MULTI_IP_URL })
})

void test('the marking control is this address read with the account and the state to set', async () => {
  const asked: [Parameters<typeof adminMultiIpMark>[1], string][] = [
    [{ playerId: 2, known: true }, `${BASE_URL}admin.php?action=known&id=2&page=multiIP`],
    [{ playerId: 1, known: false }, `${BASE_URL}admin.php?action=unknown&id=1&page=multiIP`],
  ]
  for (const [options, url] of asked)
    await expectOperation((session) => adminMultiIpMark(session, options), { url })
})

void test('the mark is answered with the redirect the server sends back', async () => {
  const answered = await decode(
    (session) => adminMultiIpMark(session, { playerId: 2, known: true }),
    { status: 302, headers: { Location: 'admin.php?page=multiIP' } },
  )
  assert.deepEqual(answered.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}admin.php?page=multiIP`),
  })
})

void test('an answer the endpoint wrote as JSON is its own receipt', async () => {
  const payload = await answer(adminMultiIp, jsonResponse('{"error":"denied"}'))
  assert.deepEqual(payload.data, { kind: 'json', value: { error: 'denied' } })
})
