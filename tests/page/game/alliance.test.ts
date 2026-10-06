import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  AlliancePage,
  AllianceAdminOverviewPage,
  AllianceTextKind,
  Observed,
  Page,
  PageReply,
  Session,
} from '../../../src/index.ts'
import {
  ErrorCode,
  OperationError,
  acceptAllianceDiplomacy,
  alliance,
  allianceAdminDetailApply,
  allianceAdminDiplomacy,
  allianceAdminDiplomacyCreate,
  allianceAdminManageApply,
  allianceAdminMembers,
  allianceAdminOverview,
  allianceAdminPermissions,
  allianceAdminTransfer,
  allianceApply,
  allianceCircular,
  allianceCreate,
  allianceDevelopment,
  allianceInfo,
  allianceIssue,
  allianceMemberList,
  allianceDeposit,
  depositAllianceResources,
  allianceStorage,
  allianceWithdrawal,
  withdrawAllianceResources,
  answerAllianceApplication,
  cancelAllianceApplication,
  changeAllianceRank,
  createAlliance,
  createAllianceDiplomacy,
  deleteAllianceDiplomacy,
  dissolveAlliance,
  distributeAllianceResources,
  kickAllianceMember,
  leaveAlliance,
  parsePage,
  readAlliance,
  readAllianceAdminDetailApply,
  readAllianceAdminManageApply,
  readAllianceAdminDiplomacy,
  readAllianceAdminDiplomacyCreate,
  readAllianceAdminMembers,
  readAllianceAdminOverview,
  readAllianceAdminPermissions,
  readAllianceAdminTransfer,
  readAllianceApply,
  readAllianceCircular,
  readAllianceCreate,
  readAllianceDevelopment,
  readAllianceInfo,
  readAllianceIssue,
  readAllianceMemberList,
  readAllianceDeposit,
  readAllianceStorage,
  readAllianceWithdrawal,
  sendAllianceCircular,
  setAllianceMemberRank,
  submitAllianceApplication,
  transferAllianceLeadership,
  updateAllianceSettings,
  upgradeAllianceDevelopment,
} from '../../../src/index.ts'
import * as published from '../../../src/index.ts'
import {
  allianceApplicationAnswerButton,
  allianceApplicationAnswerWithoutValue,
  allianceApplicationBody,
  allianceApplyWaitBody,
  allianceApplicationsBody,
  allianceApplicationsWithoutLinkBody,
  allianceCreateSelectionBody,
  allianceDevelopmentBody,
  allianceDevelopmentDisabledControl,
  allianceDevelopmentLevelLabel,
  allianceDevelopmentLevelLabelWithoutFigures,
  allianceDevelopmentRequirement,
  allianceDevelopmentWithoutMaximumLevelBody,
  allianceDiplomacyBody,
  allianceDiplomacyOptionsBody,
  allianceDiplomacyWithoutIdBody,
  allianceAdminMembersBody,
  allianceAdminMembersScoredBody,
  allianceDistributionBody,
  allianceHomeBody,
  allianceInfoBody,
  allianceMemberListBody,
  allianceOfferWithoutTraderBody,
  allianceDepositBody,
  allianceRanksBody,
  allianceSettingsBody,
  allianceStorageBody,
  allianceStorageWithoutBalanceBody,
  allianceWithdrawalBody,
  allianceWithoutStateBody,
  contentPage,
  developmentEntry,
} from '../../fixtures/game/alliance.ts'
import type { Reply } from '../../helpers.ts'
import {
  BASE_URL,
  PLANET_ID,
  allianceSettingsPage,
  answer,
  decode,
  expectOperation,
  fakeServer,
  gamePage,
  httpResponse,
  pageHtml,
  pageReply,
  read,
  sessionOn,
} from '../../helpers.ts'

const SHOW_URL = `${BASE_URL}game.php?page=alliance`

const OVERVIEW_URL = `${BASE_URL}game.php?textMode=external&action=overview&page=alliance&mode=admin`

function pageOf(body: string, url = SHOW_URL): Page {
  return parsePage(httpResponse({ body: gamePage(body) }, url))
}

function barePageOf(body: string, url = SHOW_URL): Page {
  return parsePage(
    httpResponse(
      { body: pageHtml(`<div id="content"><div id="ally_content">${body}</div></div>`) },
      url,
    ),
  )
}

function cataloguePage(body: string): Page {
  return parsePage(httpResponse({ body: pageHtml(contentPage(body)) }))
}

function settingsForm(textKind: AllianceTextKind = 'external'): AllianceAdminOverviewPage {
  return readAllianceAdminOverview(pageOf(allianceSettingsBody, OVERVIEW_URL), textKind)
}

async function submitted(run: (session: Session) => Promise<unknown>): Promise<URLSearchParams> {
  const server = fakeServer({})
  await run(sessionOn(server)).catch((error: unknown) => {
    if (!(error instanceof OperationError)) throw error
  })
  assert.equal(server.requests.length, 1, 'expected exactly one request')
  return server.requests[0]!.body ?? new URLSearchParams()
}

const STORAGE_CONTROLS = [
  '<div class="alleanza45">',
  '<div class="ally_contents">',

  '<div class="card-text"><a href="?page=alliance&amp;mode=put">Deposit</a></div>',
  '<div class="alleanza36"><a href="?page=alliance&amp;mode=vlyat">Withdraw</a></div>',

  '<div><a href="?page=alliance&amp;mode=issue">Distribute</a></div>',
  '</div>',
  '</div>',
].join('')

const APPLY_FORM =
  '<form action="game.php?page=alliance&amp;mode=apply&amp;id=7" method="post">' +
  '<textarea name="text">Answer this</textarea></form>'

const CREATE_FORM =
  '<form action="game.php?page=alliance&amp;mode=create" method="post">' +
  '<input name="atag" value=""><input name="aname" value=""></form>'

const CIRCULAR_FORM =
  '<select name="rankID"><option value="0">All members</option>' +
  '<option value="3" selected="selected">Leader</option></select>'

const TRANSFER_FORM =
  '<select name="newleader"><option value="4242">AhMisty [Leader]</option>' +
  '<option value="4243">Nova [Member]</option></select>'

function applicationForm(control: string): string {
  return (
    '<form action="game.php?page=alliance&amp;mode=admin&amp;action=sendAnswerToApply&amp;id=9" method="post">' +
    `${control}</form>`
  )
}

function permissionRow(checkbox: string): Page {
  return pageOf(
    '<div id="new_alliance_rank"><table><tr>' +
      '<td><img src="img/iconav/admin.png" alt="ADMIN"></td>' +
      `<td>${checkbox}</td></tr></table></div>`,
  )
}

