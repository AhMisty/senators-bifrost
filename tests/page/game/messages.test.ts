import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import {
  ErrorCode,
  messages,
  messagesAction,
  messagesArchiveOne,
  messagesDeleteOne,
  messagesSend,
  messagesView,
  messagesWrite,
  parsePage,
  readMessages,
  readMessagesCompose,
  readMessagesList,
} from '../../../src/index.ts'
import {
  messageCategoryTabs,
  messageCategoryTabWithBlankColour,
  messageListCategoryField,
  messageListRoutingForm,
  messageListSideFieldWithNoSelection,
  messageListSideFieldWithTwoValues,
  messageListSideFieldWithoutValue,
  messageView,
  messageViewOutbox,
  messageViewWithHoleInArchiveCall,
  messageViewWithoutBody,
  messageViewWithoutCorrespondent,
  spyReport,
} from '../../fixtures/game/social.ts'
import {
  BASE_URL,
  decode,
  expectOperation,
  fakeServer,
  gamePage,
  httpResponse,
  pageHtml,
  pageReply,
  sessionOn,
} from '../../helpers.ts'

const MESSAGES_URL = `${BASE_URL}game.php?page=messages`
const LIST_URL = `${BASE_URL}game.php?messcat=100&site=2&ajax=1&page=messages&mode=view`
const WRITE_URL = `${BASE_URL}game.php?id=4242&page=messages&mode=write`
const SEND_URL = `${BASE_URL}game.php?id=4242&ajax=1&page=messages&mode=send`
const ACTION_URL = `${BASE_URL}game.php?page=messages&mode=action`

function pageOf(body: string, url = MESSAGES_URL): Page {
  return parsePage(httpResponse({ body }, url))
}

const CATEGORIES = [
  {
    id: 100,
    name: 'Messages',
    unread: 3,
    total: 12,
    color: '#ffffff',
    handler: 'Message.getMessages(100);return false;',
  },
  {
    id: 999,
    name: 'Outbox',
    unread: 0,
    total: 7,

    color: null,
    handler: 'Message.getMessages(999);return false;',
  },
]

const COMPOSE_FORM = [
  '<div class="message_recipient_name">Scout [1:2:3]</div>',
  '<form name="message" action="" method="post">',
  '<input type="text" name="subject" value="Re: Report">',
  '<textarea name="text"></textarea>',
  '</form>',
].join('')

void test('the shell is read as the sidebar it renders', async () => {
  const observed = await decode(
    (session) => messages(session),
    pageReply(gamePage(messageCategoryTabs)),
  )
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'messages',

    observedAtMs: observed.response.observedAtMs,
    categories: CATEGORIES,

    list: null,
  })
})

void test('a category link whose colour the template left blank states none', () => {
  const document = readMessages(pageOf(gamePage(messageCategoryTabWithBlankColour)))
  assert.deepEqual(document.categories, [
    {
      id: 100,
      name: 'Messages',
      unread: 2,
      total: 9,
      color: null,
      handler: 'Message.getMessages(100);return false;',
    },
  ])
})

void test('an element named like a category without being one is left out', () => {
  const document = readMessages(
    pageOf(gamePage(`${messageCategoryTabs}<div id="mes_footer">not a category</div>`)),
  )
  assert.deepEqual(
    document.categories?.map((category) => category.id),
    [100, 999],
  )
})

void test('the shell of a response rendered without a planet reports none', () => {
  const document = readMessages(pageOf(pageHtml(messageCategoryTabs)))
  assert.equal('planetId' in document, false)
  assert.equal(document.categories?.length, 2)
})

void test('the list is read from the fragment the page’s own script asks for', async () => {
  const observed = await decode(
    (session) => messagesView(session, { category: 100, page: 2 }),
    pageReply(pageHtml(messageView)),
  )
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'messages',

    observedAtMs: observed.response.observedAtMs,

    categories: null,
    list: {
      category: 100,
      page: 2,
      visiblePages: [1, 2, 3],

      markedRead: true,
      messages: [
        {
          id: 7,
          senderId: 4242,
          category: 100,
          subject: 'Spy on 1:2:3',
          correspondentText: 'Scout',
          sentAtText: '01.01.2026 12:00:00',
          wasUnread: true,
          body: 'Report: battle',
          bodyHtml: 'Report: <a href="game.php?page=raport&amp;raport=abc123">battle</a>',
          reportIds: ['abc123'],

          spyReports: [],
        },
      ],
    },
  })
})

void test('the outbox does not mark incoming messages as read', () => {
  const document = readMessagesList(pageOf(pageHtml(messageViewOutbox)))
  assert.equal(document.list?.category, 999)
  assert.equal(document.list?.markedRead, false)
  assert.deepEqual(document.list?.messages, [])
})

void test('message bodies preserve line breaks inside formatted content', () => {
  const markup = '<b>First<br>Second</b><br><br>Third'
  const body = messageView.replace(
    'Report: <a href="game.php?page=raport&amp;raport=abc123">battle</a>',
    markup,
  )
  const message = readMessagesList(pageOf(pageHtml(body))).list?.messages[0]
  assert.equal(message?.body, 'First\nSecond\n\nThird')
  assert.equal(message?.bodyHtml, markup)
})

