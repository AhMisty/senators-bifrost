import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page, Session } from '../../../src/index.ts'
import {
  ErrorCode,
  parsePage,
  readSettings,
  settings,
  settingsAccountDeletion,
  settingsEmail,
  settingsPassword,
  settingsSend,
  settingsUsername,
  settingsVacation,
} from '../../../src/index.ts'
import {
  settingsForm,
  settingsVacationForm,
  settingsVacationTab,
} from '../../fixtures/game/social.ts'
import {
  BASE_URL,
  PLANET_ID,
  decode,
  fakeServer,
  gamePage,
  httpResponse,
  pageHtml,
  pageReply,
  sessionOn,
  settingsPage,
} from '../../helpers.ts'

const SETTINGS_URL = `${BASE_URL}game.php?page=settings`
const SEND_URL = `${BASE_URL}game.php?page=settings&mode=send`
const VACATION_SEND_URL = `${BASE_URL}game.php?page=settings&cp=${PLANET_ID}&mode=send`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: gamePage(body) }, `${SETTINGS_URL}&cp=${PLANET_ID}`))
}

async function submitted(
  run: (session: Session) => Promise<unknown>,
  expectedUrl = SEND_URL,
): Promise<URLSearchParams> {
  const server = fakeServer(pageReply(gamePage('<div class="ally_contents">Saved</div>')))
  await run(sessionOn(server))
  assert.equal(server.requests.length, 1)
  const request = server.requests[0]!
  assert.equal(request.method, 'POST')
  assert.equal(request.url.href, expectedUrl)
  assert.ok(request.body)
  return request.body
}

void test('the preference form is read with every value it states', async () => {
  const observed = await decode((session) => settings(session), pageReply(gamePage(settingsForm)))
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'settings',

    observedAtMs: observed.response.observedAtMs,

    onVacation: false,
    hasLeaveVacationControl: false,
    accountDeletionChecked: true,

    email: 'a@b.example',
    username: 'AhMisty',
    avatarUrl: 'https://images.example/a.png',
    backgroundUrl: '',
    timezone: '60',
    language: 'en',
    planetSort: 2,
    planetOrder: 0,
    theme: 'nsc',
    probeCount: 5,
    fleetActionLimit: 3,
    queueMessagesEnabled: true,
    hideEmptySpyEntries: false,
    blockPrivateMessages: true,
    galaxySpyEnabled: true,
    galaxyMessagesEnabled: true,
    galaxyBuddyRequestsEnabled: false,
    galaxyMissilesEnabled: true,
    adminProtectionEnabled: true,
    choices: {
      timezone: [
        { value: '0', label: 'UTC' },
        { value: '60', label: 'CET' },
      ],
      language: [{ value: 'en', label: 'English' }],
      planetSort: [
        { value: 1, label: 'by name' },
        { value: 2, label: 'by size' },
      ],
      planetOrder: [
        { value: 0, label: 'ascending' },
        { value: 1, label: 'descending' },
      ],
      theme: [{ value: 'nsc', label: 'nsc' }],
    },
  })
})

void test('the vacation form is read as the shorter form of the same page', () => {
  const document = readSettings(pageOf(settingsVacationForm))

  assert.equal(document.onVacation, true)

  assert.equal(document.hasLeaveVacationControl, true)
  assert.equal(document.accountDeletionChecked, true)
  assert.equal('formFields' in document, false)
  assert.equal('timezone' in document, false)
})

void test('a disabled vacation control is not one the account may use', () => {
  const document = readSettings(pageOf(settingsVacationTab))
  assert.equal(document.onVacation, true)
  assert.equal(document.hasLeaveVacationControl, false)

  assert.equal(document.accountDeletionChecked, true)
})

void test('account settings omit navigation context', () => {
  const document = readSettings(
    parsePage(httpResponse({ body: pageHtml(settingsForm) }, SETTINGS_URL)),
  )
  assert.equal('planetId' in document, false)
  assert.equal(document.onVacation, false)
  if (document.onVacation) assert.fail('Expected preferences')
  assert.equal(document.theme, 'nsc')
})

void test('a response that is not the settings form is refused', () => {
  assert.throws(() => readSettings(pageOf('<div>Nothing here</div>')), {
    code: ErrorCode.ParseError,
    message: 'Expected one form[action*="page=settings"], found 0',
  })
})