const EXPORTS = [
  'acceptAllianceDiplomacy',
  'alliance',
  'allianceActions',
  'allianceAdminDetailApply',
  'allianceAdminDiplomacy',
  'allianceAdminDiplomacyCreate',
  'allianceAdminManageApply',
  'allianceAdminMembers',
  'allianceAdminOverview',
  'allianceAdminPermissions',
  'allianceAdminTransfer',
  'allianceApply',
  'allianceCircular',
  'allianceCreate',
  'allianceDevelopment',
  'allianceInfo',
  'allianceIssue',
  'allianceMemberList',
  'allianceDeposit',
  'depositAllianceResources',
  'allianceStorage',
  'allianceWithdrawal',
  'withdrawAllianceResources',
  'answerAllianceApplication',
  'cancelAllianceApplication',
  'changeAllianceRank',
  'createAlliance',
  'createAllianceDiplomacy',
  'deleteAllianceDiplomacy',
  'dissolveAlliance',
  'distributeAllianceResources',
  'kickAllianceMember',
  'leaveAlliance',
  'readAlliance',
  'readAllianceAdminDetailApply',
  'readAllianceAdminManageApply',
  'readAllianceAdminDiplomacy',
  'readAllianceAdminDiplomacyCreate',
  'readAllianceAdminMembers',
  'readAllianceAdminOverview',
  'readAllianceAdminPermissions',
  'readAllianceAdminTransfer',
  'readAllianceApply',
  'readAllianceCircular',
  'readAllianceCreate',
  'readAllianceDevelopment',
  'readAllianceInfo',
  'readAllianceIssue',
  'readAllianceMemberList',
  'readAllianceDeposit',
  'readAllianceStorage',
  'readAllianceWithdrawal',
  'sendAllianceCircular',
  'setAllianceMemberRank',
  'submitAllianceApplication',
  'transferAllianceLeadership',
  'updateAllianceSettings',
  'upgradeAllianceDevelopment',
] as const

void test('every member the alliance page publishes is named here', () => {
  const members: Record<string, unknown> = { ...published }
  const foreign = new Set(['allianceTextMode'])
  const allied = Object.keys(members)
    .filter((name) => /[Aa]lliance/.test(name) && !foreign.has(name))
    .toSorted()
  assert.deepEqual(allied, [...EXPORTS].toSorted())
  for (const name of allied) assert.equal(typeof members[name], 'function', name)
})

void test('the alliance home is a membership: its rank line, its sections and its controls', () => {
  const document = readAlliance(pageOf(allianceHomeBody))
  assert.equal(document.state, 'member')
  assert.equal(document.title, 'Nova [NOVA]')
  assert.equal(document.membershipText, 'Nova [NOVA] 12 Members of 50')
  assert.equal(document.rankText, 'Rank: Leader')
  assert.deepEqual(
    document.sections.map(({ title, text }) => [title, text]),
    [
      ['Inside section', 'Members only'],
      ['Events', 'No events'],
      ['Inside section', 'A peaceful alliance.'],
      ['Fight stats', 'Total fights 20'],
      ['Diplomacy', 'No pacts'],
    ],
  )
  assert.deepEqual(
    document.actions.map(({ mode, action, id, href }) => [mode, action, id, new URL(href).search]),
    [
      ['admin', null, null, '?page=alliance&mode=admin'],
      ['memberList', null, null, '?page=alliance&mode=memberList'],
      ['close', null, null, '?page=alliance&mode=close'],
      ['circular', null, null, '?page=alliance&mode=circular'],
      ['development', null, null, '?page=alliance&mode=development'],
      ['storage', null, null, '?page=alliance&mode=storage'],
      ['admin', 'diplomacy', null, '?page=alliance&mode=admin&action=diplomacy'],
    ],
  )
})

void test('the waiting screen and the creation selector are the other two states', () => {
  const pending = readAlliance(pageOf(allianceApplyWaitBody))
  assert.equal(pending.state, 'application-pending')
  assert.deepEqual([pending.title, pending.rankText, pending.sections], ['Your request', '', []])
  assert.deepEqual(
    pending.actions.map((item) => item.mode),
    ['cancelApply'],
  )
  const free = readAlliance(pageOf(allianceCreateSelectionBody))
  assert.equal(free.state, 'unaffiliated')
  assert.deepEqual([free.title, free.rankText, free.sections], ['Alliance', '', []])
  assert.deepEqual(
    free.actions.map((item) => item.mode),
    ['create'],
  )
})

void test('a document that is none of the three, or two of them at once, cannot be read', () => {
  assert.throws(() => readAlliance(pageOf(allianceWithoutStateBody)), {
    code: ErrorCode.ParseError,
    message: 'Unknown alliance state',
  })
  const two = pageOf(
    '<div class="gray_flettab">Alliance<div class="position">Rank: Leader</div>' +
      '<a href="?page=alliance&amp;mode=create">Found an alliance</a></div>',
  )
  assert.throws(() => readAlliance(two), {
    code: ErrorCode.ParseError,
    message: 'Unknown alliance state',
  })
})

void test('account alliance documents omit navigation context in full pages and popups', () => {
  assert.equal('planetId' in readAlliance(pageOf(allianceHomeBody)), false)
  assert.equal('planetId' in readAlliance(barePageOf(allianceHomeBody)), false)
  assert.equal('planetId' in readAllianceInfo(pageOf(allianceInfoBody, `${SHOW_URL}&id=7`)), false)
  assert.equal(
    'planetId' in readAllianceInfo(barePageOf(allianceInfoBody, `${SHOW_URL}&id=7`)),
    false,
  )
})

void test('only the addresses of this page count as its controls', () => {
  const document = readAlliance(
    pageOf(
      [
        '<div class="gray_flettab">Alliance<div class="position">Rank: Leader</div>',
        '<a href="https://other.example.com/play/game.php?page=alliance">Elsewhere</a>',
        '<a href="other.php?page=alliance">Another script</a>',
        '<a href="?page=statistics">Statistics</a>',
        '<a href="?page=alliance&amp;mode=admin">Manage alliance</a>',
        '</div>',
        STORAGE_CONTROLS,
      ].join(''),
    ),
  )
  assert.deepEqual(
    document.actions.map((item) => item.mode),
    ['admin', 'issue'],
  )
})

void test('a card the server rendered without a text is not a section', () => {
  const document = readAlliance(
    pageOf(
      [
        '<div class="gray_flettab"><div class="position">Rank: Leader</div></div>',
        '<div class="card-body"><p class="card-title">Inside section</p></div>',
        '<div class="card-body"><p class="card-title">Events</p>',
        '<p class="card-text">No events</p></div>',
      ].join(''),
    ),
  )
  assert.deepEqual(document.sections, [{ title: 'Events', text: 'No events' }])
})

