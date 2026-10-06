import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../../src/index.ts'
import {
  ErrorCode,
  notes,
  notesDelete,
  notesDetail,
  notesInsert,
  parsePage,
  readNote,
  readNotes,
} from '../../../src/index.ts'
import {
  noteDetailForm,
  noteDetailOfAnotherNote,
  notesPage,
  notesWithoutDeleteForm,
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

const NOTES_URL = `${BASE_URL}game.php?page=notes`
const DETAIL_URL = `${BASE_URL}game.php?id=4&page=notes&mode=detail`

function pageOf(body: string, url = NOTES_URL): Page {
  return parsePage(httpResponse({ body }, url))
}

const BLANK_EDITOR = [
  '<form action="?page=notes&amp;mode=insert" method="post">',
  '<input type="hidden" name="id" value="0">',
  '<select name="priority"><option value="1">Normal</option></select>',
  '<input id="title" name="title" type="text" value="">',
  '<textarea name="text"></textarea>',
  '</form>',
].join('')

void test('the note list is read from each row’s own link and figures', async () => {
  const observed = await decode((session) => notes(session), pageReply(gamePage(notesPage)))
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'notes',

    observedAtMs: observed.response.observedAtMs,
    notes: [
      {
        id: 4,
        title: 'Buy list',
        updatedAtText: '01.01.2026 12:00:00',
        sizeBytes: 1024,
      },
      { id: 9, title: 'Spy times', updatedAtText: '02.01.2026 09:15:00', sizeBytes: 37 },
    ],
  })
})

void test('the notes are the account’s, so a popup carries no planet', () => {
  const document = readNotes(pageOf(pageHtml(notesPage)))
  assert.equal('planetId' in document, false)
  assert.equal(document.notes.length, 2)
})

void test('a response that is not the note list is refused', () => {
  assert.throws(() => readNotes(pageOf(pageHtml(notesWithoutDeleteForm))), {
    code: ErrorCode.ParseError,
    message: 'Expected one form[action*="mode=delete"], found 0',
  })
})

void test('the saved note is read as the editor rendered it', async () => {
  const observed = await decode(
    (session) => notesDetail(session, { noteId: 4 }),
    pageReply(gamePage(noteDetailForm)),
  )
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'note',

    observedAtMs: observed.response.observedAtMs,
    id: 4,
    title: 'Buy list',

    priority: 1,
    text: 'Metal: 500 Crystal: 300',
  })
})

void test('an editor for another note states that note’s own id', () => {
  const document = readNote(pageOf(gamePage(noteDetailOfAnotherNote), DETAIL_URL))
  assert.equal(document.id, 9)
  assert.equal(document.title, 'Other note')
  assert.equal(document.text, 'Other text')
})

void test('the blank editor is a valid document: a new note holds nothing yet', () => {
  const document = readNote(pageOf(pageHtml(BLANK_EDITOR)))
  assert.deepEqual(document, {
    kind: 'note',

    observedAtMs: 1,

    id: 0,
    title: '',
    priority: 1,
    text: '',
  })
})

void test('an editor the endpoint did not render is refused', () => {
  assert.throws(() => readNote(pageOf(pageHtml('<div>Nothing here</div>'))), {
    code: ErrorCode.ParseError,
    message: 'Expected one form[action*="mode=insert"], found 0',
  })
})

void test('writing a note posts the four fields the endpoint reads', async () => {
  await expectOperation(
    (session) =>
      notesInsert(session, { noteId: 4, title: 'Buy list', priority: 2, text: 'Metal: 500' }),
    {
      method: 'POST',
      url: `${BASE_URL}game.php?page=notes&mode=insert`,
      body: [
        ['id', '4'],
        ['title', 'Buy list'],
        ['priority', '2'],
        ['text', 'Metal: 500'],
      ],
    },
  )
})

void test('a note written without an id inserts a new one', async () => {
  await expectOperation(
    (session) => notesInsert(session, { title: 'New list', priority: 0, text: '' }),
    {
      method: 'POST',
      url: `${BASE_URL}game.php?page=notes&mode=insert`,
      body: [
        ['id', '0'],
        ['title', 'New list'],
        ['priority', '0'],
        ['text', ''],
      ],
    },
  )
})

void test('omitted note fields use the installed server defaults', async () => {
  await expectOperation((session) => notesInsert(session, {}), {
    method: 'POST',
    url: `${BASE_URL}game.php?page=notes&mode=insert`,
    body: [['id', '0']],
  })
})

void test('deleting notes posts one checkbox per id', async () => {
  await expectOperation((session) => notesDelete(session, { noteIds: [4, 9] }), {
    method: 'POST',

    url: `${BASE_URL}game.php?page=notes&mode=delete`,
    body: [
      ['delmes[4]', '1'],
      ['delmes[9]', '1'],
    ],
  })
})

void test('a refused submission is reported as the message page the server rendered', async () => {
  const list = await decode(
    (session) => notes(session),
    pageReply(gamePage('<div class="ally_contents">Not allowed</div>')),
  )
  assert.deepEqual(list.data, { kind: 'message', message: 'Not allowed' })
  const editor = await decode(
    (session) => notesDetail(session, { noteId: 4 }),
    pageReply(gamePage('<div class="ally_contents">Not allowed</div>')),
  )
  assert.deepEqual(editor.data, { kind: 'message', message: 'Not allowed' })
})

void test('a written note is reported as the redirect back to the list', async () => {
  const observed = await decode(
    (session) => notesInsert(session, { title: 'New list', priority: 1, text: '' }),
    { status: 302, headers: { Location: 'game.php?page=notes' } },
  )
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}game.php?page=notes`),
  })
})
