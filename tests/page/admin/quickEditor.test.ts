import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  AdminMoonEditorKey,
  AdminPlanetEditorKey,
  AdminQuickEditorSave,
  AdminQuickEditorTarget,
  Page,
} from '../../../src/index.ts'
import {
  ErrorCode,
  adminQuickEditor,
  adminQuickEditorSave,
  parsePage,
  readAdminQuickEditor,
} from '../../../src/index.ts'
import {
  ACCOUNT_EDITOR_SHIPS_BODY,
  QUICK_EDITOR_MOON_BODY,
  QUICK_EDITOR_MOON_VALUES,
  QUICK_EDITOR_PLANET_BODY,
  QUICK_EDITOR_PLANET_VALUES,
  QUICK_EDITOR_PLAYER_BODY,
  QUICK_EDITOR_PLAYER_VALUES,
  QUICK_EDITOR_RESTRICTED_PLAYER_BODY,
  adminMessageBody,
} from '../../fixtures/admin/formPages.ts'
import {
  BASE_URL,
  answer,
  decode,
  fakeServer,
  httpResponse,
  pageHtml,
  pageReply,
  sessionOn,
} from '../../helpers.ts'

function editorUrl(editor: AdminQuickEditorTarget, id: number, save = false): string {
  return `${BASE_URL}admin.php?edit=${editor}&id=${id}${save ? '&action=send' : ''}&page=quickEditor`
}

function pageOf(body: string, editor: AdminQuickEditorTarget, id = 42): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, editorUrl(editor, id)))
}

void test('the player editor reads a complete record and the visible account controls', async () => {
  const server = fakeServer(pageReply(pageHtml(QUICK_EDITOR_PLAYER_BODY)))
  const observed = await adminQuickEditor(sessionOn(server), { editor: 'player', recordId: 42 })
  assert.equal(observed.data.kind, 'adminQuickEditor')
  assert.equal(observed.data.editor, 'player')
  assert.equal(observed.data.recordId, 42)
  assert.deepEqual(observed.data.values, QUICK_EDITOR_PLAYER_VALUES)
  assert.equal(observed.data.canChangePassword, true)
  assert.equal(observed.data.multi, true)
  assert.equal('password' in observed.data.values, false)
  assert.equal('multi' in observed.data.values, false)
  assert.ok(observed.data.observedAtMs > 0)
  assert.equal(server.requests[0]!.url.href, editorUrl('player', 42))
})

void test('restricted account forms retain complete values without guessing hidden controls', () => {
  const record = readAdminQuickEditor(
    pageOf(QUICK_EDITOR_RESTRICTED_PLAYER_BODY, 'player'),
    'player',
  )
  assert.deepEqual(record.values, QUICK_EDITOR_PLAYER_VALUES)
  assert.equal(record.canChangePassword, false)
  assert.equal(record.multi, null)
  const unchecked = QUICK_EDITOR_PLAYER_BODY.replace(
    '<option value="0">No</option><option value="1" selected>Yes</option>',
    '<option value="0" selected>No</option><option value="1">Yes</option>',
  )
  assert.equal(readAdminQuickEditor(pageOf(unchecked, 'player'), 'player').multi, false)
})

void test('planet and moon responses expose their own complete building fields', async () => {
  for (const [body, values, editor] of [
    [QUICK_EDITOR_PLANET_BODY, QUICK_EDITOR_PLANET_VALUES, 'planet'],
    [QUICK_EDITOR_MOON_BODY, QUICK_EDITOR_MOON_VALUES, 'moon'],
  ] as const) {
    const server = fakeServer(pageReply(pageHtml(body)))
    const observed = await adminQuickEditor(sessionOn(server), { editor: 'planet', recordId: 1234 })
    assert.equal(observed.data.kind, 'adminQuickEditor')
    assert.equal(observed.data.editor, editor)
    assert.equal(observed.data.recordId, 1234)
    assert.deepEqual(observed.data.values, values)
    assert.equal('planetId' in observed.data, false)
    assert.equal(server.requests[0]!.url.href, editorUrl('planet', 1234))
  }
})