void test('the public page of one alliance is read for the id the request named', () => {
  const document = readAllianceInfo(pageOf(allianceInfoBody, `${SHOW_URL}&id=7`))
  assert.equal(document.allianceId, 7)
  assert.equal(document.title, 'Nova [NOVA]')
  assert.equal(document.membershipText, 'Nova [NOVA] 12 Members of 50')

  assert.deepEqual(
    document.sections.map(({ title, text }) => [title, text]),
    [
      ['', 'A peaceful alliance.'],
      ['Fight stats', 'Total fights 20'],
    ],
  )
  assert.deepEqual(document.actions, [
    {
      mode: 'apply',
      action: null,
      id: '7',
      href: `${BASE_URL}game.php?page=alliance&mode=apply&id=7`,
    },
  ])
})

void test('a document without the alliance card is not an alliance page', () => {
  assert.throws(() => readAllianceInfo(pageOf(allianceWithoutStateBody, `${SHOW_URL}&id=7`)), {
    code: ErrorCode.ParseError,
    message: 'Missing alliance designation',
  })
})

void test('the application form names the alliance it applies to and renders its own text', () => {
  const document = readAllianceApply(pageOf(APPLY_FORM, `${SHOW_URL}&mode=apply`))
  assert.equal(document.allianceId, 7)
  assert.equal(document.text, 'Answer this')
})

void test('the founding form confirms access without exposing empty request fields', () => {
  const document = readAllianceCreate(pageOf(CREATE_FORM, `${SHOW_URL}&mode=create`))
  assert.deepEqual(document, { kind: 'allianceCreate', observedAtMs: document.observedAtMs })
})

void test('the member list reads each row from the columns both tables render alike', () => {
  const document = readAllianceMemberList(pageOf(allianceMemberListBody))
  assert.deepEqual(document.members, [
    {
      id: 4242,
      name: 'AhMisty',
      joinedAtText: '01.01.2026',
      activityText: '15 min',

      rankName: 'Leader',
      points: 1234,
      coordinate: { galaxy: 1, system: 2, planet: 3 },
    },
    {
      id: null,
      name: 'Plain Member',
      joinedAtText: '02.01.2026',
      activityText: '-',
      rankName: 'Member',
      points: 10,
      coordinate: { galaxy: 1, system: 2, planet: 4 },
    },
  ])
})

void test('the circular form lists the ranks the endpoint built for its selector', () => {
  const document = readAllianceCircular(pageOf(CIRCULAR_FORM, `${SHOW_URL}&mode=circular`))
  assert.deepEqual(document.recipients, [
    { value: 0, label: 'All members' },
    { value: 3, label: 'Leader' },
  ])
})

void test('the storage page reads one balance per row and only the controls it offers', () => {
  const document = readAllianceStorage(pageOf(allianceStorageBody))
  assert.deepEqual(
    [...document.resources],
    [
      [901, 1000],
      [902, 500],
    ],
  )

  assert.deepEqual(
    document.actions.map(({ mode, href }) => [mode, new URL(href).search]),
    [
      ['issue', '?page=alliance&mode=issue'],
      ['put', '?page=alliance&mode=put'],
    ],
  )
})

void test('a page without a balance is a viewer without a storage, not an empty one', () => {
  assert.throws(() => readAllianceStorage(pageOf(allianceStorageWithoutBalanceBody)), {
    code: ErrorCode.ParseError,
    message: 'Alliance storage is unavailable',
  })

  const unnamed = pageOf(
    '<div class="ally_contents sepor_conten res_none"><div class="res_count">1.000</div></div>',
  )
  assert.throws(() => readAllianceStorage(unnamed), {
    code: ErrorCode.ParseError,
    message: 'Expected a numeric value',
  })
})

void test('both transfer forms read the same offer, and only their kind differs', () => {
  const deposit = readAllianceDeposit(pageOf(allianceDepositBody))
  assert.equal(deposit.kind, 'allianceDeposit')
  assert.deepEqual(deposit.resourceIds, [901, 902, 903])
  assert.equal(deposit.maximumTotal, 1000)
  const withdrawal = readAllianceWithdrawal(pageOf(allianceWithdrawalBody))
  assert.equal(withdrawal.kind, 'allianceWithdrawal')
  assert.deepEqual(withdrawal.resourceIds, [901])
  assert.equal(withdrawal.maximumTotal, 750)
})

void test('a document without the transfer form cannot be read as one', () => {
  assert.throws(() => readAllianceDeposit(pageOf(allianceOfferWithoutTraderBody)), {
    code: ErrorCode.ParseError,
    message: 'Expected one form#trader, found 0',
  })
})

void test('the distribution form lists the planets it may hand resources to and their balances', () => {
  const document = readAllianceIssue(pageOf(allianceDistributionBody))
  assert.deepEqual(document.destinations, [{ planetId: 2001, player: 'Nova (AhMisty)' }])

  assert.deepEqual(
    [...document.resources],
    [
      [901, 1000],
      [902, 500],
    ],
  )
})

void test('every alliance technology is read from its own box', () => {
  const document = readAllianceDevelopment(cataloguePage(allianceDevelopmentBody))
  assert.equal('planetId' in document, false)
  assert.deepEqual(document.items, [
    {
      elementId: 2501,
      name: 'Class A weaponry',
      owned: 2,
      maximumLevel: 1000,
      maximumPurchase: 1000,
      hasSubmitControl: true,
      isSelected: null,
      remainingSeconds: null,
      costs: [{ resourceId: 923, amount: 1 }],
      costText: 'Stardust: 1',
      effects: [
        { name: 'attack on attack', amount: 1, unit: 'percent' },
        { name: 'defence on attack', amount: 1, unit: 'percent' },
        { name: 'shield on attack', amount: 1, unit: 'percent' },
      ],
      requirements: [],
    },
    {
      elementId: 2502,
      name: 'Class A Defense',
      owned: 0,
      maximumLevel: 1000,
      maximumPurchase: null,
      hasSubmitControl: false,
      isSelected: null,
      remainingSeconds: null,
      costs: [],
      costText: 'Not enough resources',
      effects: [],

      requirements: [{ elementId: 2501, name: 'Class A weaponry', progress: '1/2' }],
    },
  ])
})

