import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ErrorCode, adminReset, adminResetUniverse } from '../../../src/index.ts'
import { RESET_CONTROLS, adminNoticeCard, adminResetForm } from '../../fixtures/admin/index.ts'
import {
  BASE_URL,
  expectOperation,
  fakeServer,
  pageHtml,
  pageReply,
  read,
  sessionOn,
} from '../../helpers.ts'

const RESET_URL = `${BASE_URL}admin.php?page=reset`

const TARGETS = [
  'players',
  'planets',
  'moons',
  'defenses',
  'ships',
  'h_d',
  'edif_p',
  'edif_l',
  'edif',
  'ofis',
  'inves',
  'inves_c',
  'dark',
  'resources',
  'notes',
  'rw',
  'friends',
  'alliances',
  'fleets',
  'banneds',
  'messages',
  'statpoints',
]

void test('every reset the form offers is reported with its own control name and label', async () => {
  const body = adminResetForm()
  const page = await read(adminReset, pageReply(pageHtml(body)))
  assert.deepEqual(
    page.targets.map((target) => target.value),
    TARGETS,
  )
  assert.deepEqual(
    page.targets.map((target) => target.label),
    RESET_CONTROLS.filter(([name]) => TARGETS.includes(name)).map(([, label]) => label),
  )
  assert.equal(page.kind, 'adminReset')

  assert.equal('planetId' in page, false)

  assert.ok(page.observedAtMs > 0)
})

void test('the form is asked for at the address that names the page', async () => {
  await expectOperation(adminReset, { url: RESET_URL })
})

void test('the controls the class never reads are not resets', async () => {
  const page = await read(adminReset, pageReply(pageHtml(adminResetForm())))

  const offered = new Set<string>(page.targets.map((target) => target.value))
  assert.equal(offered.has('errors'), false)
  assert.equal(offered.has('resetall'), false)
})

void test('a form that offers fewer resets reports what it offers', async () => {
  const body = adminResetForm([
    ['players', 're_reset_player'],
    ['moons', 're_reset_moons'],
  ])
  const page = await read(adminReset, pageReply(pageHtml(body)))
  assert.deepEqual(page.targets, [
    { value: 'players', label: 're_reset_player' },
    { value: 'moons', label: 're_reset_moons' },
  ])
})

void test('a form that offers none reports none, rather than the controls it carries', async () => {
  const body = adminResetForm([['resetall', 're_reset_all']])
  const page = await read(adminReset, pageReply(pageHtml(body)))
  assert.deepEqual(page.targets, [])
})

void test('a page that carries no form, or two, is a decoding failure', async () => {
  await assert.rejects(() => read(adminReset, pageReply(pageHtml('<p>nothing</p>'))), {
    code: ErrorCode.ParseError,
    message: 'Expected one form, found 0',
  })
  const two = adminResetForm().replace('<main role="main"', '<form></form><main role="main"')
  await assert.rejects(() => read(adminReset, pageReply(pageHtml(two))), {
    code: ErrorCode.ParseError,
    message: 'Expected one form, found 2',
  })
})

void test('applying resets sends each one under its own name, in the order they were named', async () => {
  await expectOperation(
    (session) => adminResetUniverse(session, { targets: ['moons', 'players'] }),
    {
      method: 'POST',
      url: RESET_URL,
      body: [
        ['moons', 'on'],
        ['players', 'on'],
      ],
    },
  )
})

void test('applying no resets sends an empty form rather than nothing at all', async () => {
  await expectOperation((session) => adminResetUniverse(session, { targets: [] }), {
    method: 'POST',
    url: RESET_URL,
    body: [],
  })
})

void test('the caller’s own parameters ride on the submission', async () => {
  await expectOperation((session) => adminResetUniverse(session, { targets: [] }), {
    method: 'POST',
    url: `${BASE_URL}admin.php?page=reset`,
    body: [],
  })
})

void test('the message the page answers a reset with is reported as it stands', async () => {
  const server = fakeServer(pageReply(pageHtml(adminNoticeCard('Universe reset'))))
  const observed = await adminResetUniverse(sessionOn(server), { targets: ['players'] })
  assert.deepEqual(observed.data, { kind: 'message', message: 'Universe reset' })
})

void test('a form the server refuses to render comes back as the receipt it answered with', async () => {
  const server = fakeServer({ status: 302, headers: { Location: './index.php?page=login' } })
  const observed = await adminReset(sessionOn(server))
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}index.php?page=login`),
  })
})
