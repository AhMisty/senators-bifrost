import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Session } from '../../../src/index.ts'
import {
  adminCronjob,
  adminCronjobDelete,
  adminCronjobDetail,
  adminCronjobEnable,
  adminCronjobLock,
  adminCronjobSave,
  adminCronjobUnlock,
} from '../../../src/index.ts'
import {
  CRONJOB_BODY,
  CRONJOB_DETAIL_BODY,
  CRONJOB_DETAIL_NEW_BODY,
  CRONJOB_DETAIL_REFUSED_BODY,
  CRONJOB_EMPTY_BODY,
  CRONJOB_ROW_WITHOUT_CREATE_BODY,
  CRONJOB_WITHOUT_CREATE_BODY,
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

const CRONJOB_URL = `${BASE_URL}admin.php?page=cronjob`

void test('each job is read with its schedule and the two states its own links name', async () => {
  const observed = await read(adminCronjob, pageReply(pageHtml(CRONJOB_BODY)))
  const { observedAtMs, ...cronjob } = observed
  assert.ok(observedAtMs > 0, 'the document carries the time it was read')
  assert.deepEqual(cronjob, {
    kind: 'adminCronjob',
    canCreate: true,
    jobs: [
      {
        id: 3,
        name: 'Weekly cleanup',
        minutes: '*/10',
        hours: '*',
        daysOfMonth: '*',
        months: '*',
        daysOfWeek: '*',
        className: 'CleanupCronjob',
        nextRunText: '01.02.2026 03:00:00',
        active: true,
        locked: true,
      },
      {
        id: 4,
        name: 'Nightly update',
        minutes: '30',
        hours: '*/2',
        daysOfMonth: '1',
        months: 'Jan Feb',
        daysOfWeek: 'Mon Tue',
        className: 'UpdateCronjob',
        nextRunText: '-',
        active: false,
        locked: false,
      },
    ],
  })
})

void test('a list with no job states none, and still offers to create one', async () => {
  const cronjob = await read(adminCronjob, pageReply(pageHtml(CRONJOB_EMPTY_BODY)))
  assert.deepEqual(cronjob.jobs, [])
  assert.equal(cronjob.canCreate, true)
  assert.equal('planetId' in cronjob, false)
})

void test('a list whose create control is absent reports that it offers none', async () => {
  const cronjob = await read(adminCronjob, pageReply(pageHtml(CRONJOB_WITHOUT_CREATE_BODY)))
  assert.equal(cronjob.canCreate, false)
})

void test('a row’s own editor link is not the create control', async () => {
  const cronjob = await read(adminCronjob, pageReply(pageHtml(CRONJOB_ROW_WITHOUT_CREATE_BODY)))
  assert.equal(cronjob.jobs.length, 1)
  assert.equal(cronjob.canCreate, false)
})

void test('the editor is read with the job it holds, its controls and the classes offered', async () => {
  const detail = await read(adminCronjobDetail, pageReply(pageHtml(CRONJOB_DETAIL_BODY)))
  assert.ok(detail.observedAtMs > 0, 'the document carries the time it was read')
  assert.deepEqual(
    {
      kind: detail.kind,
      id: detail.id,
      classes: detail.classes,
      errors: detail.errors,
    },
    {
      kind: 'adminCronjobDetail',
      id: 3,
      classes: [
        { value: 'CleanupCronjob', label: 'CleanupCronjob' },
        { value: 'UpdateCronjob', label: 'UpdateCronjob' },
      ],
      errors: [],
    },
  )

  assert.deepEqual(
    detail.fields.map((field) => [field.name, field.type, field.checked]),
    [
      ['action', 'hidden', false],
      ['id', 'hidden', false],
      ['name', 'text', false],
      ['min[]', 'select', false],
      ['min_all', 'checkbox', false],
      ['hours[]', 'select', false],
      ['hours_all', 'checkbox', false],
      ['dom[]', 'select', false],
      ['dom_all', 'checkbox', false],
      ['month[]', 'select', false],
      ['month_all', 'checkbox', true],
      ['dow[]', 'select', false],
      ['dow_all', 'checkbox', false],
      ['class', 'select', false],
    ],
  )
  assert.deepEqual(
    detail.fields.map((field) => [field.name, field.value]),
    [
      ['action', 'edit'],
      ['id', '3'],
      ['name', 'Weekly cleanup'],
      ['min[]', ['10']],
      ['min_all', '1'],
      ['hours[]', ['3']],
      ['hours_all', '1'],
      ['dom[]', ['1']],
      ['dom_all', '1'],

      ['month[]', []],
      ['month_all', '1'],
      ['dow[]', ['0']],
      ['dow_all', '1'],
      ['class', 'CleanupCronjob'],
    ],
  )
})

void test('an editor for a new job reports the sentinel id as no job', async () => {
  const detail = await read(adminCronjobDetail, pageReply(pageHtml(CRONJOB_DETAIL_NEW_BODY)))
  assert.equal(detail.id, null)
  assert.deepEqual(
    detail.fields.filter((field) => field.name === 'min_all').map((field) => field.checked),
    [true],
  )
  assert.deepEqual(
    detail.fields.filter((field) => field.name === 'class').map((field) => field.value),

    ['CleanupCronjob'],
  )
})

void test('the refusals the server rendered stand above the editor it rendered them with', async () => {
  const detail = await read(adminCronjobDetail, pageReply(pageHtml(CRONJOB_DETAIL_REFUSED_BODY)))
  assert.deepEqual(detail.errors, ['A name is required', 'No minutes were chosen'])
  assert.equal(detail.id, 3)
})

void test('the editor read is the job the address names, or a new one where it names none', async () => {
  const asked: [Parameters<typeof adminCronjobDetail>[1], string][] = [
    [undefined, `${BASE_URL}admin.php?action=detail&page=cronjob`],
    [{ cronjobId: 3 }, `${BASE_URL}admin.php?action=detail&id=3&page=cronjob`],
  ]
  for (const [options, url] of asked)
    await expectOperation((session) => adminCronjobDetail(session, options), { url })
})

void test('a stored job is the six schedule fields the editor submits, in the columns the server reads', async () => {
  await expectOperation(
    (session) =>
      adminCronjobSave(session, {
        cronjobId: 3,
        schedule: {
          name: 'Weekly cleanup',
          className: 'CleanupCronjob',
          minutes: [10, 30],
          hours: '*',
          daysOfMonth: [1],
          months: '*',
          daysOfWeek: [0, 6],
        },
      }),
    {
      method: 'POST',
      url: CRONJOB_URL,
      body: [
        ['action', 'edit'],
        ['id', '3'],
        ['name', 'Weekly cleanup'],
        ['class', 'CleanupCronjob'],
        ['min[]', '10'],
        ['min[]', '30'],
        ['hours_all', '1'],
        ['dom[]', '1'],
        ['month_all', '1'],
        ['dow[]', '0'],
        ['dow[]', '6'],
      ],
    },
  )
})

void test('a new job is stored against the id the editor sends where it names no job', async () => {
  await expectOperation(
    (session) =>
      adminCronjobSave(session, {
        schedule: {
          name: 'New job',
          className: 'UpdateCronjob',
          minutes: [0],
          hours: [0],
          daysOfMonth: [1],
          months: [1],
          daysOfWeek: [0],
        },
      }),
    {
      method: 'POST',
      url: CRONJOB_URL,
      body: [
        ['action', 'edit'],
        ['id', '0'],
        ['name', 'New job'],
        ['class', 'UpdateCronjob'],
        ['min[]', '0'],
        ['hours[]', '0'],
        ['dom[]', '1'],
        ['month[]', '1'],
        ['dow[]', '0'],
      ],
    },
  )
})

void test('a stored job is answered with the redirect back to the list, or with the refusals', async () => {
  const accepted = await decode(
    (session) =>
      adminCronjobSave(session, {
        cronjobId: 3,
        schedule: {
          name: 'Weekly cleanup',
          className: 'CleanupCronjob',
          minutes: [10],
          hours: '*',
          daysOfMonth: [1],
          months: '*',
          daysOfWeek: [0],
        },
      }),
    { status: 302, headers: { Location: 'admin.php?page=cronjob' } },
  )
  assert.deepEqual(accepted.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}admin.php?page=cronjob`),
  })
  const refused = await answer(
    (session) =>
      adminCronjobSave(session, {
        cronjobId: 3,
        schedule: {
          name: 'Weekly cleanup',
          className: 'CleanupCronjob',
          minutes: [10],
          hours: '*',
          daysOfMonth: [1],
          months: '*',
          daysOfWeek: [0],
        },
      }),
    pageReply(pageHtml(adminMessage('A name is required'))),
  )
  assert.deepEqual(refused.data, { kind: 'message', message: 'A name is required' })
})

void test('each change to a job is a read of this address carrying the action that names it', async () => {
  const changes: [(session: Session) => Promise<unknown>, string][] = [
    [
      (session) => adminCronjobDelete(session, { cronjobId: 3 }),
      `${BASE_URL}admin.php?action=delete&id=3&page=cronjob`,
    ],
    [
      (session) => adminCronjobLock(session, { cronjobId: 3 }),
      `${BASE_URL}admin.php?action=lock&id=3&page=cronjob`,
    ],
    [
      (session) => adminCronjobUnlock(session, { cronjobId: 3 }),
      `${BASE_URL}admin.php?action=unlock&id=3&page=cronjob`,
    ],
  ]
  for (const [run, url] of changes) await expectOperation(run, { url })
})

void test('switching a job on or off is the state to store beside the action', async () => {
  const asked: [Parameters<typeof adminCronjobEnable>[1], string][] = [
    [
      { cronjobId: 4, active: true },
      `${BASE_URL}admin.php?action=enable&id=4&enable=1&page=cronjob`,
    ],
    [
      { cronjobId: 3, active: false },
      `${BASE_URL}admin.php?action=enable&id=3&enable=0&page=cronjob`,
    ],
  ]
  for (const [options, url] of asked)
    await expectOperation((session) => adminCronjobEnable(session, options), { url })
})

void test('a change to a job answers with the redirect back to the list', async () => {
  const answered = await decode((session) => adminCronjobDelete(session, { cronjobId: 3 }), {
    status: 302,
    headers: { Location: 'admin.php?page=cronjob' },
  })
  assert.deepEqual(answered.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}admin.php?page=cronjob`),
  })
})

void test('a refusal is reported as the message the page printed, not as a document', async () => {
  const refusal = await answer(adminCronjob, pageReply(pageHtml(adminMessage('Permission error!'))))
  assert.deepEqual(refusal.data, { kind: 'message', message: 'Permission error!' })
})