void test('a technology the page rendered disabled submits nothing', () => {
  const document = readAllianceDevelopment(
    cataloguePage(
      developmentEntry({
        head: allianceDevelopmentLevelLabel,
        control: allianceDevelopmentDisabledControl,
      }),
    ),
  )
  assert.deepEqual(
    document.items.map(({ elementId, hasSubmitControl }) => [elementId, hasSubmitControl]),
    [[2501, false]],
  )
})

void test('a level label the page rendered unreadably is a failure rather than a lost level', () => {
  assert.throws(
    () =>
      readAllianceDevelopment(
        cataloguePage(
          developmentEntry({
            head: allianceDevelopmentLevelLabelWithoutFigures,
            control: allianceDevelopmentDisabledControl,
          }),
        ),
      ),
    { code: ErrorCode.ParseError, message: 'Invalid level label' },
  )
})

void test('what a technology states unreadably is read as the page left it, not refused', () => {
  const [uncapped] = readAllianceDevelopment(
    cataloguePage(allianceDevelopmentWithoutMaximumLevelBody),
  ).items
  assert.equal(uncapped?.elementId, 2501)
  assert.equal(uncapped?.owned, 2)
  assert.equal(uncapped?.maximumLevel, null)
  const [required] = readAllianceDevelopment(
    cataloguePage(
      developmentEntry({
        head: allianceDevelopmentLevelLabel,
        requirement: allianceDevelopmentRequirement,
      }),
    ),
  ).items
  assert.deepEqual(required?.requirements, [
    { elementId: null, name: 'Class A weaponry', progress: '1/2' },
  ])
})

void test('the management overview reads every setting from its own field', () => {
  const form = settingsForm()
  assert.deepEqual(
    [
      form.tag,
      form.name,
      form.ownerRankName,
      form.websiteUrl,
      form.imageUrl,
      form.maximumMembers,
      form.minimumApplicationPoints,
      form.text,
      form.eventMissions,
    ],
    ['ALLY', 'The Alliance', 'Leader', '', '', 50, 1000, 'Apply here', [1]],
  )
  assert.deepEqual(
    [form.applicationsClosed, form.showStatistics, form.showDiplomacy],
    [false, true, false],
  )
  assert.deepEqual(form.choices.applicationsClosed, [
    { value: false, label: 'open' },
    { value: true, label: 'closed' },
  ])
  assert.deepEqual(form.choices.showStatistics, [{ value: true, label: 'shown' }])
  assert.deepEqual(form.choices.showDiplomacy, [{ value: false, label: 'hidden' }])
  assert.deepEqual(form.choices.eventMissions, [
    { value: 1, label: 'Attack' },
    { value: 2, label: 'Transport' },
  ])
})

void test('blank numeric alliance settings remain null and are preserved on submission', async () => {
  const body = allianceSettingsBody
    .replace('name="ally_max_members" value="50"', 'name="ally_max_members" value=""')
    .replace('name="request_min_points" value="1000"', 'name="request_min_points" value=""')
  const form = readAllianceAdminOverview(pageOf(body, OVERVIEW_URL), 'external')
  assert.equal(form.maximumMembers, null)
  assert.equal(form.minimumApplicationPoints, null)
  const sent = await submitted((session) =>
    updateAllianceSettings(session, {
      form,
      patch: { tag: 'NEW' },
    }),
  )
  assert.equal(sent.get('ally_max_members'), '')
  assert.equal(sent.get('request_min_points'), '')
})

void test('writing the settings replaces a patched field rather than extending the form', async () => {
  const body = await submitted(async (session) => {
    await updateAllianceSettings(session, {
      form: settingsForm('internal'),
      patch: { tag: 'NEW' },
    })
  })
  assert.deepEqual(
    [...body].toSorted(([left], [right]) => left.localeCompare(right)),
    [
      ['send', '1'],
      ['textMode', 'internal'],
      ['ally_name', 'The Alliance'],
      ['owner_range', 'Leader'],
      ['web', ''],
      ['image', ''],
      ['request_notallow', '0'],
      ['ally_max_members', '50'],
      ['request_min_points', '1000'],
      ['stats', '1'],
      ['diplo', '0'],
      ['events[]', '1'],
      ['text', 'Apply here'],
      ['ally_tag', 'NEW'],
    ].toSorted(([left], [right]) => left!.localeCompare(right!)),
  )
})

void test('a multi-valued setting is replaced whole, not grown by the patch', async () => {
  const body = await submitted(async (session) => {
    await updateAllianceSettings(session, {
      form: allianceSettingsPage({ tag: 'OLD', eventMissions: [1], textKind: 'application' }),
      patch: { tag: 'NEW', eventMissions: [3, 4] },
    })
  })

  assert.equal(body.get('textMode'), 'apply')
  assert.equal(body.get('ally_tag'), 'NEW')
  assert.deepEqual(body.getAll('events[]'), ['3', '4'])
})

void test('a settings form missing a required field is rejected before it can be submitted', () => {
  for (const name of [
    'ally_tag',
    'ally_name',
    'owner_range',
    'web',
    'image',
    'request_notallow',
    'ally_max_members',
    'request_min_points',
    'stats',
    'diplo',
    'text',
    'events[]',
  ]) {
    const body = allianceSettingsBody.replaceAll(`name="${name}"`, 'name="unrelated"')
    assert.throws(
      () => readAllianceAdminOverview(pageOf(body, OVERVIEW_URL), 'external'),
      {
        code: ErrorCode.ParseError,
      },
      name,
    )
  }
})

void test('a rendered event selector may have no selected missions', async () => {
  const form = readAllianceAdminOverview(
    pageOf(allianceSettingsBody.replaceAll(' selected="selected"', ''), OVERVIEW_URL),
    'external',
  )
  assert.deepEqual(form.eventMissions, [])
  const body = await submitted((session) => updateAllianceSettings(session, { form, patch: {} }))
  assert.deepEqual(body.getAll('events[]'), [])
})

void test('an explicit empty mission patch clears the saved selection', async () => {
  const form = settingsForm()
  const body = await submitted((session) =>
    updateAllianceSettings(session, {
      form,
      patch: { eventMissions: [] },
    }),
  )
  assert.deepEqual(body.getAll('events[]'), [])
  assert.deepEqual(form.eventMissions, [1])
  assert.equal(body.get('owner_range'), form.ownerRankName)
  assert.equal(body.get('text'), form.text)
})

void test('every kind of setting travels as the field the endpoint reads', async () => {
  const body = await submitted(async (session) => {
    await updateAllianceSettings(session, {
      form: settingsForm(),
      patch: {
        minimumApplicationPoints: 500,
        maximumMembers: 60,
        applicationsClosed: true,
        showDiplomacy: false,
        websiteUrl: 'https://nova.example.com/',
      },
    })
  })
  assert.equal(body.get('request_min_points'), '500')
  assert.equal(body.get('ally_max_members'), '60')
  assert.equal(body.get('request_notallow'), '1')
  assert.equal(body.get('diplo'), '0')
  assert.equal(body.get('web'), 'https://nova.example.com/')
})

