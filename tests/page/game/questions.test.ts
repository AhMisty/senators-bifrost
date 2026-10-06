import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import {
  ErrorCode,
  parsePage,
  questions,
  answer,
  readAnswer,
  readQuestions,
} from '../../../src/index.ts'
import { helpAnswerPage, helpIndexPage } from '../../fixtures/game/social.ts'
import {
  BASE_URL,
  decode,
  expectOperation,
  gamePage,
  httpResponse,
  pageHtml,
  pageReply,
} from '../../helpers.ts'

const OVERVIEW_URL = `${BASE_URL}game.php?page=questions`
const ANSWER_URL = `${BASE_URL}game.php?categoryID=1&questionID=2&page=questions&mode=single`

function pageOf(body: string, url = OVERVIEW_URL): Page {
  return parsePage(httpResponse({ body }, url))
}

void test('the overview is read from the links the language data renders', async () => {
  const observed = await decode((session) => questions(session), pageReply(gamePage(helpIndexPage)))
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'questions',

    observedAtMs: observed.response.observedAtMs,
    questions: [
      { categoryId: 1, questionId: 2, title: 'How do I build a mine?' },
      { categoryId: 1, questionId: 3, title: 'Why is my fleet gone?' },
    ],
  })
})

void test('an answer is read from the heading and the cell the question prints', async () => {
  const observed = await decode(
    (session) => answer(session, { categoryId: 1, questionId: 2 }),
    pageReply(gamePage(helpAnswerPage)),
  )
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'answer',

    observedAtMs: observed.response.observedAtMs,

    title: 'How do I build a mine?',
    body: 'Open the buildings page and click the mine.',
  })
})

void test('the overview is the server’s, so a response without a planet reports none', () => {
  assert.equal('planetId' in readQuestions(pageOf(pageHtml(helpIndexPage))), false)
})

void test('an answer is the server’s too, so a response without a planet reports none', () => {
  assert.equal('planetId' in readAnswer(pageOf(pageHtml(helpAnswerPage), ANSWER_URL)), false)
})

void test('a response that is not one of the two documents is refused', () => {
  for (const [name, run, message] of [
    [
      'the overview',
      () => readQuestions(pageOf(pageHtml('<div>Nothing here</div>'))),
      'Expected one td.left, found 0',
    ],
    [
      'an answer',
      () => readAnswer(pageOf(pageHtml('<div>Nothing here</div>'))),
      'Expected one td.left, found 0',
    ],
  ] satisfies [string, () => unknown, string][])
    assert.throws(run, { code: ErrorCode.ParseError, message }, name)
})

void test('an overwiew with no question offers none', () => {
  const empty = helpIndexPage.replace(/<ul>[\s\S]*?<\/ul>/, '<ul></ul>')
  assert.deepEqual(readQuestions(pageOf(pageHtml(empty))).questions, [])
})

void test('the two documents are two addresses', async () => {
  await expectOperation((session) => questions(session), { url: OVERVIEW_URL })
  await expectOperation((session) => answer(session, { categoryId: 1, questionId: 2 }), {
    url: ANSWER_URL,
  })
})

void test('a question the language data does not hold is redirected to the overview', async () => {
  const observed = await decode((session) => answer(session, { categoryId: 9, questionId: 9 }), {
    status: 302,
    headers: { Location: 'game.php?page=questions' },
  })
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}game.php?page=questions`),
  })
})
