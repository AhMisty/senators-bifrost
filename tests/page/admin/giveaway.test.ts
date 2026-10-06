import assert from 'node:assert/strict'
import { test } from 'node:test'

import { adminGiveaway, adminGiveawayAward } from '../../../src/index.ts'
import {
  GIVEAWAY_BODY,
  GIVEAWAY_UNTICKED_BODY,
  adminMessage,
} from '../../fixtures/admin/listPages.ts'
import { BASE_URL, answer, expectOperation, pageHtml, pageReply, read } from '../../helpers.ts'

const GIVEAWAY_URL = `${BASE_URL}admin.php?page=giveaway`

void test('the form is read as the elements it can allocate and the filters it is rendered with', async () => {
  const observed = await read(adminGiveaway, pageReply(pageHtml(GIVEAWAY_BODY)))
  const { observedAtMs, ...giveaway } = observed
  assert.ok(observedAtMs > 0, 'the document carries the time it was read')
  assert.deepEqual(giveaway, {
    kind: 'adminGiveaway',
    elementIds: [901, 902, 903, 1, 2, 106, 202, 203, 401, 601],
    filters: { planets: true, moons: true, homePlanetOnly: true, activeOnly: true },
  })
})

void test('a filter the form does not have ticked is reported as one the call will not reach', async () => {
  const giveaway = await read(adminGiveaway, pageReply(pageHtml(GIVEAWAY_UNTICKED_BODY)))
  assert.deepEqual(giveaway.filters, {
    planets: false,
    moons: false,
    homePlanetOnly: true,
    activeOnly: true,
  })

  assert.equal(giveaway.elementIds.length, 10)
})

void test('an award is the form’s own filters and the elements the caller named', async () => {
  await expectOperation(
    (session) =>
      adminGiveawayAward(session, {
        elements: new Map([
          [901, 5000],
          [202, 10],
        ]),
        filters: { planets: true, moons: true, homePlanetOnly: true, activeOnly: true },
      }),
    {
      method: 'POST',
      url: GIVEAWAY_URL,
      body: [
        ['action', 'send'],
        ['planet', '1'],
        ['moon', '1'],
        ['mainplanet', '1'],
        ['no_inactive', '1'],
        ['element_901', '5000'],
        ['element_202', '10'],
      ],
    },
  )
})

void test('a filter the caller left out is not written at all, which is how a form clears one', async () => {
  await expectOperation(
    (session) =>
      adminGiveawayAward(session, {
        elements: new Map([[903, 0]]),
        filters: { homePlanetOnly: true },
      }),
    {
      method: 'POST',
      url: GIVEAWAY_URL,
      body: [
        ['action', 'send'],
        ['mainplanet', '1'],
        ['element_903', '0'],
      ],
    },
  )
})

void test('an explicit empty filter is sent for the server to reject', async () => {
  await expectOperation(
    (session) => adminGiveawayAward(session, { elements: new Map([[901, 100]]), filters: {} }),
    {
      method: 'POST',
      url: GIVEAWAY_URL,
      body: [
        ['action', 'send'],
        ['element_901', '100'],
      ],
    },
  )
})

void test('an award the page refused is reported as the message it printed', async () => {
  const refused = await answer(
    (session) => adminGiveawayAward(session, { elements: new Map([[901, 1]]), filters: {} }),
    pageReply(pageHtml(adminMessage('Select a planet type'))),
  )
  assert.deepEqual(refused.data, { kind: 'message', message: 'Select a planet type' })
})

void test('the form itself is a document, and a refusal to render it is the page’s answer', async () => {
  const refusal = await answer(
    adminGiveaway,
    pageReply(pageHtml(adminMessage('Permission error!'))),
  )
  assert.deepEqual(refusal.data, { kind: 'message', message: 'Permission error!' })
})