void test('a key the form has no field for, and a field left out, are both skipped', async () => {
  const stray = { tag: 'NEW', notASetting: 'ignored', websiteUrl: undefined }
  const body = await submitted(async (session) => {
    await updateAllianceSettings(session, { form: settingsForm(), patch: stray })
  })
  assert.equal(body.get('ally_tag'), 'NEW')
  assert.equal(body.has('notASetting'), false)
  assert.equal(body.get('web'), '')
})

void test('the leadership transfer form lists the members the alliance may be handed to', () => {
  const document = readAllianceAdminTransfer(pageOf(TRANSFER_FORM, `${SHOW_URL}&mode=admin`))
  assert.deepEqual(document.candidates, [
    { playerId: 4242, member: 'AhMisty [Leader]' },
    { playerId: 4243, member: 'Nova [Member]' },
  ])
})

void test('the applications list names each request by the page it links to', () => {
  const document = readAllianceAdminManageApply(pageOf(allianceApplicationsBody))
  assert.deepEqual(document.applications, [
    { id: 9, name: 'AhMisty', submittedAtText: '01.01.2026' },
    { id: 10, name: 'Nova', submittedAtText: '02.01.2026' },
  ])
})

void test('a row that names no detail page is refused rather than listed without an id', () => {
  assert.throws(() => readAllianceAdminManageApply(pageOf(allianceApplicationsWithoutLinkBody)), {
    code: ErrorCode.ParseError,
    message: 'Missing response URL',
  })
})

void test('one application is read for the id its answer form addresses', () => {
  const document = readAllianceAdminDetailApply(pageOf(allianceApplicationBody), 9)
  assert.deepEqual([document.id, document.playerId, document.text], [9, 4242, 'Please let me in'])
  assert.deepEqual(document.answers, [
    { value: 'yes', label: 'Accept' },
    { value: 'no', label: 'Reject' },
  ])
})

void test('a document whose form answers another application is refused rather than attributed', () => {
  assert.throws(() => readAllianceAdminDetailApply(pageOf(allianceApplicationBody), 8), {
    code: ErrorCode.ParseError,
    message: 'Application ID mismatch',
  })
})

void test('an answer control the page rendered without a value cannot be read', () => {
  const document = readAllianceAdminDetailApply(
    pageOf(applicationForm(allianceApplicationAnswerButton)),
    9,
  )
  assert.deepEqual(document.answers, [{ value: 'yes', label: 'Accept' }])
  assert.throws(
    () =>
      readAllianceAdminDetailApply(
        pageOf(applicationForm(allianceApplicationAnswerWithoutValue)),
        9,
      ),
    { code: ErrorCode.ParseError, message: 'Missing value on the selected element' },
  )
})

void test('the rank table reads each permission and the ranks that hold them', () => {
  const document = readAllianceAdminPermissions(pageOf(allianceRanksBody))
  assert.deepEqual(document.rights, [
    { id: 1, name: 'ADMIN', description: 'Administration' },
    { id: 2, name: 'BANK', description: '' },
  ])
  assert.deepEqual(document.ranks, [
    { id: 3, name: 'Leader', rights: [1] },
    { id: 4, name: 'Treasurer', rights: [2] },
  ])
})

void test('a permission whose field names no index cannot be read', () => {
  assert.deepEqual(
    readAllianceAdminPermissions(
      permissionRow('<input type="checkbox" name="newrank[1]" title="Admin">'),
    ).rights,
    [{ id: 1, name: 'ADMIN', description: 'Admin' }],
  )

  const broken: [string, string, string][] = [
    [
      'a name without an index',
      '<input type="checkbox" name="notaright" title="Admin">',
      'Expected a numeric value',
    ],
    ['no name at all', '<input type="checkbox" title="Admin">', 'Expected a numeric value'],
  ]
  for (const [name, checkbox, message] of broken)
    assert.throws(
      () => readAllianceAdminPermissions(permissionRow(checkbox)),
      { code: ErrorCode.ParseError, message },
      name,
    )
})

void test('a rank whose field names no index cannot be read', () => {
  const document = pageOf(
    '<div id="new_alliance_rank"></div>' +
      '<input type="text" name="rank[x][rankName]" value="Leader">',
  )
  assert.throws(() => readAllianceAdminPermissions(document), {
    code: ErrorCode.ParseError,
    message: 'Expected a numeric value',
  })
})

void test('the management table reads a rank from its selector, or prints it as text', () => {
  const rows = readAllianceAdminMembers(pageOf(allianceAdminMembersBody)).members
  assert.deepEqual(
    rows.map((row) => [row.rankId, row.rankName, row.rankOptions]),
    [
      [
        3,
        'Leader',
        [
          { value: 3, label: 'Leader' },
          { value: 4, label: 'Member' },
        ],
      ],
      [null, 'Member', []],
    ],
  )
  assert.deepEqual(
    rows.map((row) => row.hasKickControl),
    [true, false],
  )
  assert.deepEqual(
    rows.map((row) => row.id),
    [4242, null],
  )
})

void test('a member’s score is read exactly where the row prints the full figure', () => {
  assert.deepEqual(
    readAllianceAdminMembers(pageOf(allianceAdminMembersScoredBody)).members.map(
      (row) => row.points,
    ),
    [1234567],
  )
  assert.equal(readAllianceAdminMembers(pageOf(allianceAdminMembersBody)).members[0]!.points, 1234)
})

void test('the diplomacy page reads each record from the controls that address it', () => {
  const document = readAllianceAdminDiplomacy(pageOf(allianceDiplomacyBody))
  assert.deepEqual(document.records, [
    { id: 11, text: '[ALLY] Alpha', hasAcceptControl: false, hasDeleteControl: true },
    { id: 12, text: 'Beta', hasAcceptControl: true, hasDeleteControl: true },
  ])
  assert.deepEqual(
    document.sections.map(({ title, text }) => [title, text]),
    [
      ['Trade pact Propose', '[ALLY] Alpha'],
      ['Accept', 'Trade pact\nBeta'],
    ],
  )
  assert.deepEqual(document.offeredModes, [3])
})