void test('a message without its sender controls states no sender and no subject', () => {
  const document = readMessagesList(pageOf(pageHtml(messageViewWithoutCorrespondent)))
  const message = (document.list?.messages ?? [])[0]!
  assert.equal(message.senderId, null)
  assert.equal(message.subject, null)
  assert.equal(message.wasUnread, false)

  assert.deepEqual(message.reportIds, ['abc123'])
})

void test('an archive call with a hole in it names no category', () => {
  const document = readMessagesList(pageOf(pageHtml(messageViewWithHoleInArchiveCall)))
  assert.equal(document.list?.messages[0]!.category, null)
})

void test('a row without a body block is a decoding failure', () => {
  assert.throws(() => readMessagesList(pageOf(pageHtml(messageViewWithoutBody))), {
    code: ErrorCode.ParseError,
    message: 'Missing message body markup',
  })
})

void test('a message that carries a spy report is read with it', () => {
  const withReport = messageView.replace(
    '<div class="message_text">',
    `<div class="message_text">${spyReport}`,
  )
  const document = readMessagesList(pageOf(pageHtml(withReport)))
  const report = (document.list?.messages[0]!.spyReports ?? [])[0]!
  assert.equal(report.title, 'Spy on 1:2:3')
  assert.deepEqual(report.target, { galaxy: 1, system: 2, planet: 3, type: 1 })
  assert.equal(report.elements.get(202), 1000)
})

void test('a response that carries both documents is decoded for both', () => {
  const both = pageOf(gamePage(`${messageCategoryTabs}${messageView}`))
  for (const document of [readMessages(both), readMessagesList(both)]) {
    assert.equal('planetId' in document, false)
    assert.equal(document.categories?.length, 2)
    assert.equal(document.list?.messages[0]!.id, 7)
  }
})

void test('a navigation link that is not a page number offers no page', () => {
  const withMarkers = messageView.replace(
    '<a href="#">3</a>',
    '<a href="#">3</a><a href="#">&#187;</a><a href="#">&#171;</a>',
  )
  const document = readMessagesList(pageOf(pageHtml(withMarkers)))
  assert.deepEqual(document.list?.visiblePages, [1, 2, 3])
  assert.equal(document.list?.page, 2)
})

void test('a list whose routing fields state no single page is a decoding failure', () => {
  const broken: [string, string, string][] = [
    ['no category at all', messageListRoutingForm(''), 'Missing messcat form field'],

    [
      'a page field with no value',
      messageListRoutingForm(messageListSideFieldWithoutValue(messageListCategoryField)),
      'Expected a numeric value',
    ],
    [
      'a page field with two values',
      messageListRoutingForm(messageListSideFieldWithTwoValues(messageListCategoryField)),
      'Ambiguous side form field',
    ],
    [
      'a page field with no selection',
      messageListRoutingForm(messageListSideFieldWithNoSelection(messageListCategoryField)),
      'Expected a numeric value',
    ],
  ]
  for (const [name, body, message] of broken)
    assert.throws(
      () => readMessagesList(pageOf(pageHtml(body))),
      { code: ErrorCode.ParseError, message },
      name,
    )
})

void test('a response that is neither document is refused', () => {
  for (const [name, run, message] of [
    [
      'the shell',
      () => readMessages(pageOf(pageHtml('<div>Nothing here</div>'))),
      'Expected one #mes_100, found 0',
    ],
    [
      'the list',
      () => readMessagesList(pageOf(pageHtml('<div>Nothing here</div>'))),
      'Expected one .messagestable, found 0',
    ],
  ] satisfies [string, () => unknown, string][])
    assert.throws(run, { code: ErrorCode.ParseError, message }, name)
})

void test('the shell and the list ask two addresses, each its own', async () => {
  await expectOperation((session) => messages(session), { url: MESSAGES_URL })
  await expectOperation((session) => messages(session), {
    url: MESSAGES_URL,
  })
  await expectOperation((session) => messagesView(session, { category: 100, page: 2 }), {
    url: LIST_URL,
  })
})

void test('the compose form names the recipient the submission must carry', async () => {
  const server = fakeServer(pageReply(pageHtml(COMPOSE_FORM)))
  const observed = await messagesWrite(sessionOn(server), {
    recipientId: 4242,
  })

  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.url.href, WRITE_URL)
  assert.deepEqual(observed.data, {
    kind: 'messagesCompose',

    observedAtMs: observed.response.observedAtMs,

    recipientId: 4242,
    recipientText: 'Scout [1:2:3]',
    subject: 'Re: Report',
  })
})

void test('a compose form the template rendered without an address is refused', () => {
  assert.throws(
    () => readMessagesCompose(pageOf(pageHtml(COMPOSE_FORM.replace(' action=""', '')), WRITE_URL)),
    { code: ErrorCode.ParseError, message: 'Missing response URL' },
  )
})

void test('message compose forms omit navigation context', () => {
  const document = readMessagesCompose(pageOf(gamePage(COMPOSE_FORM), WRITE_URL))
  assert.equal('planetId' in document, false)
})

