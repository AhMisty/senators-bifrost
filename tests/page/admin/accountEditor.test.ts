import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  AdminAccountEditorSection,
  AdminAccountEditorSubmit,
  Page,
} from '../../../src/index.ts'
import {
  adminAccountEditor,
  adminAccountEditorSubmit,
  parsePage,
  readAdminAccountEditor,
} from '../../../src/index.ts'
import {
  ACCOUNT_EDITOR_ALLIANCE_BODY,
  ACCOUNT_EDITOR_MENU_BODY,
  ACCOUNT_EDITOR_MENU_WITH_FOREIGN_CARD_BODY,
  ACCOUNT_EDITOR_PERSONAL_BODY,
  ACCOUNT_EDITOR_SHIPS_BODY,
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

const ACCOUNT_EDITOR_URL = `${BASE_URL}admin.php?page=accountEditor`

function sectionUrl(section: AdminAccountEditorSection): string {
  return `${BASE_URL}admin.php?edit=${section}&page=accountEditor`
}

function pageOf(body: string, url = ACCOUNT_EDITOR_URL): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, url))
}

const MENU_SECTIONS: AdminAccountEditorSection[] = [
  'buildings',
  'ships',
  'defenses',
  'research',
  'officers',
  'resources',
  'planets',
  'alliances',
  'personal',
]

void test('the menu offers the sections its cards link to, in the order they render', async () => {
  const page = await read(adminAccountEditor, pageReply(pageHtml(ACCOUNT_EDITOR_MENU_BODY)))
  assert.equal(page.kind, 'adminAccountEditor')

  assert.equal('planetId' in page, false)
  assert.equal(page.section, 'menu')
  assert.deepEqual(page.sections, MENU_SECTIONS)

  assert.deepEqual(page.fields, [])
  assert.ok(page.observedAtMs > 0)
})

void test('a section form reports the controls a submission would send', async () => {
  const server = fakeServer(pageReply(pageHtml(ACCOUNT_EDITOR_SHIPS_BODY)))
  const observed = await adminAccountEditor(sessionOn(server), { section: 'ships' })
  assert.equal(observed.data.kind, 'adminAccountEditor')
  const page = observed.data
  assert.equal(page.section, 'ships')

  assert.deepEqual(page.sections, [])
  assert.equal('planetId' in page, false)
  assert.deepEqual(page.fields, [
    { name: 'id', type: 'text', value: '0', checked: false, options: [] },
    { name: 'small_ship_cargo', type: 'text', value: '0', checked: false, options: [] },
    { name: 'spy_sonde', type: 'text', value: '0', checked: false, options: [] },
    { name: 'add', type: 'submit', value: 'Add', checked: false, options: [] },
    { name: 'delete', type: 'submit', value: 'Delete', checked: false, options: [] },
  ])
  assert.equal(server.requests[0]!.url.href, sectionUrl('ships'))
})

void test('the section decoder is the published one the page function is built on', () => {
  assert.deepEqual(readAdminAccountEditor(pageOf(ACCOUNT_EDITOR_MENU_BODY), 'menu'), {
    kind: 'adminAccountEditor',
    observedAtMs: 1,
    section: 'menu',
    sections: MENU_SECTIONS,
    fields: [],
  })
  assert.deepEqual(readAdminAccountEditor(pageOf(ACCOUNT_EDITOR_SHIPS_BODY), 'ships'), {
    kind: 'adminAccountEditor',
    observedAtMs: 1,
    section: 'ships',
    sections: [],
    fields: [
      { name: 'id', type: 'text', value: '0', checked: false, options: [] },
      { name: 'small_ship_cargo', type: 'text', value: '0', checked: false, options: [] },
      { name: 'spy_sonde', type: 'text', value: '0', checked: false, options: [] },
      { name: 'add', type: 'submit', value: 'Add', checked: false, options: [] },
      { name: 'delete', type: 'submit', value: 'Delete', checked: false, options: [] },
    ],
  })
})

void test('a card naming no section the server knows is dropped rather than failing', async () => {
  const page = await read(
    adminAccountEditor,
    pageReply(pageHtml(ACCOUNT_EDITOR_MENU_WITH_FOREIGN_CARD_BODY)),
  )
  assert.deepEqual(page.sections, ['ships'])
})

void test('a section form whose fields are not a catalogue reports every one of them', async () => {
  const page = await read(
    (session) => adminAccountEditor(session, { section: 'personal' }),
    pageReply(pageHtml(ACCOUNT_EDITOR_PERSONAL_BODY)),
  )
  assert.equal('planetId' in page, false)
  assert.deepEqual(
    page.fields.map((field) => [field.name, field.type, field.value]),
    [
      ['id', 'text', ''],
      ['username', 'text', ''],
      ['password', 'text', ''],
      ['email', 'text', ''],
      ['email_2', 'text', ''],
      ['vacation', 'select', ''],
      ['d', 'text', ''],
      ['h', 'text', ''],
      ['m', 'text', ''],
      ['s', 'text', ''],
    ],
  )
})

