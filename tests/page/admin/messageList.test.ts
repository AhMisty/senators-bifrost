import assert from 'node:assert/strict'
import { test } from 'node:test'

import { adminMessageList } from '../../../src/index.ts'
import { adminMessageList as messageListFixture } from '../../fixtures/admin/index.ts'
import {
  BASE_URL,
  expectOperation,
  fakeServer,
  pageHtml,
  pageReply,
  read,
  sessionOn,
} from '../../helpers.ts'

const MESSAGE_LIST_URL = `${BASE_URL}admin.php?page=messageList`

const CATEGORIES: (readonly [string, string])[] = [
  ['100', 'All kinds'],
  ['1', 'System'],
  ['2', 'Player'],
]

const ENTRY = {
  id: 5,
  kind: 'Player',
  time: '01.01.2024 10:00',
  sender: 'AhMisty',
  receiver: 'Other',
  subject: 'Hello',
  deleted: true,
  text: 'the body of the message',
}

void test('an unfiltered list states each row’s kind through the selector’s own words', async () => {
  const body = messageListFixture({
    selectedType: '100',
    categories: CATEGORIES,
    type: 100,
    side: 1,
    rows: [ENTRY, { ...ENTRY, id: 9, kind: 'System', subject: 'Boom', deleted: false, text: 'x' }],
  })
  const page = await read(adminMessageList, pageReply(pageHtml(body)))
  assert.equal(page.kind, 'adminMessageList')

  assert.equal('planetId' in page, false)
  assert.equal(page.category, 100)
  assert.equal(page.page, 1)
  assert.equal(page.pageCount, 1)
  assert.deepEqual(page.entries, [
    {
      id: 5,
      category: 2,
      sentAtText: '01.01.2024 10:00',
      sender: 'AhMisty',
      receiver: 'Other',
      subject: 'Hello',
      deleted: true,
      text: 'the body of the message',
      bodyHtml: 'the body of the message',
    },
    {
      id: 9,
      category: 1,
      sentAtText: '01.01.2024 10:00',
      sender: 'AhMisty',
      receiver: 'Other',
      subject: 'Boom',
      deleted: false,
      text: 'x',
      bodyHtml: 'x',
    },
  ])
  await expectOperation(adminMessageList, { url: MESSAGE_LIST_URL })
})

void test('a filtered list supplies the category for rows without a category column', async () => {
  const body = messageListFixture({
    selectedType: '2',
    categories: CATEGORIES,
    type: 2,
    side: 1,
    rows: [ENTRY],
  })
  const page = await read(adminMessageList, pageReply(pageHtml(body)))
  assert.equal(page.category, 2)
  assert.deepEqual(page.entries, [
    {
      id: 5,
      category: 2,
      sentAtText: '01.01.2024 10:00',
      sender: 'AhMisty',
      receiver: 'Other',
      subject: 'Hello',
      deleted: true,
      text: 'the body of the message',
      bodyHtml: 'the body of the message',
    },
  ])
})

void test('message bodies retain nested line breaks without altering their HTML', async () => {
  const text = '<span style="color:red">First<br />Second</span><div>Third</div>'
  const body = messageListFixture({
    selectedType: '2',
    categories: CATEGORIES,
    type: 2,
    side: 1,
    rows: [{ ...ENTRY, text }],
  })
  const page = await read(adminMessageList, pageReply(pageHtml(body)))
  assert.equal(page.entries[0]!.text, 'First\nSecond\nThird')
  assert.equal(page.entries[0]!.bodyHtml, text.replace('<br />', '<br>'))
})

void test('a kind word the selector does not offer leaves the row’s kind unstated', async () => {
  const body = messageListFixture({
    selectedType: '100',
    categories: CATEGORIES,
    type: 100,
    side: 1,
    rows: [{ ...ENTRY, kind: 'Alliance' }],
  })
  const page = await read(adminMessageList, pageReply(pageHtml(body)))
  assert.equal(page.entries[0]!.category, null)
})

void test('a kind word the selector offers twice states no single number', async () => {
  const body = messageListFixture({
    selectedType: '100',
    categories: [...CATEGORIES, ['3', 'Player']],
    type: 100,
    side: 1,
    rows: [ENTRY],
  })
  const page = await read(adminMessageList, pageReply(pageHtml(body)))
  assert.equal(page.entries[0]!.category, null)
})

void test('the list states the page it holds and how many the filter matches', async () => {
  const body = messageListFixture({
    selectedType: '100',
    categories: CATEGORIES,
    type: 100,
    side: 2,
    pageCount: 3,
    rows: [ENTRY],
  })
  const page = await read(adminMessageList, pageReply(pageHtml(body)))
  assert.equal(page.page, 2)
  assert.equal(page.pageCount, 3)
})

void test('a list with no pagination at all holds one page', async () => {
  const body = messageListFixture({
    selectedType: '100',
    categories: CATEGORIES,
    type: 100,
    side: 1,
    rows: [ENTRY],
  })
  const page = await read(adminMessageList, pageReply(pageHtml(body)))
  assert.equal(page.pageCount, 1)
})

void test('a list without category options cannot report a selected category', async () => {
  const body = messageListFixture({
    selectedType: '',
    categories: [],
    type: 100,
    side: 3,
    rows: [ENTRY],
  })
  await assert.rejects(() => read(adminMessageList, pageReply(pageHtml(body))), {
    code: 'parse',
    message: 'Expected a numeric value',
  })
})

void test('a list without its page field cannot report a page number', async () => {
  const body = messageListFixture({
    selectedType: '100',
    categories: CATEGORIES,
    type: 100,
    rows: [ENTRY],
  })
  await assert.rejects(() => read(adminMessageList, pageReply(pageHtml(body))), {
    code: 'parse',
    message: 'Expected a numeric value',
  })
})

void test('every filter the form carries is written into the address', async () => {
  await expectOperation(
    (session) =>
      adminMessageList(session, {
        filter: {
          page: 2,
          category: 1,
          sender: 'AhMisty',
          receiver: 'Other',
          from: { day: 1, month: 2, year: 2024 },
          to: { day: 3, month: 4, year: 2024 },
        },
      }),
    {
      url:
        `${BASE_URL}admin.php?side=2&type=1&sender=AhMisty&receiver=Other` +
        '&dateStart%5Bday%5D=1&dateStart%5Bmonth%5D=2&dateStart%5Byear%5D=2024' +
        '&dateEnd%5Bday%5D=3&dateEnd%5Bmonth%5D=4&dateEnd%5Byear%5D=2024&page=messageList',
    },
  )
})

void test('a filter that names nothing reads the newest messages of every kind', async () => {
  await expectOperation(adminMessageList, { url: MESSAGE_LIST_URL })
})

void test('a list the server refuses to render comes back as the receipt it answered with', async () => {
  const server = fakeServer({ body: 'Not permitted' })
  const observed = await adminMessageList(sessionOn(server))
  assert.deepEqual(observed.data, { kind: 'text', text: 'Not permitted' })
})