void test('each diplomacy level renders its own title and text, and its own create control', () => {
  const empty = readAllianceAdminDiplomacy(
    pageOf(
      [
        '<div class="alleanza1"><div class="alleanza5">Neutral</div>',
        '<div class="alleanza64"></div></div>',
        '<div class="alleanza1"><div class="alleanza5">Trade pact ',
        '<a href="game.php?page=alliance&amp;mode=admin&amp;action=diplomacyCreate"',
        ' onclick="return Dialog.open(this.href, 716, 300);">Propose</a></div>',
        '<div class="alleanza64">[ALLY] Alpha</div></div>',
      ].join(''),
    ),
  )
  assert.deepEqual(empty.sections, [{ title: 'Trade pact Propose', text: '[ALLY] Alpha' }])
  assert.deepEqual(empty.offeredModes, [])
})

void test('a control that names no alliance is not a record to read', () => {
  assert.throws(() => readAllianceAdminDiplomacy(pageOf(allianceDiplomacyWithoutIdBody)), {
    code: ErrorCode.ParseError,
    message: 'Missing id on the link',
  })
})

void test('the diplomacy creation form offers the alliances and the levels it may propose', () => {
  const document = readAllianceAdminDiplomacyCreate(pageOf(allianceDiplomacyOptionsBody))
  assert.deepEqual(document.alliances, [
    { value: 9, label: '[ALLY] Alpha' },
    { value: 10, label: 'Beta' },
  ])
  assert.deepEqual(document.levels, [
    { value: 3, label: 'Trade pact' },
    { value: 5, label: 'War' },
  ])
})

type ReadCase = {
  name: string
  run: (session: Session) => Promise<Observed<PageReply<{ kind: string }>>>
  url: string
  reply: Reply

  kind: string
}

const READS: readonly ReadCase[] = [
  {
    name: 'alliance',
    run: (session) => alliance(session),
    url: SHOW_URL,
    reply: pageReply(gamePage(allianceHomeBody)),
    kind: 'alliance',
  },
  {
    name: 'alliance for one planet',
    run: (session) => alliance(session),
    url: SHOW_URL,
    reply: pageReply(gamePage(allianceHomeBody)),
    kind: 'alliance',
  },
  {
    name: 'allianceInfo',
    run: (session) => allianceInfo(session, { allianceId: 7 }),
    url: `${BASE_URL}game.php?id=7&page=alliance&mode=info`,
    reply: pageReply(gamePage(allianceInfoBody)),
    kind: 'allianceInfo',
  },
  {
    name: 'allianceApply',
    run: (session) => allianceApply(session, { allianceId: 7 }),
    url: `${BASE_URL}game.php?id=7&page=alliance&mode=apply`,
    reply: pageReply(gamePage(APPLY_FORM)),
    kind: 'allianceApply',
  },
  {
    name: 'allianceCreate',
    run: (session) => allianceCreate(session),
    url: `${SHOW_URL}&mode=create`,
    reply: pageReply(gamePage(CREATE_FORM)),
    kind: 'allianceCreate',
  },
  {
    name: 'allianceMemberList',
    run: (session) => allianceMemberList(session),
    url: `${SHOW_URL}&mode=memberList`,
    reply: pageReply(gamePage(allianceMemberListBody)),
    kind: 'allianceMemberList',
  },
  {
    name: 'allianceCircular',
    run: (session) => allianceCircular(session),
    url: `${SHOW_URL}&mode=circular`,
    reply: pageReply(gamePage(CIRCULAR_FORM)),
    kind: 'allianceCircular',
  },
  {
    name: 'allianceDevelopment',
    run: (session) => allianceDevelopment(session),
    url: `${SHOW_URL}&mode=development`,
    reply: pageReply(pageHtml(contentPage(allianceDevelopmentBody))),
    kind: 'allianceDevelopment',
  },
  {
    name: 'allianceStorage',
    run: (session) => allianceStorage(session),
    url: `${SHOW_URL}&mode=storage`,
    reply: pageReply(gamePage(allianceStorageBody)),
    kind: 'allianceStorage',
  },
  {
    name: 'allianceDeposit',
    run: (session) => allianceDeposit(session, { planetId: PLANET_ID }),
    url: `${SHOW_URL}&cp=${PLANET_ID}&mode=put`,
    reply: pageReply(gamePage(allianceDepositBody)),
    kind: 'allianceDeposit',
  },
  {
    name: 'allianceWithdrawal',
    run: (session) => allianceWithdrawal(session, { planetId: PLANET_ID }),
    url: `${SHOW_URL}&cp=${PLANET_ID}&mode=vlyat`,
    reply: pageReply(gamePage(allianceWithdrawalBody)),
    kind: 'allianceWithdrawal',
  },
  {
    name: 'allianceIssue',
    run: (session) => allianceIssue(session),
    url: `${SHOW_URL}&mode=issue`,
    reply: pageReply(gamePage(allianceDistributionBody)),
    kind: 'allianceIssue',
  },
  {
    name: 'allianceAdminOverview for one text section',
    run: (session) => allianceAdminOverview(session, { textKind: 'internal' }),
    url: `${BASE_URL}game.php?textMode=internal&action=overview&page=alliance&mode=admin`,
    reply: pageReply(gamePage(allianceSettingsBody)),
    kind: 'allianceAdminOverview',
  },
  {
    name: 'allianceAdminOverview',
    run: (session) => allianceAdminOverview(session),
    url: OVERVIEW_URL,
    reply: pageReply(gamePage(allianceSettingsBody)),
    kind: 'allianceAdminOverview',
  },
  {
    name: 'allianceAdminTransfer',
    run: (session) => allianceAdminTransfer(session),
    url: `${BASE_URL}game.php?action=transfer&page=alliance&mode=admin`,
    reply: pageReply(gamePage(TRANSFER_FORM)),
    kind: 'allianceAdminTransfer',
  },
  {
    name: 'allianceAdminManageApply',
    run: (session) => allianceAdminManageApply(session),
    url: `${BASE_URL}game.php?action=mangeApply&page=alliance&mode=admin`,
    reply: pageReply(gamePage(allianceApplicationsBody)),
    kind: 'allianceAdminManageApply',
  },
  {
    name: 'allianceAdminDetailApply',
    run: (session) => allianceAdminDetailApply(session, { applicationId: 9 }),
    url: `${BASE_URL}game.php?id=9&action=detailApply&page=alliance&mode=admin`,
    reply: pageReply(gamePage(allianceApplicationBody)),
    kind: 'allianceAdminDetailApply',
  },
  {
    name: 'allianceAdminPermissions',
    run: (session) => allianceAdminPermissions(session),
    url: `${BASE_URL}game.php?action=permissions&page=alliance&mode=admin`,
    reply: pageReply(gamePage(allianceRanksBody)),
    kind: 'allianceAdminPermissions',
  },
  {
    name: 'allianceAdminMembers',
    run: (session) => allianceAdminMembers(session),
    url: `${BASE_URL}game.php?action=members&page=alliance&mode=admin`,
    reply: pageReply(gamePage(allianceAdminMembersBody)),
    kind: 'allianceAdminMembers',
  },
  {
    name: 'allianceAdminDiplomacy',
    run: (session) => allianceAdminDiplomacy(session),
    url: `${BASE_URL}game.php?action=diplomacy&page=alliance&mode=admin`,
    reply: pageReply(gamePage(allianceDiplomacyBody)),
    kind: 'allianceAdminDiplomacy',
  },
  {
    name: 'allianceAdminDiplomacyCreate',
    run: (session) => allianceAdminDiplomacyCreate(session),
    url: `${BASE_URL}game.php?action=diplomacyCreate&page=alliance&mode=admin`,
    reply: pageReply(gamePage(allianceDiplomacyOptionsBody)),
    kind: 'allianceAdminDiplomacyCreate',
  },
]