void test('the section a request names is the route’s own parameter, not one a caller adds', async () => {
  await expectOperation((session) => adminAccountEditor(session, { section: 'ships' }), {
    url: sectionUrl('ships'),
  })
  await expectOperation((session) => adminAccountEditor(session, { section: 'officers' }), {
    url: `${BASE_URL}admin.php?edit=officiers&page=accountEditor`,
  })
  await expectOperation((session) => adminAccountEditor(session, { section: 'research' }), {
    url: `${BASE_URL}admin.php?edit=researchs&page=accountEditor`,
  })
})

void test('a caller who names no section asks for the menu', async () => {
  await expectOperation(adminAccountEditor, { url: ACCOUNT_EDITOR_URL })
})

void test('a submission sends the values the form reported, under the operation it names', async () => {
  await expectOperation(
    (session) =>
      adminAccountEditorSubmit(session, {
        section: 'ships',
        values: { id: 1000, small_ship_cargo: 5, spy_sonde: 0 },
        submit: 'add',
      }),
    {
      method: 'POST',
      url: sectionUrl('ships'),
      body: [
        ['id', '1000'],
        ['small_ship_cargo', '5'],
        ['spy_sonde', '0'],
        ['add', '1'],
      ],
    },
  )
  await expectOperation(
    (session) =>
      adminAccountEditorSubmit(session, {
        section: 'ships',
        values: { id: 1000, small_ship_cargo: 2 },
        submit: 'delete',
      }),
    {
      method: 'POST',
      url: sectionUrl('ships'),
      body: [
        ['id', '1000'],
        ['small_ship_cargo', '2'],
        ['delete', '1'],
      ],
    },
  )
})

void test('a section whose control is unnamed submits no operation of its own', async () => {
  await expectOperation(
    (session) =>
      adminAccountEditorSubmit(session, {
        section: 'personal',
        values: {
          id: 42,
          username: 'Nova',
          email: 'nova@example.com',
          email_2: '',
          vacation: 'no',
        },
      }),
    {
      method: 'POST',
      url: sectionUrl('personal'),
      body: [
        ['id', '42'],
        ['username', 'Nova'],
        ['email', 'nova@example.com'],
        ['email_2', ''],
        ['vacation', 'no'],
      ],
    },
  )
})

void test('a submission the page refused is reported as the message it printed', async () => {
  const refused = await answer(
    (session) =>
      adminAccountEditorSubmit(session, {
        section: 'personal',
        values: { id: 42, vacation: 'no' },
      }),
    pageReply(pageHtml(adminMessageBody('Account not found'))),
  )
  assert.deepEqual(refused.data, { kind: 'message', message: 'Account not found' })
})

void test('personal edits submit the complete requested vacation duration', async () => {
  await expectOperation(
    (session) =>
      adminAccountEditorSubmit(session, {
        section: 'personal',
        values: { id: 42, vacation: 'yes', d: 2, h: 0, m: 0, s: 0 },
      }),
    {
      method: 'POST',
      url: sectionUrl('personal'),
      body: [
        ['id', '42'],
        ['vacation', 'yes'],
        ['d', '2'],
        ['h', '0'],
        ['m', '0'],
        ['s', '0'],
      ],
    },
  )
})

void test('alliance edits explicitly retain or replace the leader', async () => {
  await expectOperation(
    (session) =>
      adminAccountEditorSubmit(session, {
        section: 'alliances',
        values: { id: 7, name: 'Nova', changeleader: 42 },
      }),
    {
      method: 'POST',
      url: sectionUrl('alliances'),
      body: [
        ['id', '7'],
        ['name', 'Nova'],
        ['changeleader', '42'],
      ],
    },
  )
})

void test('editor types require the state that the server unconditionally rewrites', () => {
  type Accepts<Input> = Input extends AdminAccountEditorSubmit ? true : false
  const rejected: [
    Accepts<{ section: 'personal'; values: { id: number; username: string } }>,
    Accepts<{ section: 'personal'; values: { id: number; vacation: 'yes' } }>,
    Accepts<{ section: 'personal'; values: { id: number; vacation: 'maybe' } }>,
    Accepts<{ section: 'alliances'; values: { id: number; name: string } }>,
  ] = [false, false, false, false]
  assert.deepEqual(rejected, [false, false, false, false])
})

void test('a document the server did not render is reported as the receipt it answered with', async () => {
  const refused = await decode(
    (session) => adminAccountEditor(session, { section: 'ships' }),
    pageReply(pageHtml(adminMessageBody('Permission error!'))),
  )
  assert.deepEqual(refused.data, { kind: 'message', message: 'Permission error!' })

  const empty = await decode(adminAccountEditor, { body: '' })
  assert.deepEqual(empty.data, { kind: 'empty' })
})

void test('a section form’s fields are read from the row that renders them', async () => {
  const page = await read(
    (session) => adminAccountEditor(session, { section: 'ships' }),
    pageReply(pageHtml(ACCOUNT_EDITOR_SHIPS_BODY)),
  )
  assert.deepEqual(
    page.fields.map((field) => field.name),
    ['id', 'small_ship_cargo', 'spy_sonde', 'add', 'delete'],
  )

  const alliance = await read(
    (session) => adminAccountEditor(session, { section: 'alliances' }),
    pageReply(pageHtml(ACCOUNT_EDITOR_ALLIANCE_BODY)),
  )
  assert.deepEqual(
    alliance.fields.map((field) => field.name),
    ['id', 'changeleader', 'name', 'tag', 'delete_u', 'delete', 'externo', 'interno', 'solicitud'],
  )
})
