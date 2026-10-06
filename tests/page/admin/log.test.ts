import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  adminLog,
  adminLogDetail,
  adminLogList,
  parsePage,
  readAdminLog,
  readAdminLogDetail,
  readAdminLogList,
} from '../../../src/index.ts'
import {
  ADMIN_LOG_MENU_BODY,
  adminLogDetail as detailFixture,
  adminLogList as listFixture,
} from '../../fixtures/admin/index.ts'
import {
  BASE_URL,
  expectOperation,
  fakeServer,
  httpResponse,
  pageHtml,
  pageReply,
  read,
  sessionOn,
} from '../../helpers.ts'

const LOG_URL = `${BASE_URL}admin.php?page=log`

const ENTRY = {
  id: 7,
  admin: 'AhMisty',
  universe: 'Universe 42',
  target: 'Homeworld [1:2:3]',
  atText: '01.01.2024 10:00',
}

const LIST_PAGE = parsePage(
  httpResponse({ body: pageHtml(listFixture([ENTRY])) }, `${LOG_URL}&mode=ShowLogPlayersList`),
)

const MENU_PAGE = parsePage(httpResponse({ body: pageHtml(ADMIN_LOG_MENU_BODY) }, LOG_URL))

const DETAIL_WITHOUT_CHANGE_TABLE = detailFixture({
  admin: 'AhMisty',
  universe: 'Universe 42',
  atText: '01.01.2024 10:00',
  changes: [],
}).replace('<table class="table table-dark table-hover">', '')

void test('the menu offers the four logs the class can dispatch, with their own titles', async () => {
  const page = await read(adminLog, pageReply(pageHtml(ADMIN_LOG_MENU_BODY)))
  assert.deepEqual(page.logs, [
    { kind: 'planets', title: 'log_planet' },
    { kind: 'players', title: 'log_player' },
    { kind: 'settings', title: 'log_settings' },
    { kind: 'present', title: 'log_present' },
  ])
  assert.equal(page.kind, 'adminLog')

  assert.equal('planetId' in page, false)

  assert.ok(page.observedAtMs > 0)
  await expectOperation(adminLog, { url: LOG_URL })
})

void test('a card that opens no log the class knows is not one of the menu’s logs', async () => {
  const page = await read(adminLog, pageReply(pageHtml(ADMIN_LOG_MENU_BODY)))
  assert.equal(page.logs.length, 4)
  assert.equal(
    page.logs.some((log) => ['log_unknown', 'log_untyped', 'log_plain'].includes(log.title)),
    false,
  )
})

void test('the menu decoder is the published one the page function is built on', () => {
  assert.deepEqual(readAdminLog(MENU_PAGE).logs, [
    { kind: 'planets', title: 'log_planet' },
    { kind: 'players', title: 'log_player' },
    { kind: 'settings', title: 'log_settings' },
    { kind: 'present', title: 'log_present' },
  ])
})

void test('each list address is a mode of the log page and names its own log', async () => {
  const body = pageReply(pageHtml(listFixture([ENTRY])))
  for (const log of ['planets', 'players', 'settings', 'present'] as const) {
    const page = await read((session) => adminLogList(session, { log }), body)
    assert.equal(page.log, log)
    assert.equal(page.kind, 'adminLogList')
    assert.equal('planetId' in page, false)
  }
})

void test('a log list states each row’s id, administrator, universe, target and time', async () => {
  const body = pageReply(pageHtml(listFixture([ENTRY, { ...ENTRY, id: 8, admin: 'Other' }])))
  const page = await read((session) => adminLogList(session, { log: 'settings' }), body)
  assert.deepEqual(page.entries, [ENTRY, { ...ENTRY, id: 8, admin: 'Other' }])
})

void test('the list decoder reports the log it was told, and nothing else', () => {
  assert.deepEqual(readAdminLogList(LIST_PAGE, 'settings'), {
    kind: 'adminLogList',
    log: 'settings',
    observedAtMs: 1,
    entries: [ENTRY],
  })
})

void test('the addresses of the four lists name their own mode', async () => {
  for (const [log, mode] of [
    ['planets', 'ShowLogPlanetsList'],
    ['players', 'ShowLogPlayersList'],
    ['settings', 'ShowLogSettingsList'],
    ['present', 'ShowLogPresent'],
  ] as const)
    await expectOperation((session) => adminLogList(session, { log }), {
      url: `${LOG_URL}&mode=${mode}`,
    })
})

void test('one log row is read from the address that names it', async () => {
  await expectOperation((session) => adminLogDetail(session, { logId: 7 }), {
    url: `${BASE_URL}admin.php?id=7&page=log&mode=ShowLogDetail`,
  })
})

void test('a log row states its three figures and the fields the change touched', async () => {
  const body = detailFixture({
    admin: 'AhMisty',
    universe: 'Universe 42',
    atText: '01.01.2024 10:00',
    changes: [
      { element: 'Metal', before: '1000', after: '2000' },
      { element: 'Name', before: 'Homeworld', after: 'Nova' },
    ],
  })
  const page = await read(
    (session) => adminLogDetail(session, { logId: 7 }),
    pageReply(pageHtml(body)),
  )
  const { observedAtMs, ...rest } = page
  assert.ok(observedAtMs > 0)
  assert.deepEqual(rest, {
    kind: 'adminLogDetail',
    admin: 'AhMisty',
    universe: 'Universe 42',
    atText: '01.01.2024 10:00',
    changes: [
      { element: 'Metal', before: '1000', after: '2000' },
      { element: 'Name', before: 'Homeworld', after: 'Nova' },
    ],
  })
})

void test('a change that touched nothing lists no field', async () => {
  const body = detailFixture({
    admin: 'AhMisty',
    universe: 'Universe 42',
    atText: '01.01.2024 10:00',
    changes: [],
  })
  const page = await read(
    (session) => adminLogDetail(session, { logId: 7 }),
    pageReply(pageHtml(body)),
  )
  assert.equal(page.admin, 'AhMisty')
  assert.equal(page.universe, 'Universe 42')
  assert.equal(page.atText, '01.01.2024 10:00')
  assert.deepEqual(page.changes, [])
})

void test('a detail document whose change table is missing reports no field', () => {
  const page = parsePage(
    httpResponse(
      { body: pageHtml(DETAIL_WITHOUT_CHANGE_TABLE) },
      `${LOG_URL}&mode=ShowLogDetail&id=7`,
    ),
  )
  assert.deepEqual(readAdminLogDetail(page).changes, [])
})

void test('a log the server refuses to render comes back as the receipt it answered with', async () => {
  const server = fakeServer({ status: 302, headers: { Location: './index.php?page=login' } })
  const observed = await adminLog(sessionOn(server))
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}index.php?page=login`),
  })
})

void test('a log with nothing in it lists no entry rather than failing to decode', async () => {
  const server = fakeServer(pageReply(pageHtml(listFixture([]))))
  const observed = await adminLogList(sessionOn(server), { log: 'present' })
  assert.equal(observed.data.kind, 'adminLogList')
  assert.deepEqual(observed.data.kind === 'adminLogList' ? observed.data.entries : null, [])
})

void test('a log the server refuses with a sentence is reported as that message', async () => {
  const server = fakeServer(
    pageReply(
      pageHtml(
        '<main role="main"><div class="card mb-3"><h5 class="card-header">fcm_info</h5>' +
          '<div class="card-body"><p class="card-text">Not permitted</p></div></div></main>',
      ),
    ),
  )
  const observed = await adminLogList(sessionOn(server), { log: 'present' })
  assert.deepEqual(observed.data, { kind: 'message', message: 'Not permitted' })
})
