import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  adminUniverse,
  adminUniverseCreate,
  adminUniverseDelete,
  adminUniverseOpen,
} from '../../../src/index.ts'
import {
  UNIVERSE_BODY,
  UNIVERSE_EMPTY_BODY,
  UNIVERSE_WITHOUT_CREATE_BODY,
  adminMessage,
} from '../../fixtures/admin/listPages.ts'
import {
  BASE_URL,
  answer,
  decode,
  expectOperation,
  pageHtml,
  pageReply,
  read,
} from '../../helpers.ts'

const UNIVERSE_URL = `${BASE_URL}admin.php?page=universe`

void test('each universe is read with its speeds, its counts and the state its links name', async () => {
  const observed = await read(adminUniverse, pageReply(pageHtml(UNIVERSE_BODY)))
  const { observedAtMs, ...universe } = observed
  assert.ok(observedAtMs > 0, 'the document carries the time it was read')
  assert.deepEqual(universe, {
    kind: 'adminUniverse',
    canCreate: true,
    universes: [
      {
        id: 1,
        name: 'Root',
        gameSpeedFactor: 1,
        fleetSpeedFactor: 1,
        resourceMultiplier: 1,
        haltSpeed: 1,
        energySpeed: 1,
        users: 1234,
        planets: 5678,
        inactiveUsers: 12,
        open: true,
        deletable: false,
      },
      {
        id: 2,
        name: 'Second',
        gameSpeedFactor: 1,
        fleetSpeedFactor: 1,
        resourceMultiplier: 1,
        haltSpeed: 1,
        energySpeed: 1,
        users: 0,
        planets: 0,
        inactiveUsers: 0,
        open: false,
        deletable: true,
      },
    ],
  })
})

void test('a table with no universe states none, and still offers to create one', async () => {
  const universe = await read(adminUniverse, pageReply(pageHtml(UNIVERSE_EMPTY_BODY)))
  assert.deepEqual(universe.universes, [])
  assert.equal(universe.canCreate, true)
  assert.equal('planetId' in universe, false)
})

void test('a table whose create control is absent reports that it offers none', async () => {
  const universe = await read(adminUniverse, pageReply(pageHtml(UNIVERSE_WITHOUT_CREATE_BODY)))
  assert.equal(universe.canCreate, false)
  assert.equal(universe.universes.length, 1)
})

void test('the table read is the one address the page owns', async () => {
  await expectOperation((session) => adminUniverse(session), { url: UNIVERSE_URL })
})

void test('opening or closing a universe is the state to store beside the universe it names', async () => {
  const asked: [Parameters<typeof adminUniverseOpen>[1], string][] = [
    [{ universeId: 2, open: true }, `${BASE_URL}admin.php?action=open&uniID=2&page=universe`],
    [{ universeId: 1, open: false }, `${BASE_URL}admin.php?action=closed&uniID=1&page=universe`],
  ]
  for (const [options, url] of asked)
    await expectOperation((session) => adminUniverseOpen(session, options), { url })
})

void test('deleting a universe and creating one are each an action on this address', async () => {
  await expectOperation((session) => adminUniverseDelete(session, { universeId: 2 }), {
    url: `${BASE_URL}admin.php?action=delete&uniID=2&page=universe`,
  })
  await expectOperation((session) => adminUniverseCreate(session), {
    url: `${BASE_URL}admin.php?action=create&page=universe`,
  })
})

void test('a delete the server refused comes back as the table it rendered unchanged', async () => {
  const answered = await decode(
    (session) => adminUniverseDelete(session, { universeId: 1 }),
    pageReply(pageHtml(UNIVERSE_BODY)),
  )
  assert.deepEqual(answered.data, { kind: 'page' })
})

void test('a create the installation cannot serve is a message rather than a redirect', async () => {
  const answered = await answer(
    adminUniverseCreate,
    pageReply(pageHtml(adminMessage('A rewrite rule is missing'))),
  )
  assert.deepEqual(answered.data, { kind: 'message', message: 'A rewrite rule is missing' })
})

void test('a change the server accepted is the redirect it answered with', async () => {
  const answered = await decode((session) => adminUniverseDelete(session, { universeId: 2 }), {
    status: 302,
    headers: { Location: '../admin.php' },
  })
  assert.deepEqual(answered.data, { kind: 'redirect', target: new URL('/admin.php', BASE_URL) })
})
