import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import { adminDump, adminDumpBackup, parsePage, readAdminDump } from '../../../src/index.ts'
import { DUMP_BODY, adminMessageBody } from '../../fixtures/admin/formPages.ts'
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

const DUMP_URL = `${BASE_URL}admin.php?page=dump`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, DUMP_URL))
}

const TABLES = [
  { value: 'uni_banned', label: 'uni_banned' },
  { value: 'uni_planets', label: 'uni_planets' },
  { value: 'uni_users', label: 'uni_users' },
]

void test('the tables the selector offers are read from the selector itself', async () => {
  const server = fakeServer(pageReply(pageHtml(DUMP_BODY)))
  const observed = await adminDump(sessionOn(server))
  assert.equal(observed.data.kind, 'adminDump')

  assert.equal('planetId' in observed.data, false)
  assert.deepEqual(observed.data.tables, TABLES)
  assert.ok(observed.data.observedAtMs > 0)
  assert.equal(server.requests[0]!.url.href, DUMP_URL)
})

void test('the dump page reports every table its selector offers', () => {
  assert.deepEqual(readAdminDump(pageOf(DUMP_BODY)), {
    kind: 'adminDump',
    observedAtMs: 1,
    tables: TABLES,
  })
})

void test('a page whose selector offers nothing states no table', () => {
  const page = readAdminDump(pageOf('<main role="main"><select name="dbtables[]"></select></main>'))
  assert.equal('planetId' in page, false)
  assert.deepEqual(page.tables, [])
})

void test('a backup submits the tables it writes, under the form’s own field', async () => {
  await expectOperation(
    (session) => adminDumpBackup(session, { tables: ['uni_users', 'uni_planets'] }),
    {
      method: 'POST',
      url: DUMP_URL,
      body: [
        ['action', 'dump'],
        ['dbtables[]', 'uni_users'],
        ['dbtables[]', 'uni_planets'],
      ],
    },
  )
})

void test('a backup that wrote a file is reported as the message naming it', async () => {
  const written = await answer(
    (session) => adminDumpBackup(session, { tables: ['uni_users'] }),
    pageReply(
      pageHtml(adminMessageBody('Backup written to includes/backups/Backup_01_01_2026.sql')),
    ),
  )
  assert.deepEqual(written.data, {
    kind: 'message',
    message: 'Backup written to includes/backups/Backup_01_01_2026.sql',
  })
})

void test('a backup asked for no table is refused with the sentence the page printed', async () => {
  await expectOperation((session) => adminDumpBackup(session, { tables: [] }), {
    method: 'POST',
    url: DUMP_URL,
    body: [['action', 'dump']],
  })
  const refused = await answer(
    (session) => adminDumpBackup(session, { tables: [] }),
    pageReply(pageHtml(adminMessageBody('No tables selected'))),
  )
  assert.deepEqual(refused.data, { kind: 'message', message: 'No tables selected' })
})

void test('a read the server refused is reported as the message it printed', async () => {
  const refused = await decode(
    adminDump,
    pageReply(pageHtml(adminMessageBody('Permission error!'))),
  )
  assert.deepEqual(refused.data, { kind: 'message', message: 'Permission error!' })

  const empty = await decode(adminDump, { body: '' })
  assert.deepEqual(empty.data, { kind: 'empty' })
})
