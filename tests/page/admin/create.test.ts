import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  adminCreate,
  adminCreateMoon,
  adminCreatePlanet,
  adminCreateUser,
  parsePage,
  readAdminCreate,
} from '../../../src/index.ts'
import {
  ADMIN_CREATE_MENU_BODY,
  ADMIN_CREATE_MOON_BODY,
  ADMIN_CREATE_PLANET_BODY,
  ADMIN_CREATE_USER_BODY,
} from '../../fixtures/admin/index.ts'
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

const CREATE_URL = `${BASE_URL}admin.php?page=create`

const EMPTY_FIELD = { type: 'text', value: '', checked: false, options: [] }

void test('the menu offers the three forms, and renders none of them', async () => {
  const page = await read(adminCreate, pageReply(pageHtml(ADMIN_CREATE_MENU_BODY)))
  assert.deepEqual(page.offered, [
    { kind: 'user', title: 'cr_header_user' },
    { kind: 'planet', title: 'cr_header_planet' },
    { kind: 'moon', title: 'cr_header_moon' },
  ])
  assert.equal(page.form, 'menu')
  assert.deepEqual(page.fields, [])

  assert.deepEqual(
    page.offered.map((card) => card.title),
    ['cr_header_user', 'cr_header_planet', 'cr_header_moon'],
  )
  assert.equal(page.kind, 'adminCreate')

  assert.equal('planetId' in page, false)

  assert.ok(page.observedAtMs > 0)
  await expectOperation(adminCreate, { url: CREATE_URL })
})

void test('naming a form is what asks for it, and the menu is what no name asks for', async () => {
  for (const [kind, query] of [
    ['user', 'class=user'],
    ['planet', 'class=planet'],
    ['moon', 'class=moon'],
  ] as const)
    await expectOperation((session) => adminCreate(session, { kind }), {
      url: `${BASE_URL}admin.php?${query}&page=create`,
    })
})

void test('the registration form is the one that repeats the password', async () => {
  const page = await read(adminCreate, pageReply(pageHtml(ADMIN_CREATE_USER_BODY)))
  assert.equal(page.form, 'user')
  assert.deepEqual(page.offered, [])
  assert.deepEqual(
    page.fields.map((field) => field.name),
    [
      'name',
      'password',
      'password2',
      'email',
      'email2',
      'authlevel',
      'lang',
      'galaxy',
      'system',
      'planet',
    ],
  )

  assert.deepEqual(
    page.fields.filter((field) => field.type === 'select'),
    [
      {
        name: 'authlevel',
        type: 'select',
        value: '1',
        checked: false,
        options: [
          { value: '1', label: '1' },
          { value: '3', label: '3' },
        ],
      },
      {
        name: 'lang',
        type: 'select',
        value: 'en',
        checked: false,
        options: [
          { value: 'en', label: 'English' },
          { value: 'de', label: 'German' },
        ],
      },
    ],
  )
  assert.deepEqual(page.fields[0], { name: 'name', ...EMPTY_FIELD })
})

void test('the moon form is the one that names the planet it builds on', async () => {
  const page = await read(adminCreate, pageReply(pageHtml(ADMIN_CREATE_MOON_BODY)))
  assert.equal(page.form, 'moon')
  assert.deepEqual(
    page.fields.map((field) => field.name),
    ['class', 'add_moon', 'name', 'diameter', 'diameter_check', 'field_max'],
  )

  assert.deepEqual(page.fields[4], {
    name: 'diameter_check',
    type: 'checkbox',
    value: 'on',
    checked: true,
    options: [],
  })
})

void test('the world form is whichever of the three remains', async () => {
  const page = await read(adminCreate, pageReply(pageHtml(ADMIN_CREATE_PLANET_BODY)))
  assert.equal(page.form, 'planet')
  assert.deepEqual(
    page.fields.map((field) => field.name),
    ['class', 'id', 'galaxy', 'system', 'planet', 'name', 'field_max'],
  )
})