void test('a preference patch rewrites only the fields it names', async () => {
  const form = readSettings(pageOf(settingsForm))
  if (form.onVacation) assert.fail('Expected preferences')
  const before = structuredClone(form)
  const expected = {
    foto: 'https://images.example/a.png',
    background: '',
    timezone: '60',
    language: 'en',
    planetSort: '2',
    planetOrder: '0',
    theme: 'nsc',
    spycount: '5',
    fleetactions: '3',
    queueMessages: '1',
    spyMessagesMode: '0',
    blockPM: '1',
    galaxySpy: '1',
    galaxyMessage: '1',
    galaxyBuddyList: '0',
    galaxyMissle: '1',
    adminprotection: '1',
    delete: '0',
  }
  assert.deepEqual(
    Object.fromEntries(
      await submitted((session) =>
        settingsSend(session, {
          accountDeletionEnabled: false,

          form,
          patch: { theme: 'dark' },
        }),
      ),
    ),
    { ...expected, theme: 'dark' },
  )

  assert.deepEqual(
    Object.fromEntries(
      await submitted((session) =>
        settingsSend(session, {
          accountDeletionEnabled: false,

          form,
          patch: { probeCount: 9 },
        }),
      ),
    ),
    { ...expected, spycount: '9' },
  )
  assert.deepEqual(form, before)
})

void test('a setting the caller states as undefined is not sent either', async () => {
  const form = settingsPage({ theme: 'nsc' })
  const body = await submitted((session) =>
    settingsSend(session, {
      accountDeletionEnabled: false,

      form,
      patch: { theme: undefined, probeCount: 9 },
    }),
  )
  assert.equal(body.get('theme'), 'nsc')
  assert.equal(body.get('spycount'), '9')
})

void test('a boolean setting travels as the flag the form submits', async () => {
  const form = settingsPage()
  assert.equal(
    (
      await submitted((session) =>
        settingsSend(session, {
          accountDeletionEnabled: false,

          form,
          patch: { queueMessagesEnabled: true },
        }),
      )
    ).get('queueMessages'),
    '1',
  )
  assert.equal(
    (
      await submitted((session) =>
        settingsSend(session, {
          accountDeletionEnabled: false,

          form,
          patch: { queueMessagesEnabled: false },
        }),
      )
    ).get('queueMessages'),
    '0',
  )
})

void test('the vacation form submits only the exit and explicit deletion controls', async () => {
  assert.deepEqual(
    [
      ...(await submitted(
        (session) =>
          settingsVacation(session, {
            accountDeletionEnabled: false,
            planetId: PLANET_ID,
            form: readSettings(pageOf(settingsVacationForm)),
          }),
        VACATION_SEND_URL,
      )),
    ],
    [
      ['delete', '0'],
      ['vacation', '1'],
    ],
  )
})

void test('scheduling and cancelling a deletion is one flag', async () => {
  const on = await submitted((session) =>
    settingsAccountDeletion(session, { form: settingsPage(), enabled: true }),
  )
  assert.equal(on.get('delete'), '1')

  const off = await submitted((session) =>
    settingsAccountDeletion(session, { form: settingsPage(), enabled: false }),
  )
  assert.equal(off.get('delete'), '0')
})

void test('changing the email carries the current password beside it', async () => {
  const body = await submitted((session) =>
    settingsEmail(session, {
      accountDeletionEnabled: false,

      form: settingsPage(),
      email: 'new@example.com',
      password: 'secret',
    }),
  )
  assert.equal(body.get('email'), 'new@example.com')
  assert.equal(body.get('password'), 'secret')
})

void test('changing the password submits it twice, as the form confirms it', async () => {
  const body = await submitted((session) =>
    settingsPassword(session, {
      accountDeletionEnabled: false,

      form: settingsPage(),
      currentPassword: 'secret',
      newPassword: 'better',
    }),
  )
  assert.equal(body.get('password'), 'secret')
  assert.equal(body.get('newpassword'), 'better')
  assert.equal(body.get('newpassword2'), 'better')
})

void test('changing the username preserves the preference model', async () => {
  const body = await submitted((session) =>
    settingsUsername(session, {
      accountDeletionEnabled: false,

      form: settingsPage(),
      username: 'AhMisty',
    }),
  )
  assert.equal(body.get('username'), 'AhMisty')
  assert.equal(body.get('spycount'), '1')
  assert.equal(body.get('fleetactions'), '5')
  assert.equal(body.has('email'), false)
})

void test('the six submissions are one route and six bodies', async () => {
  const writes: readonly [(session: Session) => Promise<unknown>, string][] = [
    [
      (session) =>
        settingsSend(session, {
          accountDeletionEnabled: false,

          form: settingsPage(),
          patch: {},
        }),
      SEND_URL,
    ],
    [
      (session) =>
        settingsVacation(session, {
          accountDeletionEnabled: false,
          planetId: PLANET_ID,
          form: settingsPage(),
        }),
      VACATION_SEND_URL,
    ],
    [
      (session) =>
        settingsAccountDeletion(session, {
          form: settingsPage(),
          enabled: true,
        }),
      SEND_URL,
    ],
    [
      (session) =>
        settingsEmail(session, {
          accountDeletionEnabled: false,

          form: settingsPage(),
          email: 'a@b',
          password: 'p',
        }),
      SEND_URL,
    ],
    [
      (session) =>
        settingsPassword(session, {
          accountDeletionEnabled: false,

          form: settingsPage(),
          currentPassword: 'p',
          newPassword: 'q',
        }),
      SEND_URL,
    ],
    [
      (session) =>
        settingsUsername(session, {
          accountDeletionEnabled: false,

          form: settingsPage(),
          username: 'A',
        }),
      SEND_URL,
    ],
  ]
  const bodies: string[][] = []
  for (const [run, url] of writes) {
    const body = await submitted(run, url)
    assert.equal(body.get('timezone'), 'UTC')
    assert.equal(body.get('fleetactions'), '5')
    bodies.push(
      [...body.keys()].filter((name) =>
        [
          'delete',
          'vacation',
          'email',
          'password',
          'newpassword',
          'newpassword2',
          'username',
        ].includes(name),
      ),
    )
  }
  assert.deepEqual(bodies, [
    ['delete'],
    ['delete', 'vacation'],
    ['delete'],
    ['delete', 'email', 'password'],
    ['delete', 'password', 'newpassword', 'newpassword2'],
    ['delete', 'username'],
  ])
})

