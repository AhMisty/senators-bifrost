import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  AdminUniverseSettingsPage,
  AdminUniverseSettingKey,
  Page,
} from '../../../src/index.ts'
import {
  ErrorCode,
  adminUniverseSettings,
  adminUniverseSettingsSave,
  parsePage,
  readAdminUniverseSettings,
} from '../../../src/index.ts'
import { CONFIG_UNI_BODY, adminMessageBody } from '../../fixtures/admin/formPages.ts'
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

const CONFIG_UNI_URL = `${BASE_URL}admin.php?page=configUni`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, CONFIG_UNI_URL))
}

void test('configuration reads every server field into a complete keyed record', async () => {
  const server = fakeServer(pageReply(pageHtml(CONFIG_UNI_BODY)))
  const observed = await adminUniverseSettings(sessionOn(server))
  assert.equal(observed.data.kind, 'adminUniverseSettings')
  const page = observed.data
  assert.equal(Object.keys(page.settings).length, 112)
  assert.deepEqual(page.settings.game_name, { section: 'server', value: 'Nova' })
  assert.deepEqual(page.settings.game_speed, { section: 'universe', value: '2' })
  assert.deepEqual(page.settings.smtp_pass, { section: 'smtp', value: '' })
  assert.deepEqual(page.settings.disclamerNotice, { section: 'contacts', value: '' })
  assert.equal('sections' in page, false)
  assert.equal('planetId' in page, false)
  assert.ok(page.observedAtMs > 0)
  assert.equal(server.requests[0]!.url.href, CONFIG_UNI_URL)
})

void test('a missing field anywhere in the configuration is a parse failure', () => {
  const complete = readAdminUniverseSettings(pageOf(CONFIG_UNI_BODY))
  for (const name of Object.keys(complete.settings)) {
    const truncated = CONFIG_UNI_BODY.replace(new RegExp(`<input\\b[^>]*name="${name}"[^>]*>`), '')
    assert.notEqual(truncated, CONFIG_UNI_BODY, name)
    assert.throws(() => readAdminUniverseSettings(pageOf(truncated)), {
      code: ErrorCode.ParseError,
      message: `Missing ${name} form field`,
    })
  }
  assert.throws(() => readAdminUniverseSettings(pageOf('<main>Nothing configured</main>')), {
    code: ErrorCode.ParseError,
  })
})

void test('duplicate configuration fields are rejected and unrelated controls are ignored', () => {
  const duplicated = CONFIG_UNI_BODY.replace(
    /<input\b[^>]*name="game_name"[^>]*>/,
    (input) => input + input,
  )
  assert.throws(() => readAdminUniverseSettings(pageOf(duplicated)), {
    code: ErrorCode.ParseError,
    message: 'Duplicate game_name form field',
  })
  const extended = CONFIG_UNI_BODY.replace(
    '</tbody>',
    '<tr><td><input name="unrelated" value="ignore"></td></tr></tbody>',
  )
  assert.deepEqual(
    readAdminUniverseSettings(pageOf(extended)).settings,
    readAdminUniverseSettings(pageOf(CONFIG_UNI_BODY)).settings,
  )
})

void test('saving a patch preserves all other configuration values including empty strings', async () => {
  const form = readAdminUniverseSettings(pageOf(CONFIG_UNI_BODY))
  const server = fakeServer({})
  await adminUniverseSettingsSave(sessionOn(server), {
    form,
    patch: { game_name: 'Updated', game_speed: 3, smtp_pass: 'a&b=c', close_reason: '' },
  })
  const request = server.requests[0]!
  assert.equal(request.method, 'POST')
  assert.equal(request.url.href, CONFIG_UNI_URL)
  const expected = Object.fromEntries(
    Object.entries(form.settings).map(([name, setting]) => [name, setting.value]),
  )
  Object.assign(expected, {
    game_name: 'Updated',
    game_speed: '3',
    smtp_pass: 'a&b=c',
    close_reason: '',
  })
  assert.deepEqual(Object.fromEntries(request.body!), expected)
  assert.equal(request.body!.size, 112)
  assert.equal(form.settings.game_name.value, 'Nova')
  assert.equal(form.settings.smtp_pass.value, '')
})

void test('configuration preserves large integers and decimal strings through submission', async () => {
  const speed = '9007199254740993'
  const charge = '0.125'
  const body = CONFIG_UNI_BODY.replace(
    /<input\b[^>]*name="game_speed"[^>]*>/,
    `<input name="game_speed" value="${speed}">`,
  ).replace(
    /<input\b[^>]*name="trade_charge"[^>]*>/,
    `<input name="trade_charge" value="${charge}">`,
  )
  const form = readAdminUniverseSettings(pageOf(body))
  assert.equal(form.settings.game_speed.value, speed)
  assert.equal(form.settings.trade_charge.value, charge)
  const server = fakeServer({})
  await adminUniverseSettingsSave(sessionOn(server), { form, patch: {} })
  assert.equal(server.requests[0]!.body!.get('game_speed'), speed)
  assert.equal(server.requests[0]!.body!.get('trade_charge'), charge)
})

void test('saving configuration retains the returned page receipt', async () => {
  const form = readAdminUniverseSettings(pageOf(CONFIG_UNI_BODY))
  const saved = await answer(
    (session) => adminUniverseSettingsSave(session, { form, patch: { game_name: 'Nova' } }),
    pageReply(pageHtml(CONFIG_UNI_BODY)),
  )
  assert.deepEqual(saved.data, { kind: 'page' })
})

void test('a refused configuration read retains the server message', async () => {
  const refused = await decode(
    adminUniverseSettings,
    pageReply(pageHtml(adminMessageBody('Permission error!'))),
  )
  assert.deepEqual(refused.data, { kind: 'message', message: 'Permission error!' })
})

type Assert<T extends true> = T
export type CompleteSettings = Assert<
  AdminUniverseSettingsPage['settings'] extends Record<AdminUniverseSettingKey, { value: string }>
    ? true
    : false
>
