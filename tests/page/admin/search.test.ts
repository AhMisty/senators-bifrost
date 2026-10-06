import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import {
  ErrorCode,
  adminSearch,
  adminSearchDelete,
  parsePage,
  readAdminSearch,
} from '../../../src/index.ts'
import {
  SEARCH_BLANK_TERM_BODY,
  SEARCH_EMPTY_RESULT_BODY,
  SEARCH_PLANET_RESULTS_BODY,
  SEARCH_RESULTS_BODY,
  SEARCH_RESULTS_WITHOUT_CONTROLS_BODY,
  SEARCH_RESULTS_WITHOUT_TOTAL_BODY,
  SEARCH_RESULTS_WITH_FOREIGN_DELETE_BODY,
  SEARCH_RESULTS_WITH_TRUNCATED_EDIT_BODY,
  SEARCH_RESULTS_WITH_UNREADABLE_DELETE_BODY,
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
  read,
  sessionOn,
} from '../../helpers.ts'

const SEARCH_URL = `${BASE_URL}admin.php?page=search`

const USERS_SEARCH_URL = `${BASE_URL}admin.php?delete=none&search=users&key_user=Nova&page=search`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, SEARCH_URL))
}

function accountRow(id: number, name: string) {
  return {
    values: [
      String(id),
      name,
      `${name.toLowerCase()}@example.com`,
      '01.01.2026 10:00:00',
      '01.01.2025 10:00:00',
      '10.0.0.1',
      'Administrator',
      'No',
      'No',
    ],
    edit: { id, type: 'player' },
    remove: { type: 'player', id },
  }
}

const ACCOUNT_ROWS = [accountRow(7, 'Nova'), accountRow(9, 'Vega')]

void test('a search reads its filter row and the rows the server matched', async () => {
  const server = fakeServer(pageReply(pageHtml(SEARCH_RESULTS_BODY)))
  const observed = await adminSearch(sessionOn(server), {
    request: { term: 'Nova', kind: 'users' },
  })
  assert.equal(observed.data.kind, 'adminSearch')
  const page = observed.data

  assert.equal('planetId' in page, false)

  assert.equal(page.term, 'Nova')
  assert.deepEqual(page.kinds, [
    { value: 'users', label: 'Users' },
    { value: 'planet', label: 'Planets' },
    { value: 'alliance', label: 'Alliances' },
  ])
  assert.deepEqual(page.fields, [
    { value: 'name', label: 'Name' },
    { value: 'id', label: 'ID' },
  ])

  assert.deepEqual(page.matches, [
    { value: 'normal', label: 'Anywhere' },
    { value: 'exacto', label: 'Exact' },
  ])
  assert.deepEqual(page.limits, [
    { value: '25', label: '25' },
    { value: '50', label: '50' },
  ])
  assert.deepEqual(page.orders, [
    { value: 'ASC', label: 'Ascending' },
    { value: 'DESC', label: 'Descending' },
  ])
  assert.deepEqual(page.sortFields, [
    { value: 'id', label: 'ID' },
    { value: 'username', label: 'Name' },
  ])

  assert.equal(page.total, 2)
  assert.deepEqual(page.results, ACCOUNT_ROWS)
  assert.ok(page.observedAtMs > 0)

  assert.equal(server.requests[0]!.url.href, USERS_SEARCH_URL)
})

void test('the search document is read with its term, its filters and its rows', () => {
  assert.deepEqual(readAdminSearch(pageOf(SEARCH_RESULTS_BODY)), {
    kind: 'adminSearch',
    observedAtMs: 1,
    term: 'Nova',
    kinds: [
      { value: 'users', label: 'Users' },
      { value: 'planet', label: 'Planets' },
      { value: 'alliance', label: 'Alliances' },
    ],
    fields: [
      { value: 'name', label: 'Name' },
      { value: 'id', label: 'ID' },
    ],
    matches: [
      { value: 'normal', label: 'Anywhere' },
      { value: 'exacto', label: 'Exact' },
    ],
    limits: [
      { value: '25', label: '25' },
      { value: '50', label: '50' },
    ],
    orders: [
      { value: 'ASC', label: 'Ascending' },
      { value: 'DESC', label: 'Descending' },
    ],
    sortFields: [
      { value: 'id', label: 'ID' },
      { value: 'username', label: 'Name' },
    ],
    total: 2,
    results: ACCOUNT_ROWS,
  })
})

void test('a world row names the planet editor and the planet parameter', async () => {
  const page = await read(
    (session) => adminSearch(session, { request: { term: 'Homeworld', kind: 'planet' } }),
    pageReply(pageHtml(SEARCH_PLANET_RESULTS_BODY)),
  )
  assert.equal('planetId' in page, false)
  assert.equal(page.total, 1)
  assert.deepEqual(page.results, [
    {
      values: ['1234', 'Homeworld', 'Nova (ID: 7)', '5 minutes', '1', '2', '3', 'Yes'],
      edit: { id: 1234, type: 'planet' },
      remove: { type: 'planet', id: 1234 },
    },
  ])
})