void test('every settings shortcut submits the explicit deletion choice over the rendered checkbox', async () => {
  for (const enabled of [false, true]) {
    const submission = {
      planetId: PLANET_ID,
      form: settingsPage({ accountDeletionChecked: !enabled }),
      accountDeletionEnabled: enabled,
    }
    const writes: readonly [(session: Session) => Promise<unknown>, string][] = [
      [(session: Session) => settingsSend(session, { ...submission, patch: {} }), SEND_URL],
      [(session: Session) => settingsVacation(session, submission), VACATION_SEND_URL],
      [
        (session: Session) =>
          settingsEmail(session, { ...submission, email: 'a@b', password: 'p' }),
        SEND_URL,
      ],
      [
        (session: Session) =>
          settingsPassword(session, { ...submission, currentPassword: 'p', newPassword: 'q' }),
        SEND_URL,
      ],
      [(session: Session) => settingsUsername(session, { ...submission, username: 'A' }), SEND_URL],
    ]
    for (const [write, url] of writes)
      assert.equal((await submitted(write, url)).get('delete'), enabled ? '1' : '0')
    assert.equal(submission.form.accountDeletionChecked, !enabled)
  }
})

void test('missing preferences are rejected instead of being decoded as vacation settings', () => {
  for (const name of [
    'email',
    'foto',
    'background',
    'timezone',
    'planetSort',
    'planetOrder',
    'spycount',
    'fleetactions',
    'queueMessages',
    'spyMessagesMode',
    'blockPM',
    'galaxySpy',
    'galaxyMessage',
    'galaxyBuddyList',
    'galaxyMissle',
  ]) {
    const body = settingsForm.replace(
      new RegExp(`<input[^>]*name="${name}"[^>]*>|<select name="${name}">[\\s\\S]*?</select>`),
      '',
    )
    assert.throws(() => readSettings(pageOf(body)), { code: ErrorCode.ParseError }, name)
  }
  assert.throws(() => readSettings(pageOf('<form action="?page=settings"></form>')), {
    code: ErrorCode.ParseError,
  })
  assert.throws(
    () =>
      readSettings(
        pageOf(settingsForm.replace('name="queueMessages"', 'name="queueMessages" disabled')),
      ),
    {
      code: ErrorCode.ParseError,
      message: 'Missing settings field queueMessages',
    },
  )
})

void test('conditional controls may be absent without weakening required preferences', async () => {
  const body = settingsForm
    .replace(/<select name="(?:language|theme)">[\s\S]*?<\/select>/g, '')
    .replace(/<input name="(?:username|adminprotection)"[^>]*>/g, '')
    .replace(
      '<input name="password" type="password">',
      '<input name="password" type="password" value="secret">',
    )
  const form = readSettings(pageOf(body))
  if (form.onVacation) assert.fail('Expected preferences')
  assert.equal(form.language, undefined)
  assert.equal(form.theme, undefined)
  assert.equal(form.adminProtectionEnabled, undefined)
  assert.equal(form.username, undefined)
  assert.equal(form.email, 'a@b.example')
  assert.equal(form.choices.language, undefined)
  assert.equal('formFields' in form, false)
  assert.equal(JSON.stringify(form).includes('secret'), false)
  const sent = await submitted((session) =>
    settingsSend(session, {
      form,
      accountDeletionEnabled: false,
      patch: { probeCount: 8 },
    }),
  )
  assert.equal(sent.get('spycount'), '8')
  assert.equal(sent.get('fleetactions'), '3')
  for (const name of ['language', 'theme', 'adminprotection', 'username', 'email', 'password'])
    assert.equal(sent.has(name), false)
})

void test('vacation account deletion has no preference fields', async () => {
  const body = await submitted((session) =>
    settingsAccountDeletion(session, {
      form: readSettings(pageOf(settingsVacationTab)),
      enabled: true,
    }),
  )
  assert.deepEqual([...body], [['delete', '1']])
})
