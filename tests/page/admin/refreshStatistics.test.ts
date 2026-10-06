import assert from 'node:assert/strict'
import { test } from 'node:test'

import { adminRefreshStatistics } from '../../../src/index.ts'
import { adminNoticeCard } from '../../fixtures/admin/index.ts'
import { BASE_URL, fakeServer, pageHtml, pageReply, sessionOn } from '../../helpers.ts'

const STAT_UPDATE_URL = `${BASE_URL}admin.php?page=statUpdate`

const REPORT = 'Dauer: 0.42 s; Speicher: 12 MB / 14 MB / 16 MB; Anfragen: 321'

void test('a read rebuilds the statistics and answers with the report as a message', async () => {
  const server = fakeServer(pageReply(pageHtml(adminNoticeCard(REPORT))))
  const answer = await adminRefreshStatistics(sessionOn(server))
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, STAT_UPDATE_URL)
  assert.deepEqual(answer.data, { kind: 'message', message: REPORT })
})

void test('a player session raises the administrative-access failure', async () => {
  const server = fakeServer({ status: 302, headers: { Location: './game.php' } })
  await assert.rejects(adminRefreshStatistics(sessionOn(server)), {
    code: 'server',
    serverCode: 'admin-authentication',
  })
})

void test('a page the script renders instead is reported as a plain page, not decoded', async () => {
  const body = pageReply(
    pageHtml('<main role="main"><div class="card mb-3">maintenance</div></main>'),
  )
  const answer = await adminRefreshStatistics(sessionOn(fakeServer(body)))
  assert.deepEqual(answer.data, { kind: 'page' })
})