type WriteCase = {
  name: string
  run: (session: Session) => Promise<unknown>
  method: 'GET' | 'POST'
  url: string
  body: [string, string][]
}

const WRITES: readonly WriteCase[] = [
  {
    name: 'submitAllianceApplication',
    run: (session) => submitAllianceApplication(session, { allianceId: 7, message: 'Let me in' }),
    method: 'POST',
    url: `${BASE_URL}game.php?id=7&page=alliance&mode=apply`,
    body: [['text', 'Let me in']],
  },
  {
    name: 'cancelAllianceApplication',
    run: (session) => cancelAllianceApplication(session),
    method: 'POST',
    url: `${SHOW_URL}&mode=cancelApply`,
    body: [],
  },
  {
    name: 'createAlliance',
    run: (session) => createAlliance(session, { tag: 'ALLY', name: 'The Alliance' }),
    method: 'POST',
    url: `${BASE_URL}game.php?action=send&page=alliance&mode=create`,
    body: [
      ['atag', 'ALLY'],
      ['aname', 'The Alliance'],
    ],
  },
  {
    name: 'leaveAlliance',
    run: (session) => leaveAlliance(session),
    method: 'POST',
    url: `${SHOW_URL}&mode=close`,
    body: [],
  },
  {
    name: 'leaveAlliance for one planet',
    run: (session) => leaveAlliance(session),
    method: 'POST',
    url: `${SHOW_URL}&mode=close`,
    body: [],
  },
  {
    name: 'sendAllianceCircular to every member',
    run: (session) => sendAllianceCircular(session, { subject: 'Raid', message: 'Tonight' }),
    method: 'POST',
    url: `${BASE_URL}game.php?action=send&page=alliance&mode=circular`,
    body: [
      ['rankID', '0'],
      ['subject', 'Raid'],
      ['text', 'Tonight'],
    ],
  },
  {
    name: 'sendAllianceCircular to one rank',
    run: (session) =>
      sendAllianceCircular(session, { subject: 'Raid', message: 'Tonight', rankId: 3 }),
    method: 'POST',
    url: `${BASE_URL}game.php?action=send&page=alliance&mode=circular`,
    body: [
      ['rankID', '3'],
      ['subject', 'Raid'],
      ['text', 'Tonight'],
    ],
  },
  {
    name: 'upgradeAllianceDevelopment',
    run: (session) => upgradeAllianceDevelopment(session, { elementId: 2501, levels: 2 }),
    method: 'POST',
    url: `${SHOW_URL}&mode=development`,
    body: [
      ['id', '2501'],
      ['amount', '2'],
    ],
  },
  {
    name: 'depositAllianceResources',
    run: (session) =>
      depositAllianceResources(session, { planetId: PLANET_ID, resources: new Map([[901, 1000]]) }),
    method: 'POST',
    url: `${SHOW_URL}&cp=${PLANET_ID}&mode=putsend`,
    body: [['901', '1000']],
  },
  {
    name: 'withdrawAllianceResources',
    run: (session) =>
      withdrawAllianceResources(session, { planetId: PLANET_ID, resources: new Map([[901, 500]]) }),
    method: 'POST',
    url: `${SHOW_URL}&cp=${PLANET_ID}&mode=vlyatsend`,
    body: [['901', '500']],
  },
  {
    name: 'distributeAllianceResources',
    run: (session) =>
      distributeAllianceResources(session, {
        target: { planetId: 2001 },
        resources: new Map([[901, 100]]),
      }),
    method: 'POST',
    url: `${BASE_URL}game.php?action=issue_send&page=alliance&mode=admin`,
    body: [
      ['901', '100'],
      ['id_u', '2001'],
    ],
  },
  {
    name: 'updateAllianceSettings',
    run: (session) =>
      updateAllianceSettings(session, { form: settingsForm(), patch: { eventMissions: [3] } }),
    method: 'POST',
    url: `${BASE_URL}game.php?action=overview&page=alliance&mode=admin`,
    body: [
      ['send', '1'],
      ['textMode', 'external'],
      ['ally_tag', 'ALLY'],
      ['ally_name', 'The Alliance'],
      ['owner_range', 'Leader'],
      ['web', ''],
      ['image', ''],
      ['request_notallow', '0'],
      ['ally_max_members', '50'],
      ['request_min_points', '1000'],
      ['stats', '1'],
      ['diplo', '0'],
      ['text', 'Apply here'],
      ['events[]', '3'],
    ],
  },
  {
    name: 'dissolveAlliance',
    run: (session) => dissolveAlliance(session),
    method: 'POST',
    url: `${BASE_URL}game.php?action=close&page=alliance&mode=admin`,
    body: [],
  },
  {
    name: 'transferAllianceLeadership',
    run: (session) => transferAllianceLeadership(session, { playerId: 4242 }),
    method: 'POST',
    url: `${BASE_URL}game.php?action=transfer&page=alliance&mode=admin`,
    body: [['newleader', '4242']],
  },
  {
    name: 'answerAllianceApplication accepting',
    run: (session) => answerAllianceApplication(session, { applicationId: 9, accept: true }),
    method: 'POST',
    url: `${BASE_URL}game.php?id=9&action=sendAnswerToApply&page=alliance&mode=admin`,
    body: [
      ['answer', 'yes'],
      ['text', ''],
    ],
  },
  {
    name: 'answerAllianceApplication refusing',
    run: (session) =>
      answerAllianceApplication(session, {
        applicationId: 9,
        accept: false,
        text: 'Not this time',
      }),
    method: 'POST',
    url: `${BASE_URL}game.php?id=9&action=sendAnswerToApply&page=alliance&mode=admin`,
    body: [
      ['answer', 'no'],
      ['text', 'Not this time'],
    ],
  },
  {
    name: 'changeAllianceRank creating',
    run: (session) =>
      changeAllianceRank(session, { operation: 'create', name: 'Treasurer', rights: [1, 2] }),
    method: 'POST',
    url: `${BASE_URL}game.php?action=permissionsSend&page=alliance&mode=admin`,
    body: [
      ['newrank[rankName]', 'Treasurer'],
      ['newrank[1]', '1'],
      ['newrank[2]', '1'],
    ],
  },
  {
    name: 'changeAllianceRank updating',
    run: (session) =>
      changeAllianceRank(session, { operation: 'update', id: 3, name: 'Leader', rights: [2] }),
    method: 'POST',
    url: `${BASE_URL}game.php?action=permissionsSend&page=alliance&mode=admin`,
    body: [
      ['rank[3][rankName]', 'Leader'],
      ['rank[3][2]', '1'],
    ],
  },
  {
    name: 'changeAllianceRank deleting',
    run: (session) => changeAllianceRank(session, { operation: 'delete', id: 3 }),
    method: 'POST',
    url: `${BASE_URL}game.php?action=permissionsSend&page=alliance&mode=admin`,
    body: [['deleteRank', '3']],
  },
  {
    name: 'kickAllianceMember',
    run: (session) => kickAllianceMember(session, { playerId: 4242 }),
    method: 'POST',
    url: `${BASE_URL}game.php?action=membersKick&page=alliance&mode=admin`,
    body: [['id', '4242']],
  },
  {
    name: 'setAllianceMemberRank',
    run: (session) => setAllianceMemberRank(session, { playerId: 4242, rankId: 3 }),
    method: 'POST',
    url: `${BASE_URL}game.php?action=rank&page=alliance&mode=admin`,
    body: [['rank[4242]', '3']],
  },
  {
    name: 'acceptAllianceDiplomacy',
    run: (session) => acceptAllianceDiplomacy(session, { diplomacyId: 12 }),
    method: 'POST',
    url: `${BASE_URL}game.php?action=diplomacyAccept&page=alliance&mode=admin`,
    body: [['id', '12']],
  },
  {
    name: 'deleteAllianceDiplomacy',
    run: (session) => deleteAllianceDiplomacy(session, { diplomacyId: 12 }),
    method: 'POST',
    url: `${BASE_URL}game.php?action=diplomacyDelete&page=alliance&mode=admin`,
    body: [['id', '12']],
  },
  {
    name: 'createAllianceDiplomacy',
    run: (session) =>
      createAllianceDiplomacy(session, { allianceId: 9, level: 3, message: 'A pact?' }),
    method: 'POST',
    url: `${BASE_URL}game.php?action=diplomacyCreateProcessor&page=alliance&mode=admin`,
    body: [
      ['ally_id', '9'],
      ['level', '3'],
      ['text', 'A pact?'],
    ],
  },
]