void test('a row that offers neither control is read down to its last cell', async () => {
  const page = readAdminSearch(pageOf(SEARCH_RESULTS_WITHOUT_CONTROLS_BODY))
  assert.deepEqual(page.results, [{ values: ['7', 'Nova'], edit: null, remove: null }])
})

void test('a row whose edit call cannot be read offers no editor, and still states its columns', () => {
  const page = readAdminSearch(pageOf(SEARCH_RESULTS_WITH_TRUNCATED_EDIT_BODY))
  assert.deepEqual(page.results, [{ ...accountRow(7, 'Nova'), edit: null }])
})

void test('a delete address naming a record the page has no parameter for deletes nothing', () => {
  const page = readAdminSearch(pageOf(SEARCH_RESULTS_WITH_FOREIGN_DELETE_BODY))
  assert.deepEqual(page.results, [{ ...accountRow(7, 'Nova'), remove: null }])
})

void test('a delete address naming no id at all is a decoding failure', () => {
  assert.throws(() => readAdminSearch(pageOf(SEARCH_RESULTS_WITH_UNREADABLE_DELETE_BODY)), {
    code: ErrorCode.ParseError,
    message: 'Expected a numeric value',
  })
})

void test('a search that matched nothing states no total and lists no row', () => {
  const page = readAdminSearch(pageOf(SEARCH_EMPTY_RESULT_BODY))
  assert.equal('planetId' in page, false)
  assert.equal(page.total, null)
  assert.deepEqual(page.results, [])

  assert.equal(page.term, 'Nobody')
})

void test('a filter field rendered with a blank value states no term', () => {
  const page = readAdminSearch(pageOf(SEARCH_BLANK_TERM_BODY))
  assert.equal(page.term, '')
  assert.equal(page.total, null)
})

void test('a list whose closing row states no count cannot be read', () => {
  assert.throws(() => readAdminSearch(pageOf(SEARCH_RESULTS_WITHOUT_TOTAL_BODY)), {
    code: ErrorCode.ParseError,
    message: 'Expected a numeric value',
  })
})

void test('a search writes every filter the caller named, under the names the page reads', async () => {
  await expectOperation(
    (session) =>
      adminSearch(session, {
        request: {
          term: 'Nova',
          kind: 'users',
          field: 'name',
          match: 'exacto',
          page: 2,
          limit: 50,
          order: 'DESC',
          sortBy: 'id',
        },
      }),
    {
      url:
        `${BASE_URL}admin.php?delete=none&search=users&key_user=Nova&search_in=name&fuki=exacto` +
        `&side=2&limit=50&key_acc=DESC&key_order=id&page=search`,
    },
  )
  await expectOperation(
    (session) => adminSearch(session, { request: { term: '', kind: 'planet' } }),
    {
      url: `${BASE_URL}admin.php?delete=none&search=planet&key_user=&page=search`,
    },
  )
})

void test('a deletion is the search it was made from, with the record’s own two parameters', async () => {
  await expectOperation(
    (session) =>
      adminSearchDelete(session, {
        request: { term: 'Nova', kind: 'users', field: 'name' },
        target: { type: 'player', id: 7 },
      }),
    {
      url:
        `${BASE_URL}admin.php?delete=user&search=users&key_user=Nova&search_in=name&user=7` +
        `&page=search`,
    },
  )
  await expectOperation(
    (session) =>
      adminSearchDelete(session, {
        request: { term: 'Homeworld', kind: 'planet' },
        target: { type: 'planet', id: 1234 },
      }),
    {
      url: `${BASE_URL}admin.php?delete=planet&search=planet&key_user=Homeworld&planet=1234&page=search`,
    },
  )
})

void test('a deletion is reported as the answer the server gave, not as the document it renders', async () => {
  const answered = await answer(
    (session) =>
      adminSearchDelete(session, {
        request: { term: 'Nova', kind: 'users' },
        target: { type: 'player', id: 7 },
      }),
    pageReply(pageHtml(SEARCH_RESULTS_BODY)),
  )
  assert.deepEqual(answered.data, { kind: 'page' })
  const refused = await answer(
    (session) =>
      adminSearchDelete(session, {
        request: { term: 'Nova', kind: 'users' },
        target: { type: 'player', id: 7 },
      }),
    pageReply(pageHtml(adminMessageBody('The account was not deleted'))),
  )
  assert.deepEqual(refused.data, { kind: 'message', message: 'The account was not deleted' })
})

void test('a search the server refused is reported as the message it printed', async () => {
  const refused = await decode(
    (session) => adminSearch(session, { request: { term: 'Nova', kind: 'users' } }),
    pageReply(pageHtml(adminMessageBody('Permission error!'))),
  )
  assert.deepEqual(refused.data, { kind: 'message', message: 'Permission error!' })
})