void test('a compose form without the fields the reader needs is refused', () => {
  const broken: [string, string, string][] = [
    [
      'no subject field',
      '<div class="message_recipient_name">Scout</div><form name="message" action=""></form>',
      'Missing subject form field',
    ],
    [
      'no recipient heading',
      '<form name="message" action=""><input name="subject" value="x"></form>',
      'Missing message recipient',
    ],
  ]
  for (const [name, body, message] of broken)
    assert.throws(
      () => readMessagesCompose(pageOf(pageHtml(body), WRITE_URL)),
      {
        code: ErrorCode.ParseError,
        message,
      },
      name,
    )
})

void test('submitting a message posts the subject and the text to the same id', async () => {
  await expectOperation(
    (session) =>
      messagesSend(session, { recipientId: 4242, subject: 'Re: Report', text: 'Thanks' }),
    {
      method: 'POST',

      url: SEND_URL,
      body: [
        ['subject', 'Re: Report'],
        ['text', 'Thanks'],
      ],
    },
  )
})

void test('reading the form and submitting it are two requests of two functions', async () => {
  const server = fakeServer([pageReply(pageHtml(COMPOSE_FORM)), pageReply('"Message sent"')])
  const session = sessionOn(server)
  const form = await messagesWrite(session, { recipientId: 4242 })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.url.href, WRITE_URL)
  if (form.data.kind !== 'messagesCompose') assert.fail('expected the compose form')

  const sent = await messagesSend(session, {
    recipientId: form.data.recipientId,
    subject: form.data.subject,
    text: 'Thanks',
  })
  assert.equal(server.requests.length, 2)
  assert.equal(server.requests[1]!.url.href, SEND_URL)
  assert.deepEqual(sent.data, { kind: 'json', value: 'Message sent' })
})

void test('a submission the endpoint accepted is reported as its JSON receipt', async () => {
  const observed = await decode(
    (session) =>
      messagesSend(session, { recipientId: 4242, subject: 'Re: Report', text: 'Thanks' }),
    pageReply('"Message sent"'),
  )
  assert.deepEqual(observed.data, { kind: 'json', value: 'Message sent' })
})

void test('every footer command is one submission of the list form', async () => {
  const commands = [
    'readmarked',
    'readtypeall',
    'readall',
    'deletemarked',
    'deleteunmarked',
    'deletetypeall',
    'deleteall',
    'archivemarked',
  ] as const
  for (const command of commands)
    await expectOperation((session) => messagesAction(session, { category: 100, command }), {
      method: 'POST',
      url: ACTION_URL,
      body: [
        ['ajax', '1'],
        ['messcat', '100'],
        ['submitBottom', '1'],
        ['actionBottom', command],
      ],
    })
})

void test('a whole-category command takes no message ids', async () => {
  await expectOperation(
    (session) => messagesAction(session, { category: 200, command: 'readtypeall' }),
    {
      method: 'POST',
      url: ACTION_URL,
      body: [
        ['ajax', '1'],
        ['messcat', '200'],
        ['submitBottom', '1'],
        ['actionBottom', 'readtypeall'],
      ],
    },
  )
})

void test('the checked messages travel as the ids the command acts on', async () => {
  await expectOperation(
    (session) =>
      messagesAction(session, {
        category: 100,
        command: 'deletemarked',
        ids: [7, 11],
      }),
    {
      method: 'POST',
      url: ACTION_URL,
      body: [
        ['ajax', '1'],
        ['messcat', '100'],
        ['submitBottom', '1'],
        ['actionBottom', 'deletemarked'],
        ['messageID[7]', '1'],
        ['messageID[11]', '1'],
      ],
    },
  )
})

void test('the three marked commands are one submission each, and all post to the list', async () => {
  for (const command of ['readmarked', 'deletemarked', 'archivemarked'] as const)
    await expectOperation(
      (session) => messagesAction(session, { category: 200, ids: [7], command }),
      {
        method: 'POST',
        url: ACTION_URL,
        body: [
          ['ajax', '1'],
          ['messcat', '200'],
          ['submitBottom', '1'],
          ['actionBottom', command],
          ['messageID[7]', '1'],
        ],
      },
    )
})

void test('the two per-row controls are addresses rather than form submissions', async () => {
  await expectOperation((session) => messagesDeleteOne(session, { msgId: 7 }), {
    url: `${BASE_URL}game.php?MsgID=7&ajax=1&page=messages&mode=delonemsg`,
  })
  await expectOperation((session) => messagesArchiveOne(session, { msgId: 11 }), {
    url: `${BASE_URL}game.php?MsgID=11&ajax=1&page=messages&mode=inarchive`,
  })
})

void test('the per-row controls report the answer they were given', async () => {
  const deleted = await decode((session) => messagesDeleteOne(session, { msgId: 7 }), {
    body: '"OK"',
  })
  assert.deepEqual(deleted.data, { kind: 'json', value: 'OK' })
  const archived = await decode((session) => messagesArchiveOne(session, { msgId: 11 }), {})
  assert.deepEqual(archived.data, { kind: 'empty' })
})
