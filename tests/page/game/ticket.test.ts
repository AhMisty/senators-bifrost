import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import {
  ErrorCode,
  parsePage,
  readTicket,
  readTicketCreate,
  readTickets,
  ticket,
  ticketCreate,
  ticketSend,
  ticketView,
} from '../../../src/index.ts'
import {
  ticketCreateForm,
  ticketCreateFormWithoutCategory,
  ticketOverviewPage,
  ticketViewClosed,
  ticketViewPage,
  ticketWithoutControls,
} from '../../fixtures/game/social.ts'
import {
  BASE_URL,
  decode,
  expectOperation,
  gamePage,
  httpResponse,
  pageHtml,
  pageReply,
} from '../../helpers.ts'

const LIST_URL = `${BASE_URL}game.php?page=ticket`
const VIEW_URL = `${BASE_URL}game.php?id=4&page=ticket&mode=view`

function pageOf(body: string, url = LIST_URL): Page {
  return parsePage(httpResponse({ body }, url))
}

void test('the ticket list is read from each row’s own link', async () => {
  const observed = await decode(
    (session) => ticket(session),
    pageReply(gamePage(ticketOverviewPage)),
  )
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'tickets',

    observedAtMs: observed.response.observedAtMs,
    tickets: [
      {
        id: 4,
        subject: 'Cannot build',
        createdAtText: '01.01.2026 12:00:00',
        statusText: 'Response',
      },
      {
        id: 9,
        subject: 'Wrong language',
        createdAtText: '02.01.2026 09:15:00',
        statusText: 'Open',
      },
    ],
  })
})

void test('ticket results omit navigation context in full pages and popups', () => {
  const readInGameWindow: [string, () => object][] = [
    ['the list', () => readTickets(pageOf(gamePage(ticketOverviewPage)))],
    ['the category selector', () => readTicketCreate(pageOf(gamePage(ticketCreateForm)))],
    ['one ticket', () => readTicket(pageOf(gamePage(ticketViewClosed), VIEW_URL))],
  ]
  for (const [name, readDocument] of readInGameWindow)
    assert.equal('planetId' in readDocument(), false, name)
  assert.equal('planetId' in readTickets(pageOf(pageHtml(ticketOverviewPage))), false)
  assert.equal('planetId' in readTicketCreate(pageOf(pageHtml(ticketCreateForm))), false)
  assert.equal('planetId' in readTicket(pageOf(pageHtml(ticketViewClosed), VIEW_URL)), false)
})

void test('ticket answers preserve line breaks inside formatted content', () => {
  const body = ticketViewPage.replace(
    'I cannot build the robotics factory.',
    '<b>First<br>Second</b><br><br>Third',
  )
  const document = readTicket(pageOf(pageHtml(body), VIEW_URL))
  assert.equal(document.answers[0]?.message, 'First\nSecond\n\nThird')
})

void test('an empty list is still a list', () => {
  const document = readTickets(
    pageOf(
      pageHtml(
        '<div class="gray_flettab">Support<a href="game.php?page=ticket&amp;mode=create">New ticket</a></div>',
      ),
    ),
  )
  assert.deepEqual(document.tickets, [])
})

void test('a response that is not a ticket document is refused', () => {
  const broken: [string, () => unknown, string][] = [
    [
      'the list',
      () => readTickets(pageOf(pageHtml(ticketWithoutControls))),
      'Expected one a[href*="mode=create"], found 0',
    ],
    [
      'the category selector',
      () => readTicketCreate(pageOf(pageHtml(ticketCreateFormWithoutCategory))),
      'Expected one [name="category"], found 0',
    ],
    [
      'one ticket',
      () => readTicket(pageOf(pageHtml(ticketWithoutControls), VIEW_URL)),
      'Missing ticket answers',
    ],
  ]
  for (const [name, run, message] of broken)
    assert.throws(run, { code: ErrorCode.ParseError, message }, name)
})

void test('the category selector is read as the options it offers', () => {
  const document = readTicketCreate(pageOf(pageHtml(ticketCreateForm)))
  assert.deepEqual(document.categories, [
    { value: '', label: '' },
    { value: 'Error', label: 'Error' },
    { value: 'Bug', label: 'Bug' },
    { value: 'Language error', label: 'Language error' },
  ])
})

void test('an open ticket is read with its answers and its reply control', async () => {
  const observed = await decode(
    (session) => ticketView(session, { ticketId: 4 }),
    pageReply(gamePage(ticketViewPage)),
  )
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'ticket',

    observedAtMs: observed.response.observedAtMs,

    id: 4,
    hasReplyControl: true,
    answers: [
      {
        author: 'AhMisty',
        header: 'AhMisty [01.01.2026 12:00:00]',

        isOwn: true,
        message: 'I cannot build the robotics factory.',
      },
      {
        author: 'Admin',
        header: 'Admin [02.01.2026 09:30:00]',
        isOwn: false,
        message: 'The requirements are met now.',
      },
    ],
  })
})

void test('a closed ticket renders no reply control', () => {
  const document = readTicket(pageOf(pageHtml(ticketViewClosed), VIEW_URL))
  assert.equal(document.hasReplyControl, false)
  assert.equal(document.answers.length, 1)
  assert.equal(document.answers[0]!.isOwn, true)
})

void test('the three readers ask three addresses', async () => {
  await expectOperation((session) => ticket(session), { url: LIST_URL })
  await expectOperation((session) => ticketCreate(session), {
    url: `${BASE_URL}game.php?page=ticket&mode=create`,
  })
  await expectOperation((session) => ticketView(session, { ticketId: 4 }), { url: VIEW_URL })
})

void test('answering a ticket posts the id the ticket was opened under', async () => {
  await expectOperation(
    (session) => ticketSend(session, { ticketId: 4, text: 'The requirements are met now.' }),
    {
      method: 'POST',

      url: `${BASE_URL}game.php?page=ticket&mode=send`,
      body: [
        ['id', '4'],
        ['message', 'The requirements are met now.'],
      ],
    },
  )
})

void test('a new ticket posts the category and the subject instead of an id', async () => {
  await expectOperation(
    (session) => ticketSend(session, { categoryId: 'Bug', subject: 'Cannot build', text: 'Help' }),
    {
      method: 'POST',
      url: `${BASE_URL}game.php?page=ticket&mode=send`,
      body: [
        ['category', 'Bug'],
        ['subject', 'Cannot build'],
        ['message', 'Help'],
      ],
    },
  )
})

void test('a ticket the server holds closed is answered with its own message page', async () => {
  const refused = await decode(
    (session) => ticketSend(session, { ticketId: 4, text: 'Any update?' }),
    pageReply(gamePage('<div class="ally_contents">This ticket is closed</div>')),
  )
  assert.deepEqual(refused.data, { kind: 'message', message: 'This ticket is closed' })
})
