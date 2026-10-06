import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import { ErrorCode, parsePage, publicScreens, readPublicScreens } from '../../../src/index.ts'
import { SCREENS_BODY } from '../../fixtures/public/index.ts'
import {
  BASE_URL,
  decode,
  expectOperation,
  httpResponse,
  pageHtml,
  pageReply,
  read,
} from '../../helpers.ts'

const SCREENS_URL = `${BASE_URL}index.php?page=screens&uni=42`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, SCREENS_URL))
}

function without(rendered: string, blank = ''): string {
  const markup = SCREENS_BODY.replace(rendered, blank)
  assert.notEqual(markup, SCREENS_BODY, rendered)
  return markup
}

void test('each tile states the image it opens and the one it shows', () => {
  assert.deepEqual(readPublicScreens(pageOf(SCREENS_BODY)), {
    kind: 'publicScreens',
    observedAtMs: 1,
    screenshots: [
      {
        image: new URL(`${BASE_URL}styles/resource/images/login/screens/1.jpg`),
        thumbnail: new URL(`${BASE_URL}styles/resource/images/login/screens/thumbnails/1.jpg`),
      },
      {
        image: new URL(`${BASE_URL}styles/resource/images/login/screens/2.jpg`),
        thumbnail: new URL(`${BASE_URL}styles/resource/images/login/screens/2.jpg`),
      },
    ],
  })
})

void test('an address the installation wrote absolutely is left where it points', () => {
  const markup = without(
    'href="./styles/resource/images/login/screens/1.jpg"',
    'href="https://files.example.com/screens/1.jpg"',
  )
  const first = readPublicScreens(pageOf(markup)).screenshots[0]!
  assert.equal(first.image.href, 'https://files.example.com/screens/1.jpg')
})

void test('a tile that links to no image is a decoding failure', () => {
  const markup = without('href="./styles/resource/images/login/screens/1.jpg" ')
  assert.throws(() => readPublicScreens(pageOf(markup)), {
    code: ErrorCode.ParseError,
    message: 'Missing response URL',
  })
})

void test('a tile that shows no image is a decoding failure', () => {
  const markup = without('src="./styles/resource/images/login/screens/thumbnails/1.jpg" ')
  assert.throws(() => readPublicScreens(pageOf(markup)), {
    code: ErrorCode.ParseError,
    message: 'Missing response URL',
  })
})

void test('an address the runtime cannot resolve is a decoding failure', () => {
  const markup = without('href="./styles/resource/images/login/screens/1.jpg"', 'href="http://["')
  assert.throws(() => readPublicScreens(pageOf(markup)), {
    code: ErrorCode.ParseError,
    message: 'Invalid response URL',
  })
})

void test('the page is asked for at its own route', async () => {
  await expectOperation((session) => publicScreens(session), { url: SCREENS_URL })
})

void test('the document the page answered with is the one the caller reads', async () => {
  const document = await read(
    (session) => publicScreens(session),
    pageReply(pageHtml(SCREENS_BODY)),
  )
  assert.equal(document.kind, 'publicScreens')
  assert.equal(document.screenshots.length, 2)
})

void test('an answer carrying no document is reported as the receipt it is', async () => {
  const observed = await decode((session) => publicScreens(session), { body: '' })
  assert.deepEqual(observed.data, { kind: 'empty' })
})