void test('every reader asks its own address and answers with its own document', async () => {
  for (const item of READS) {
    const server = fakeServer(item.reply)
    const observed = await item.run(sessionOn(server))
    assert.equal(server.requests.length, 1, `${item.name}: one request`)
    assert.equal(server.requests[0]!.method, 'GET', `${item.name}: method`)
    assert.equal(server.requests[0]!.url.href, item.url, `${item.name}: address`)
    assert.equal(observed.data.kind, item.kind, `${item.name}: document`)
  }
})

void test('every writer submits to its own address, and to no other', async () => {
  for (const item of WRITES)
    await expectOperation(item.run, { method: item.method, url: item.url, body: item.body })
})

void test('the administration dispatcher addresses seventeen targets of its own', () => {
  const dispatched = [...READS, ...WRITES]
    .map((item) => new URL(item.url))
    .filter((url) => url.searchParams.get('mode') === 'admin')
    .map((url) => url.searchParams.get('action') ?? '')
  assert.deepEqual([...new Set(dispatched)].toSorted(), [
    'close',
    'detailApply',
    'diplomacy',
    'diplomacyAccept',
    'diplomacyCreate',
    'diplomacyCreateProcessor',
    'diplomacyDelete',
    'issue_send',
    'mangeApply',
    'members',
    'membersKick',
    'overview',
    'permissions',
    'permissionsSend',
    'rank',
    'sendAnswerToApply',
    'transfer',
  ])
})

void test('a page a caller may not use is reported as the message the server printed', async () => {
  const observed = await decode(
    (session) => alliance(session),
    pageReply(gamePage('<div class="ally_contents">Not permitted</div>')),
  )
  assert.deepEqual(observed.data, { kind: 'message', message: 'Not permitted' })
  const storage = await decode(
    (session) => allianceStorage(session),
    pageReply(gamePage('<div class="ally_contents">You are not in an alliance</div>')),
  )
  assert.deepEqual(storage.data, { kind: 'message', message: 'You are not in an alliance' })
})

void test('a request the endpoint redirects is reported as the redirect it answered with', async () => {
  const observed = await decode((session) => allianceInfo(session, { allianceId: 7 }), {
    status: 302,
    headers: { Location: './game.php?page=overview' },
  })
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}game.php?page=overview`),
  })
})

void test('a reader asked for a document decodes it rather than reporting a receipt', async () => {
  const document: AlliancePage = await read(
    (session) => alliance(session),
    pageReply(gamePage(allianceHomeBody)),
  )
  assert.equal(document.state, 'member')
})

void test('a submission is reported as the answer the endpoint gave, refusal included', async () => {
  const circular = await answer(
    (session) => sendAllianceCircular(session, { subject: 'Raid', message: 'Tonight' }),
    { body: '"Circular sent"', headers: { 'Content-Type': 'application/json' } },
  )
  assert.deepEqual(circular.data, { kind: 'json', value: 'Circular sent' })
  const transfer = await answer(
    (session) => transferAllianceLeadership(session, { playerId: 4242 }),
    { status: 302, headers: { Location: './game.php?page=alliance&mode=admin' } },
  )
  assert.deepEqual(transfer.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}game.php?page=alliance&mode=admin`),
  })
  const refused = await answer(
    (session) => answerAllianceApplication(session, { applicationId: 9, accept: true }),
    pageReply(gamePage('<div class="ally_contents">No such application</div>')),
  )
  assert.deepEqual(refused.data, { kind: 'message', message: 'No such application' })
})

void test('a read that takes an id writes it into the address itself', async () => {
  await expectOperation((session) => allianceAdminDetailApply(session, { applicationId: 9 }), {
    url: `${BASE_URL}game.php?id=9&action=detailApply&page=alliance&mode=admin`,
  })
})
