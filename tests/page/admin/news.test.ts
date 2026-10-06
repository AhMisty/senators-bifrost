import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ErrorCode, adminNews, adminNewsDelete, adminNewsSave } from '../../../src/index.ts'
import { NEWS_BODY, NEWS_CREATE_BODY, NEWS_EDIT_BODY } from '../../fixtures/admin/listPages.ts'
import {
  BASE_URL,
  decode,
  expectOperation,
  fakeServer,
  pageHtml,
  pageReply,
  read,
  sessionOn,
} from '../../helpers.ts'

const NEWS_ENTRIES = [
  {
    id: 4,
    title: 'Server restart',
    publishedAtText: '01.02.2026 12:00:00',
    author: 'Yaro',
  },
  {
    id: 5,
    title: 'Double resources',
    publishedAtText: '01.02.2026 12:00:00',
    author: 'Yaro',
  },
]

void test('the list is read from the rows that name a news row by an address', async () => {
  const observed = await read(adminNews, pageReply(pageHtml(NEWS_BODY)))
  const { observedAtMs, ...news } = observed
  assert.ok(observedAtMs > 0, 'the document carries the time it was read')
  assert.deepEqual(news, {
    kind: 'adminNews',
    entries: NEWS_ENTRIES,
    draft: null,
  })
})

void test('an address that names a row renders the editor holding it', async () => {
  const news = await read(adminNews, pageReply(pageHtml(NEWS_EDIT_BODY)))
  assert.deepEqual(news.draft, {
    id: 4,
    title: 'Server restart',
    text: 'The server restarts tonight.',
  })

  assert.deepEqual(news.entries, NEWS_ENTRIES)
})

void test('the empty editor reports no id at all rather than an id of none', async () => {
  const news = await read(adminNews, pageReply(pageHtml(NEWS_CREATE_BODY)))
  assert.deepEqual(news.draft, { id: null, title: '', text: '' })
  assert.deepEqual(news.entries, NEWS_ENTRIES)
})

void test('the row a list link names is required to be readable', async () => {
  const nameless = NEWS_BODY.replace('action=edit&amp;id=4', 'action=edit')
  await assert.rejects(() => adminNews(sessionOn(fakeServer(pageReply(pageHtml(nameless))))), {
    code: ErrorCode.ParseError,
    message: 'Missing id on the link',
  })
})

void test('the list an address reads is the one it asked for', async () => {
  const asked: [Parameters<typeof adminNews>[1], string][] = [
    [undefined, `${BASE_URL}admin.php?page=news`],
    [{ action: 'create' }, `${BASE_URL}admin.php?action=create&page=news`],
    [{ action: 'edit', id: 4 }, `${BASE_URL}admin.php?action=edit&id=4&page=news`],
  ]
  for (const [options, url] of asked)
    await expectOperation((session) => adminNews(session, options), { url })
})

void test('publishing over a row sends its id and the key that names an overwrite', async () => {
  await expectOperation(
    (session) => adminNewsSave(session, { draft: { id: 4, title: 'Restart', text: 'Tonight.' } }),
    {
      method: 'POST',
      url: `${BASE_URL}admin.php?action=send&key=1&page=news`,
      body: [
        ['id', '4'],
        ['title', 'Restart'],
        ['text', 'Tonight.'],
      ],
    },
  )
})

void test('publishing a new row sends no id and the key that names an insertion', async () => {
  await expectOperation(
    (session) => adminNewsSave(session, { draft: { id: null, title: 'Downtime', text: 'Soon.' } }),
    {
      method: 'POST',
      url: `${BASE_URL}admin.php?action=send&key=2&page=news`,
      body: [
        ['title', 'Downtime'],
        ['text', 'Soon.'],
      ],
    },
  )
})

void test('removing a row is this address read with the row’s own id', async () => {
  await expectOperation((session) => adminNewsDelete(session, { newsId: 4 }), {
    url: `${BASE_URL}admin.php?action=delete&id=4&page=news`,
  })
})

void test('the list comes back after a delete, so the answer is a rendered page', async () => {
  const server = fakeServer(pageReply(pageHtml(NEWS_BODY)))
  const answered = await adminNewsDelete(sessionOn(server), { newsId: 4 })
  assert.equal(server.requests.length, 1)
  assert.deepEqual(answered.data, { kind: 'page' })
})

void test('a submission the server accepted is the redirect it answered with', async () => {
  const accepted = await decode(
    (session) => adminNewsSave(session, { draft: { id: null, title: 'Downtime', text: 'Soon.' } }),
    { status: 302, headers: { Location: 'admin.php?page=news' } },
  )
  assert.deepEqual(accepted.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}admin.php?page=news`),
  })
})
