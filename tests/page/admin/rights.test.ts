import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { AdminRightsGroup, Page } from '../../../src/index.ts'
import {
  adminRights,
  adminRightsLookup,
  adminRightsSave,
  adminRightsSetLevel,
  parsePage,
  readAdminRights,
} from '../../../src/index.ts'
import {
  RIGHTS_GRANTS_BODY,
  RIGHTS_MENU_BODY,
  RIGHTS_SELECTOR_BODY,
  RIGHTS_USERS_BODY,
  adminMessageBody,
} from '../../fixtures/admin/formPages.ts'
import {
  BASE_URL,
  answer,
  decode,
  expectOperation,
  fakeServer,
  httpResponse,
  pageHtml,
  pageReply,
  sessionOn,
} from '../../helpers.ts'

const RIGHTS_URL = `${BASE_URL}admin.php?page=rights`

function rightsUrl(parameters: Record<string, string>): string {
  return `${BASE_URL}admin.php?${new URLSearchParams(parameters).toString()}&page=rights`
}

function pageOf(body: string, url = RIGHTS_URL): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, url))
}

const ACCOUNTS = [
  { value: '7', label: 'Nova (Administrator)' },
  { value: '9', label: 'Vega (Moderator)' },
]

void test('the menu offers the documents it opens, and neither a selector nor a table', async () => {
  const server = fakeServer(pageReply(pageHtml(RIGHTS_MENU_BODY)))
  const observed = await adminRights(sessionOn(server))
  assert.equal(observed.data.kind, 'adminRights')
  const page = observed.data

  assert.equal('planetId' in page, false)
  assert.equal(page.section, 'menu')

  assert.deepEqual(page.menu, ['rights', 'users'])
  assert.deepEqual(page.accounts, [])

  assert.equal(page.group, 'administrator')
  assert.equal(page.account, null)
  assert.deepEqual(page.grants, [])
  assert.deepEqual(page.levels, [])
  assert.ok(page.observedAtMs > 0)
  assert.equal(server.requests[0]!.url.href, RIGHTS_URL)
})

void test('a selector lists the accounts it offers and the group the address filtered them by', async () => {
  const observed = await adminRights(
    sessionOn(fakeServer(pageReply(pageHtml(RIGHTS_SELECTOR_BODY)))),
    {
      section: 'rights',
      group: 'administrator',
    },
  )
  assert.equal(observed.data.kind, 'adminRights')

  assert.equal('planetId' in observed.data, false)
  assert.equal(observed.data.section, 'rights')
  assert.deepEqual(observed.data.accounts, ACCOUNTS)

  assert.equal(observed.data.group, 'administrator')
  assert.deepEqual(observed.data.levels, [])
  assert.equal(observed.data.account, null)
})

void test('the rights menu is read for the section it was asked for', () => {
  assert.deepEqual(readAdminRights(pageOf(RIGHTS_MENU_BODY), 'menu'), {
    kind: 'adminRights',
    observedAtMs: 1,
    section: 'menu',
    menu: ['rights', 'users'],
    accounts: [],
    group: 'administrator',
    account: null,
    grants: [],
    levels: [],
  })
  assert.deepEqual(
    readAdminRights(pageOf(RIGHTS_SELECTOR_BODY, rightsUrl({ get: 'pla' })), 'rights'),
    {
      kind: 'adminRights',
      observedAtMs: 1,
      section: 'rights',
      menu: [],
      accounts: ACCOUNTS,
      group: 'player',
      account: null,
      grants: [],
      levels: [],
    },
  )
})

void test('the group read is the one the selector lists, administrators where the address names none', () => {
  const cases: [string, string, AdminRightsGroup][] = [
    ['the admins', rightsUrl({ get: 'adm' }), 'administrator'],
    ['the operators', rightsUrl({ get: 'ope' }), 'operator'],
    ['the moderators', rightsUrl({ get: 'mod' }), 'moderator'],
    ['the players', rightsUrl({ get: 'pla' }), 'player'],
    ['no group at all', RIGHTS_URL, 'administrator'],
  ]
  for (const [name, url, group] of cases)
    assert.equal(readAdminRights(pageOf(RIGHTS_SELECTOR_BODY, url), 'rights').group, group, name)
})

void test('an unknown group is not reported as an administrator filter', () => {
  assert.throws(
    () => readAdminRights(pageOf(RIGHTS_SELECTOR_BODY, rightsUrl({ get: 'moderator' })), 'rights'),
    {
      code: 'parse',
      message: 'Unknown administrative group',
    },
  )
})