void test('every missing required player, planet or moon value fails before it can be saved', () => {
  for (const [body, values, editor] of [
    [QUICK_EDITOR_PLAYER_BODY, QUICK_EDITOR_PLAYER_VALUES, 'player'],
    [QUICK_EDITOR_PLANET_BODY, QUICK_EDITOR_PLANET_VALUES, 'planet'],
    [QUICK_EDITOR_MOON_BODY, QUICK_EDITOR_MOON_VALUES, 'planet'],
  ] as const)
    for (const name of Object.keys(values)) {
      const truncated = body.replace(new RegExp(`<input\\b[^>]*name="${name}"[^>]*>`), '')
      assert.notEqual(truncated, body, name)
      assert.throws(() => readAdminQuickEditor(pageOf(truncated, editor), editor), {
        code: ErrorCode.ParseError,
        message: `Missing ${name} form field`,
      })
    }
  assert.throws(
    () => readAdminQuickEditor(pageOf('<form id="userform"></form>', 'player'), 'player'),
    { code: ErrorCode.ParseError },
  )
})

void test('duplicate or multivalued editor controls are not complete scalar records', () => {
  for (const replacement of [
    '<input name="name" value="Nova"><input name="name" value="Vega">',
    '<select name="name" multiple><option value="Nova" selected>Nova</option></select>',
  ]) {
    const body = QUICK_EDITOR_PLAYER_BODY.replace(/<input\b[^>]*name="name"[^>]*>/, replacement)
    assert.throws(() => readAdminQuickEditor(pageOf(body, 'player'), 'player'), {
      code: ErrorCode.ParseError,
      message: 'Expected one scalar name form field',
    })
  }
})

void test('the optional password and multi controls must be present together', () => {
  for (const [removed, missing] of [
    ['<input name="password" type="password" value="">', 'password'],
    [
      '<select name="multi"><option value="0">No</option><option value="1" selected>Yes</option></select>',
      'multi',
    ],
  ]) {
    const body = QUICK_EDITOR_PLAYER_BODY.replace(removed!, '')
    assert.throws(() => readAdminQuickEditor(pageOf(body, 'player'), 'player'), {
      code: ErrorCode.ParseError,
      message: `Missing ${missing} form field`,
    })
  }
})

void test('unrelated fields do not become editable values', () => {
  const body = QUICK_EDITOR_PLANET_BODY.replace(
    '</form>',
    '<input name="unrelated" value="1"></form>',
  )
  const record = readAdminQuickEditor(pageOf(body, 'planet'), 'planet')
  assert.deepEqual(record.values, QUICK_EDITOR_PLANET_VALUES)
})

void test('non-editor documents and invalid record IDs fail parsing', async () => {
  await assert.rejects(
    () =>
      adminQuickEditor(sessionOn(fakeServer(pageReply(pageHtml(ACCOUNT_EDITOR_SHIPS_BODY)))), {
        editor: 'player',
        recordId: 42,
      }),
    { code: ErrorCode.ParseError, message: 'Expected one form#userform, found 0' },
  )
  const page = parsePage(
    httpResponse(
      { body: pageHtml(QUICK_EDITOR_PLAYER_BODY) },
      `${BASE_URL}admin.php?page=quickEditor&edit=player&id=invalid`,
    ),
  )
  assert.throws(() => readAdminQuickEditor(page, 'player'), { code: ErrorCode.ParseError })
})

void test('planet saves retain all values and apply only the patch', async () => {
  const record = readAdminQuickEditor(pageOf(QUICK_EDITOR_PLANET_BODY, 'planet', 1234), 'planet')
  assert.equal(record.editor, 'planet')
  const server = fakeServer({})
  await adminQuickEditorSave(sessionOn(server), {
    record,
    patch: { name: 'Nova', small_ship_cargo: '7' },
  })
  const request = server.requests[0]!
  assert.equal(request.method, 'POST')
  assert.equal(request.url.href, editorUrl('planet', 1234, true))
  assert.equal(request.body!.has('mondbasis'), false)
  assert.deepEqual(Object.fromEntries(request.body!), {
    ...QUICK_EDITOR_PLANET_VALUES,
    name: 'Nova',
    small_ship_cargo: '7',
  })
  assert.deepEqual(record.values, QUICK_EDITOR_PLANET_VALUES)
})

