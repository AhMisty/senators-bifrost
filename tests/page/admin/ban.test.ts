import assert from 'node:assert/strict'
import { test } from 'node:test'

import { adminBan, adminBanLift, adminBanLookup, adminBanPlace } from '../../../src/index.ts'
import {
  BAN_BODY,
  BAN_LIST_ONLY_BODY,
  BAN_LISTS_ONLY_BODY,
  BAN_VACATION_BODY,
} from '../../fixtures/admin/listPages.ts'
import { BASE_URL, expectOperation, pageHtml, pageReply, read } from '../../helpers.ts'

const BAN_URL = `${BASE_URL}admin.php?page=ban`

const BAN_LISTS = {
  candidates: [
    { value: 'Cheater', label: 'Cheater (ID: 7)Suspended' },
    { value: 'Yaro', label: 'Yaro (ID: 1)' },
  ],
  banned: [{ value: 'Cheater', label: 'Cheater (ID: 7)' }],
}

void test('the ban page is read from the form a lookup rendered and the two lists', async () => {
  const observed = await read(adminBan, pageReply(pageHtml(BAN_BODY)))
  const { observedAtMs, ...ban } = observed
  assert.ok(observedAtMs > 0, 'the document carries the time it was read')
  assert.deepEqual(ban, {
    kind: 'adminBan',

    ...BAN_LISTS,
    target: {
      name: 'Cheater',
      reason: 'Cheating <tr><th>Ban ends</th><th height=25 colspan=2>01.02.2027 12:00:00</th></tr>',
      vacation: false,
    },
  })
})

void test('an account in vacation mode is reported as one', async () => {
  const ban = await read(adminBan, pageReply(pageHtml(BAN_VACATION_BODY)))
  assert.equal(ban.target?.vacation, true)
})

void test('a page that rendered no lookup reports no target of its own', async () => {
  const ban = await read(adminBan, pageReply(pageHtml(BAN_LIST_ONLY_BODY)))
  assert.equal(ban.target, null)
  assert.deepEqual(ban.candidates, BAN_LISTS.candidates)
})

void test('a document with no ban form at all reports no target', async () => {
  const ban = await read(adminBan, pageReply(pageHtml(BAN_LISTS_ONLY_BODY)))
  assert.equal(ban.target, null)
})

void test('a lookup is the account list’s own submission', async () => {
  await expectOperation((session) => adminBanLookup(session, { username: 'Cheater' }), {
    method: 'POST',
    url: BAN_URL,
    body: [
      ['ban_name', 'Cheater'],
      ['panel', '1'],
    ],
  })
})

void test('a ban is the form’s own fields, in the order the form carries them', async () => {
  await expectOperation(
    (session) =>
      adminBanPlace(session, {
        ban: {
          username: 'Cheater',
          reason: 'Cheating',
          duration: { days: 2, hours: 3 },
          permanent: true,
          vacation: true,
        },
      }),
    {
      method: 'POST',
      url: BAN_URL,
      body: [
        ['ban_name', 'Cheater'],
        ['why', 'Cheating'],
        ['days', '2'],
        ['hour', '3'],

        ['mins', '0'],
        ['secs', '0'],
        ['permanent', '1'],
        ['vacat', '1'],
        ['bannow', '1'],
      ],
    },
  )
})

void test('a timed ban sends neither of the two optional flags', async () => {
  await expectOperation(
    (session) =>
      adminBanPlace(session, {
        ban: { username: 'Yaro', reason: 'Spam', duration: { minutes: 30, seconds: 15 } },
      }),
    {
      method: 'POST',
      url: BAN_URL,
      body: [
        ['ban_name', 'Yaro'],
        ['why', 'Spam'],
        ['days', '0'],
        ['hour', '0'],
        ['mins', '30'],
        ['secs', '15'],
        ['bannow', '1'],
      ],
    },
  )
})

void test('lifting a ban is the second list’s own field', async () => {
  await expectOperation((session) => adminBanLift(session, { username: 'Cheater' }), {
    method: 'POST',
    url: BAN_URL,
    body: [['unban_name', 'Cheater']],
  })
})

void test('the orderings and the view a caller asks for are the address’s own parameters', async () => {
  const asked: [Parameters<typeof adminBan>[1], string][] = [
    [undefined, BAN_URL],
    [{ order: 'username' }, `${BASE_URL}admin.php?order=username&page=ban`],
    [{ bannedOrder: 'id' }, `${BASE_URL}admin.php?order2=id&page=ban`],
    [{ view: 'banned' }, `${BASE_URL}admin.php?view=bana&page=ban`],
    [{ view: 'all' }, `${BASE_URL}admin.php?view=all&page=ban`],
  ]
  for (const [options, url] of asked)
    await expectOperation((session) => adminBan(session, options), { url })
})
