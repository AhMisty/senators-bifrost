import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ErrorCode, adminModule, adminModuleSet } from '../../../src/index.ts'
import { adminModuleTable, adminNoticeCard } from '../../fixtures/admin/index.ts'
import {
  BASE_URL,
  expectOperation,
  fakeServer,
  pageHtml,
  pageReply,
  read,
  sessionOn,
} from '../../helpers.ts'

const MODULE_URL = `${BASE_URL}admin.php?page=module`

void test('a row states the module’s number, its name and whether it is on', async () => {
  const body = adminModuleTable([
    { id: 3, name: 'Fair', active: true },
    { id: 1, name: 'Bonus', active: false },
  ])
  const page = await read(adminModule, pageReply(pageHtml(body)))
  assert.deepEqual(page.modules, [
    { id: 3, name: 'Fair', active: true },
    { id: 1, name: 'Bonus', active: false },
  ])
  assert.equal(page.kind, 'adminModule')

  assert.equal('planetId' in page, false)

  assert.ok(page.observedAtMs > 0)
  await expectOperation(adminModule, { url: MODULE_URL })
})

void test('a module the installation has none of lists nothing', async () => {
  const body = adminModuleTable([])
  const page = await read(adminModule, pageReply(pageHtml(body)))
  assert.deepEqual(page.modules, [])
})

void test('a row whose control cannot be read is a decoding failure, not a row without a state', async () => {
  const body = adminModuleTable([]).replace(
    '</tbody>',
    '<tr><td>1</td><td>Bonus</td><td>off</td></tr></tbody>',
  )
  await assert.rejects(() => read(adminModule, pageReply(pageHtml(body))), {
    code: ErrorCode.ParseError,
    message: 'Missing response URL',
  })
})

void test('switching a module off asks for the state the control would set', async () => {
  await expectOperation((session) => adminModuleSet(session, { moduleId: 3, active: false }), {
    url: `${BASE_URL}admin.php?act=deaktiv&id=3&page=module`,
  })
})

void test('switching a module on asks for the other state', async () => {
  await expectOperation((session) => adminModuleSet(session, { moduleId: 7, active: true }), {
    url: `${BASE_URL}admin.php?act=aktiv&id=7&page=module`,
  })
})

void test('the page the switch renders again is answered as a message when it prints one', async () => {
  const server = fakeServer(pageReply(pageHtml(adminNoticeCard('Module changed'))))
  const observed = await adminModuleSet(sessionOn(server), { moduleId: 3, active: false })
  assert.deepEqual(observed.data, { kind: 'message', message: 'Module changed' })
})

void test('a player session raises the administrative-access failure', async () => {
  const server = fakeServer({ status: 302, headers: { Location: './game.php' } })
  await assert.rejects(adminModule(sessionOn(server)), {
    code: 'server',
    serverCode: 'admin-authentication',
  })
})
