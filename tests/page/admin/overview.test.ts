import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ErrorCode, adminOverview } from '../../../src/index.ts'
import { OVERVIEW_BODY, OVERVIEW_EIGHT_FIGURES_BODY } from '../../fixtures/admin/listPages.ts'
import {
  BASE_URL,
  expectOperation,
  fakeServer,
  pageHtml,
  pageReply,
  read,
  sessionOn,
} from '../../helpers.ts'

void test('the nine figures are read in the order the card renders them', async () => {
  const observed = await read(adminOverview, pageReply(pageHtml(OVERVIEW_BODY)))
  const { observedAtMs, ...overview } = observed
  assert.ok(observedAtMs > 0, 'the document carries the time it was read')
  assert.deepEqual(overview, {
    kind: 'adminOverview',
    statistics: {
      backups: 3,
      users: 1234,
      inactiveUsers: 12,
      onlineUsers: 7,
      planets: 5678,
      openTickets: 0,
      logEntries: 99999,
      activeCronjobs: 4,
      newsEntries: 12,
    },
  })
})

void test('a card with a figure missing is a decoding failure rather than a shifted reading', async () => {
  const overview = fakeServer(pageReply(pageHtml(OVERVIEW_EIGHT_FIGURES_BODY)))
  await assert.rejects(
    () => adminOverview(sessionOn(overview)),
    { code: ErrorCode.ParseError, message: 'Expected 9 overview figures, found 8' },
    'the reading is positional, so the count is part of what it asserts',
  )
})

void test('the page is the one address the reading asks for', async () => {
  await expectOperation((session) => adminOverview(session), {
    url: `${BASE_URL}admin.php?page=overview`,
  })
})