void test('the level tool offers the levels it can store, beside the same selector', async () => {
  const observed = await adminRights(
    sessionOn(fakeServer(pageReply(pageHtml(RIGHTS_USERS_BODY)))),
    { section: 'users' },
  )
  assert.equal(observed.data.kind, 'adminRights')
  assert.equal('planetId' in observed.data, false)
  assert.equal(observed.data.section, 'users')
  assert.deepEqual(observed.data.accounts, ACCOUNTS)
  assert.deepEqual(observed.data.levels, [
    { value: '0', label: 'Player' },
    { value: '1', label: 'Moderator' },
    { value: '2', label: 'Operator' },
    { value: '3', label: 'Administrator' },
  ])
})

void test('the grants table heads itself with the account and reads each row’s two radios', async () => {
  const server = fakeServer(pageReply(pageHtml(RIGHTS_GRANTS_BODY)))
  const observed = await adminRightsLookup(sessionOn(server), { playerId: 7 })
  assert.equal(observed.data.kind, 'adminRights')
  const page = observed.data
  assert.equal('planetId' in page, false)
  assert.equal(page.section, 'rights')

  assert.equal(page.account, 'Nova')
  assert.deepEqual(page.grants, [
    { page: 'ShowAccountEditorPage.class', granted: true },
    { page: 'ShowBanPage.class', granted: false },
  ])

  assert.deepEqual(page.levels, [])
  assert.deepEqual(page.accounts, [])

  assert.equal(server.requests[0]!.method, 'POST')
  assert.equal(server.requests[0]!.url.href, rightsUrl({ key: 'rights' }))
  assert.deepEqual([...(server.requests[0]!.body ?? new URLSearchParams())], [['id_1', '7']])
})

void test('a row whose granted radio is not the checked one is a refusal', () => {
  const unreadable = RIGHTS_GRANTS_BODY.replace(
    'type="radio" checked="checked" value="1"',
    'type="radio" value="1"',
  )
  assert.deepEqual(readAdminRights(pageOf(unreadable), 'rights').grants, [
    { page: 'ShowAccountEditorPage.class', granted: false },
    { page: 'ShowBanPage.class', granted: false },
  ])
})

void test('each document’s address is the menu’s own with the parameters it carries', async () => {
  await expectOperation((session) => adminRights(session, { section: 'rights' }), {
    url: rightsUrl({ key: 'rights' }),
  })
  await expectOperation(
    (session) => adminRights(session, { section: 'users', group: 'moderator' }),
    {
      url: rightsUrl({ key: 'users', get: 'mod' }),
    },
  )
  await expectOperation((session) => adminRights(session, { group: 'player' }), {
    url: rightsUrl({ get: 'pla' }),
  })
  await expectOperation((session) => adminRightsLookup(session, { playerId: 7 }), {
    method: 'POST',
    url: rightsUrl({ key: 'rights' }),
    body: [['id_1', '7']],
  })
})

void test('storing grants writes every class the caller named, granted or refused', async () => {
  await expectOperation(
    (session) =>
      adminRightsSave(session, {
        playerId: 7,
        grants: {
          'ShowAccountEditorPage.class': true,
          'ShowBanPage.class': false,
          'ShowLogPage.class': true,
        },
      }),
    {
      method: 'POST',
      url: rightsUrl({ key: 'rights' }),
      body: [
        ['action', 'send'],
        ['id_1', '7'],
        ['rights[ShowAccountEditorPage.class]', '1'],
        ['rights[ShowBanPage.class]', '0'],
        ['rights[ShowLogPage.class]', '1'],
      ],
    },
  )
})

void test('storing a level sends the account the selector named and the level to store', async () => {
  await expectOperation((session) => adminRightsSetLevel(session, { playerId: 7, level: 3 }), {
    method: 'POST',
    url: rightsUrl({ key: 'users' }),
    body: [
      ['id_1', '7'],
      ['authlevel', '3'],
    ],
  })
})

void test('a refusal and an accepted write are both reported as the answer the server gave', async () => {
  const stored = await answer(
    (session) => adminRightsSave(session, { playerId: 7, grants: {} }),
    pageReply(pageHtml(adminMessageBody('Rights stored'))),
  )
  assert.deepEqual(stored.data, { kind: 'message', message: 'Rights stored' })
  const levelled = await answer(
    (session) => adminRightsSetLevel(session, { playerId: 7, level: 3 }),
    { body: '' },
  )
  assert.deepEqual(levelled.data, { kind: 'empty' })

  const refused = await decode(
    (session) => adminRightsLookup(session, { playerId: 1 }),
    pageReply(pageHtml(adminMessageBody('You cannot edit the root account'))),
  )
  assert.deepEqual(refused.data, {
    kind: 'message',
    message: 'You cannot edit the root account',
  })
})

void test('a read the server answered without a document is the receipt it is', async () => {
  const empty = await decode((session) => adminRights(session, { group: 'administrator' }), {
    body: '',
  })
  assert.deepEqual(empty.data, { kind: 'empty' })
})
