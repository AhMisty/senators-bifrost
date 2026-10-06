import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import { ErrorCode, parsePage, publicNews, readPublicNews } from '../../../src/index.ts'
import { NEWS_BODY } from '../../fixtures/public/index.ts'
import {
  BASE_URL,
  decode,
  expectOperation,
  httpResponse,
  pageHtml,
  pageReply,
  read,
} from '../../helpers.ts'

const NEWS_URL = `${BASE_URL}index.php?page=news&uni=42`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, NEWS_URL))
}

function without(rendered: string, blank: string): string {
  const markup = NEWS_BODY.replace(rendered, blank)
  assert.notEqual(markup, NEWS_BODY, rendered)
  return markup
}

function withoutRows(): string {
  const container = NEWS_BODY.indexOf('<div class="row">')
  assert.notEqual(container, -1)
  return `${NEWS_BODY.slice(0, container)}<div class="row"></div>\n</main>`
}

void test('each row is read from its own card, with the id that names it', () => {
  assert.deepEqual(readPublicNews(pageOf(NEWS_BODY)), {
    kind: 'publicNews',
    observedAtMs: 1,
    news: [
      {
        id: 1,
        title: 'Server move',
        text: 'The server moved\nto a new host.',
        from: '17.03.2024 12:00 - AdminBob',
      },
      {
        id: 2,
        title: 'Downtime',
        text: '',
        from: '18.03.2024 09:00 - AdminAnn',
      },
    ],
  })
})

void test('a news list without rows is a document with no entries', () => {
  assert.deepEqual(readPublicNews(pageOf(withoutRows())).news, [])
})

void test('news body line breaks remain distinct inside inline formatting', () => {
  const body = NEWS_BODY.replace('The server moved<br>', '<span>First<br>Second</span><br>')
  assert.equal(readPublicNews(pageOf(body)).news[0]!.text, 'First\nSecond\nto a new host.')
})

void test('a row that states no title or no attribution is a decoding failure', () => {
  const broken: [string, string, string, string][] = [
    ['no title', '<h5 class="card-title">Downtime</h5>', '', 'Missing news title markup'],
    [
      'no attribution',
      '<small class="text-muted">18.03.2024 09:00 - AdminAnn</small>',
      '',
      'Missing news attribution',
    ],
    [
      'an attribution of another class',
      '<small class="text-muted">17.03.2024 12:00 - AdminBob</small>',
      '<small class="other">17.03.2024 12:00 - AdminBob</small>',
      'Missing news attribution',
    ],
  ]
  for (const [name, rendered, blank, message] of broken)
    assert.throws(
      () => readPublicNews(pageOf(without(rendered, blank))),
      { code: ErrorCode.ParseError, message },
      name,
    )
})

void test('the news list preserves an empty title accepted by the news editor', () => {
  const page = readPublicNews(
    pageOf(without('<h5 class="card-title">Server move</h5>', '<h5 class="card-title"></h5>')),
  )
  assert.equal(page.news[0]!.title, '')
  assert.equal(page.news.length, 2)
})

void test('a row whose id is not the number it is addressed by is a decoding failure', () => {
  const markup = without('<div id="2" class="col-md-4">', '<div id="two" class="col-md-4">')
  assert.throws(() => readPublicNews(pageOf(markup)), {
    code: ErrorCode.ParseError,
    message: 'Expected a numeric value',
  })
})

void test('the list is asked for at its own route', async () => {
  await expectOperation((session) => publicNews(session), { url: NEWS_URL })
})

void test('the document the page answered with is the one the caller reads', async () => {
  const document = await read((session) => publicNews(session), pageReply(pageHtml(NEWS_BODY)))
  assert.equal(document.kind, 'publicNews')
  assert.equal(document.news.length, 2)
})

void test('an answer carrying no document is reported as the receipt it is', async () => {
  const observed = await decode((session) => publicNews(session), { body: '' })
  assert.deepEqual(observed.data, { kind: 'empty' })
})
