import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ErrorCode,
  adminSupport,
  adminSupportSend,
  adminSupportView,
  parsePage,
  readAdminSupport,
  readAdminTicket,
} from '../../../src/index.ts'
import { adminTicketList, adminTicketView, adminNoticeCard } from '../../fixtures/admin/index.ts'
import {
  BASE_URL,
  expectOperation,
  fakeServer,
  httpResponse,
  pageHtml,
  pageReply,
  read,
  sessionOn,
} from '../../helpers.ts'

const SUPPORT_URL = `${BASE_URL}admin.php?page=support`

const TICKETS = [
  {
    id: 1,
    ownerName: 'AhMisty',
    subject: 'Stuck',
    replies: '2',
    openedAtText: '01.01',
    status: 'open',
  },
  {
    id: 2,
    ownerName: 'Other',
    subject: 'Answered already',
    replies: '0',
    openedAtText: '02.01',
    status: 'answered',
  },
  {
    id: 3,
    ownerName: 'Third',
    subject: 'Done',
    replies: '1',
    openedAtText: '03.01',
    status: 'closed',
  },
] as const

void test('a list row states its id, owner, subject, reply count and time', async () => {
  const page = await read(adminSupport, pageReply(pageHtml(adminTicketList(TICKETS))))
  const { observedAtMs, ...rest } = page
  assert.ok(observedAtMs > 0)
  assert.deepEqual(rest, {
    kind: 'adminSupport',
    tickets: [
      {
        id: 1,
        ownerName: 'AhMisty',
        subject: 'Stuck',
        replies: 2,
        openedAtText: '01.01',
        status: 'open',
      },
      {
        id: 2,
        ownerName: 'Other',
        subject: 'Answered already',
        replies: 0,
        openedAtText: '02.01',
        status: 'answered',
      },
      {
        id: 3,
        ownerName: 'Third',
        subject: 'Done',
        replies: 1,
        openedAtText: '03.01',
        status: 'closed',
      },
    ],
  })
  await expectOperation(adminSupport, { url: SUPPORT_URL })
})

void test('the two bodies are what tells a closed ticket from an open one', async () => {
  const page = await read(adminSupport, pageReply(pageHtml(adminTicketList(TICKETS))))
  const closed = page.tickets.filter((ticket) => ticket.status === 'closed')
  assert.deepEqual(
    closed.map((ticket) => ticket.id),
    [3],
  )
  assert.equal(page.tickets[0]!.status, 'open')
  assert.equal(page.tickets[1]!.status, 'answered')
})

void test('a row that states no ticket is not a ticket', async () => {
  const body = adminTicketList(TICKETS).replace('</tbody>', '<tr></tr></tbody>')
  const page = await read(adminSupport, pageReply(pageHtml(body)))
  assert.equal(page.tickets.length, 3)
})

void test('a desk with no ticket reports none', async () => {
  const page = await read(adminSupport, pageReply(pageHtml(adminTicketList([]))))
  assert.deepEqual(page.tickets, [])
})

void test('the list decoder is the published one the page function is built on', () => {
  const page = parsePage(httpResponse({ body: pageHtml(adminTicketList(TICKETS)) }, SUPPORT_URL))
  assert.equal(readAdminSupport(page).tickets.length, 3)
  assert.equal('planetId' in readAdminSupport(page), false)
})

void test('one ticket is read from the address that names it', async () => {
  await expectOperation((session) => adminSupportView(session, { ticketId: 7 }), {
    url: `${BASE_URL}admin.php?id=7&page=support&mode=view`,
  })
})

void test('the viewer states the ticket, the label of its status control and each reply', async () => {
  const body = adminTicketView({
    ticketId: 4,
    statusLabel: 'ti_close',
    replies: [
      {
        subject: 'Stuck',
        category: 'General',
        message: 'It will not build.',
        byline: 'AhMisty: 01.01',
      },
      { subject: 'Re: Stuck', category: 'General', message: 'Try again.', byline: 'Admin: 02.01' },
    ],
  })
  const page = await read(
    (session) => adminSupportView(session, { ticketId: 4 }),
    pageReply(pageHtml(body)),
  )
  const { observedAtMs, ...rest } = page
  assert.ok(observedAtMs > 0)
  assert.deepEqual(rest, {
    kind: 'adminTicket',
    id: 4,
    statusLabel: 'ti_close',
    replies: [
      { subject: 'Stuck General', message: 'It will not build.', byline: 'AhMisty: 01.01' },
      { subject: 'Re: Stuck General', message: 'Try again.', byline: 'Admin: 02.01' },
    ],
  })
})