void test('large fleet counts survive form reads and submissions without number conversion', async () => {
  const amount = '9007199254740993'
  const body = QUICK_EDITOR_PLANET_BODY.replace(
    /<input\b[^>]*name="small_ship_cargo"[^>]*>/,
    `<label>9.007.199.254.740.992</label><input name="small_ship_cargo" value="${amount}">`,
  )
  const record = readAdminQuickEditor(pageOf(body, 'planet'), 'planet')
  assert.equal(record.editor, 'planet')
  assert.equal(record.values.small_ship_cargo, amount)
  const server = fakeServer({})
  await adminQuickEditorSave(sessionOn(server), { record, patch: {} })
  assert.equal(server.requests[0]!.body!.get('small_ship_cargo'), amount)
})

void test('moon saves use the planet endpoint and retain only moon building fields', async () => {
  const record = readAdminQuickEditor(pageOf(QUICK_EDITOR_MOON_BODY, 'planet', 5678), 'planet')
  assert.equal(record.editor, 'moon')
  const server = fakeServer({})
  await adminQuickEditorSave(sessionOn(server), { record, patch: { mondbasis: '4' } })
  const request = server.requests[0]!
  assert.equal(request.url.href, editorUrl('planet', 5678, true))
  assert.deepEqual(Object.fromEntries(request.body!), {
    ...QUICK_EDITOR_MOON_VALUES,
    mondbasis: '4',
  })
  assert.equal(request.body!.has('metal_mine'), false)
  assert.deepEqual(record.values, QUICK_EDITOR_MOON_VALUES)
})

void test('player saves require explicit hidden states and submit a password only when supplied', async () => {
  const record = readAdminQuickEditor(
    pageOf(QUICK_EDITOR_RESTRICTED_PLAYER_BODY, 'player'),
    'player',
  )
  const server = fakeServer({})
  await adminQuickEditorSave(sessionOn(server), {
    record,
    patch: { darkmatter: '900' },
    multi: true,
    authorizationAttack: true,
  })
  assert.deepEqual(Object.fromEntries(server.requests[0]!.body!), {
    ...QUICK_EDITOR_PLAYER_VALUES,
    darkmatter: '900',
    multi: '1',
    authattack: 'on',
  })
  const editable = readAdminQuickEditor(pageOf(QUICK_EDITOR_PLAYER_BODY, 'player'), 'player')
  await adminQuickEditorSave(sessionOn(server), {
    record: editable,
    patch: {},
    multi: false,
    authorizationAttack: false,
    password: 'new-password',
  })
  assert.deepEqual(Object.fromEntries(server.requests[1]!.body!), {
    ...QUICK_EDITOR_PLAYER_VALUES,
    multi: '0',
    password: 'new-password',
  })
  assert.equal(server.requests[1]!.url.href, editorUrl('player', 42, true))
})

void test('save and refusal responses retain the server receipt', async () => {
  const record = readAdminQuickEditor(pageOf(QUICK_EDITOR_PLAYER_BODY, 'player'), 'player')
  const saved = await answer(
    (session) =>
      adminQuickEditorSave(session, {
        record,
        patch: {},
        multi: false,
        authorizationAttack: false,
      }),
    pageReply(pageHtml(adminMessageBody('The account Nova (42) was edited'))),
  )
  assert.deepEqual(saved.data, { kind: 'message', message: 'The account Nova (42) was edited' })
  const empty = await decode(
    (session) => adminQuickEditor(session, { editor: 'player', recordId: 42 }),
    { body: '' },
  )
  assert.deepEqual(empty.data, { kind: 'empty' })
})

type Assert<T extends true> = T
type PlayerSave = Extract<AdminQuickEditorSave, { multi: boolean }>
export type ExplicitPlayerFlags = Assert<
  PlayerSave extends { multi: boolean; authorizationAttack: boolean } ? true : false
>
export type SeparatePlayerFlags = Assert<
  Extract<'multi' | 'password', keyof PlayerSave['patch']> extends never ? true : false
>
export type DistinctBuildingSets = Assert<
  'mondbasis' extends AdminPlanetEditorKey
    ? false
    : 'metal_mine' extends AdminMoonEditorKey
      ? false
      : true
>