void test('the menu decoder is the published one the page function is built on', () => {
  const page = parsePage(httpResponse({ body: pageHtml(ADMIN_CREATE_MENU_BODY) }, CREATE_URL))
  const decoded = readAdminCreate(page)
  assert.deepEqual(decoded.offered, [
    { kind: 'user', title: 'cr_header_user' },
    { kind: 'planet', title: 'cr_header_planet' },
    { kind: 'moon', title: 'cr_header_moon' },
  ])
  assert.equal(decoded.form, 'menu')
  assert.equal('planetId' in decoded, false)
})

void test('an account is created under the fields of its form', async () => {
  await expectOperation(
    (session) =>
      adminCreateUser(session, {
        draft: {
          name: 'Newcomer',
          password: 'secret1',
          email: 'new@example.com',
          level: 3,
          language: 'de',
          coordinate: { galaxy: 1, system: 2, planet: 3 },
        },
      }),
    {
      method: 'POST',
      url: `${BASE_URL}admin.php?class=user&page=create`,
      body: [
        ['name', 'Newcomer'],
        ['password', 'secret1'],
        ['password2', 'secret1'],
        ['email', 'new@example.com'],
        ['email2', 'new@example.com'],
        ['authlevel', '3'],
        ['lang', 'de'],
        ['galaxy', '1'],
        ['system', '2'],
        ['planet', '3'],
      ],
    },
  )
})

void test('a world is created under the fields of its form, the optional one included', async () => {
  await expectOperation(
    (session) =>
      adminCreatePlanet(session, {
        draft: { playerId: 42, coordinate: { galaxy: 1, system: 2, planet: 3 }, fields: 0 },
      }),
    {
      method: 'POST',
      url: `${BASE_URL}admin.php?class=planet&page=create`,
      body: [
        ['id', '42'],
        ['galaxy', '1'],
        ['system', '2'],
        ['planet', '3'],

        ['field_max', '0'],
      ],
    },
  )
  await expectOperation(
    (session) =>
      adminCreatePlanet(session, {
        draft: {
          playerId: 42,
          coordinate: { galaxy: 1, system: 2, planet: 3 },
          name: 'Nova',
          fields: 163,
        },
      }),
    {
      method: 'POST',
      url: `${BASE_URL}admin.php?class=planet&page=create`,
      body: [
        ['id', '42'],
        ['galaxy', '1'],
        ['system', '2'],
        ['planet', '3'],
        ['name', 'Nova'],
        ['field_max', '163'],
      ],
    },
  )
})

void test('a moon a draft names no diameter for asks the server to roll one', async () => {
  await expectOperation((session) => adminCreateMoon(session, { draft: { planetId: 7 } }), {
    method: 'POST',
    url: `${BASE_URL}admin.php?class=moon&page=create`,
    body: [
      ['add_moon', '7'],
      ['diameter_check', 'on'],
    ],
  })
})

void test('a moon a draft names a diameter for sends that instead', async () => {
  await expectOperation(
    (session) => adminCreateMoon(session, { draft: { planetId: 7, name: 'Luna', diameter: 4000 } }),
    {
      method: 'POST',
      url: `${BASE_URL}admin.php?class=moon&page=create`,
      body: [
        ['add_moon', '7'],
        ['name', 'Luna'],
        ['diameter', '4000'],
      ],
    },
  )
})

void test('the sentence the page answers a creation with is reported as it stands', async () => {
  const server = fakeServer(
    pageReply(
      pageHtml(
        '<main role="main"><div class="card mb-3"><h5 class="card-header">fcm_info</h5>' +
          '<div class="card-body"><p class="card-text">The account was created.</p></div></div></main>',
      ),
    ),
  )
  const observed = await adminCreateUser(sessionOn(server), {
    draft: {
      name: 'Newcomer',
      password: 'secret1',
      email: 'new@example.com',
      level: 1,
      language: 'en',
      coordinate: { galaxy: 1, system: 2, planet: 3 },
    },
  })
  assert.deepEqual(observed.data, { kind: 'message', message: 'The account was created.' })
})

void test('a player session raises the administrative-access failure', async () => {
  const server = fakeServer({ status: 302, headers: { Location: './game.php' } })
  await assert.rejects(adminCreate(sessionOn(server)), {
    code: 'server',
    serverCode: 'admin-authentication',
  })
})