void test('a reply is read between its heading and its byline', async () => {
  const body = adminTicketView({
    ticketId: 4,
    statusLabel: 'ti_open',
    replies: [{ subject: 'Only', category: 'Cat', message: 'the body', byline: 'A: t' }],
  })
  const page = await read(
    (session) => adminSupportView(session, { ticketId: 4 }),
    pageReply(pageHtml(body)),
  )
  assert.equal(page.replies.length, 1)
  assert.equal(page.replies[0]!.message, 'the body')
  assert.equal(page.replies[0]!.byline, 'A: t')
  assert.equal(page.statusLabel, 'ti_open')
})

void test('a ticket that holds no reply reports none', async () => {
  const body = adminTicketView({ ticketId: 4, statusLabel: 'ti_close', replies: [] })
  const page = await read(
    (session) => adminSupportView(session, { ticketId: 4 }),
    pageReply(pageHtml(body)),
  )
  assert.deepEqual(page.replies, [])
})

void test('ticket replies retain line breaks nested in BBCode formatting', async () => {
  const body = adminTicketView({
    ticketId: 4,
    statusLabel: 'ti_open',
    replies: [
      {
        subject: 'Help',
        category: 'General',
        message:
          '<span style="color:red">First line<br />Second line</span><div>Next paragraph</div>',
        byline: 'Player: today',
      },
    ],
  })
  const page = await read(
    (session) => adminSupportView(session, { ticketId: 4 }),
    pageReply(pageHtml(body)),
  )
  assert.equal(page.replies[0]!.message, 'First line\nSecond line\nNext paragraph')
  assert.equal(page.replies[0]!.byline, 'Player: today')
})

void test('a viewer that states no ticket is a decoding failure', async () => {
  const body = adminTicketView({ statusLabel: 'ti_close', replies: [] })
  await assert.rejects(
    () => read((session) => adminSupportView(session, { ticketId: 4 }), pageReply(pageHtml(body))),
    { code: ErrorCode.ParseError, message: 'Missing id form field' },
  )
})

void test('the viewer decoder is the published one the page function is built on', () => {
  const body = adminTicketView({
    ticketId: 9,
    statusLabel: 'ti_open',
    replies: [{ subject: 'S', category: 'C', message: 'm', byline: 'b' }],
  })
  const page = parsePage(httpResponse({ body: pageHtml(body) }, `${SUPPORT_URL}&mode=view&id=9`))
  const decoded = readAdminTicket(page)
  assert.equal(decoded.id, 9)
  assert.equal(decoded.replies[0]!.message, 'm')
  assert.equal('planetId' in decoded, false)
})

void test('an answer is recorded under the ticket, with the reply and the flip it carries', async () => {
  await expectOperation(
    (session) =>
      adminSupportSend(session, { ticketId: 4, text: 'Please try again.', changeStatus: true }),
    {
      method: 'POST',
      url: `${BASE_URL}admin.php?page=support&mode=send`,
      body: [
        ['id', '4'],
        ['message', 'Please try again.'],
        ['change_status', '1'],
      ],
    },
  )
})

void test('a flip with no reply is sent as the flip alone', async () => {
  await expectOperation(
    (session) => adminSupportSend(session, { ticketId: 4, changeStatus: true }),
    {
      method: 'POST',
      url: `${BASE_URL}admin.php?page=support&mode=send`,
      body: [
        ['id', '4'],
        ['change_status', '1'],
      ],
    },
  )
})

void test('a reply with no flip leaves the status where it stands', async () => {
  await expectOperation((session) => adminSupportSend(session, { ticketId: 4, text: 'Thanks.' }), {
    method: 'POST',
    url: `${BASE_URL}admin.php?page=support&mode=send`,
    body: [
      ['id', '4'],
      ['message', 'Thanks.'],
    ],
  })
})

void test('a submission that carries neither is sent back rather than refused here', async () => {
  await expectOperation((session) => adminSupportSend(session, { ticketId: 4 }), {
    method: 'POST',
    url: `${BASE_URL}admin.php?page=support&mode=send`,
    body: [['id', '4']],
  })
})

void test('the sentence a recorded answer answers with is reported as it stands', async () => {
  const server = fakeServer(pageReply(pageHtml(adminNoticeCard('The answer was recorded.'))))
  const observed = await adminSupportSend(sessionOn(server), { ticketId: 4, text: 'x' })
  assert.deepEqual(observed.data, { kind: 'message', message: 'The answer was recorded.' })
})

void test('a player session raises the administrative-access failure', async () => {
  const server = fakeServer({ status: 302, headers: { Location: './game.php' } })
  await assert.rejects(adminSupport(sessionOn(server)), {
    code: 'server',
    serverCode: 'admin-authentication',
  })
})
