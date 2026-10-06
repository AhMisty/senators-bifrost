import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ErrorCode, inspectPage, inspection, parsePage } from '../../src/index.ts'
import {
  ACTIVE_PLANET,
  GAME_FRAME,
  INSPECTED_CONTENT,
  PLAYERLESS_FRAME,
  PLANET_ROWS_WITH_AND_WITHOUT_LINK,
  PLANET_ROW_WITHOUT_NAME,
  inspectedBody,
} from '../fixtures/shared/inspect.ts'
import { BASE_URL, PLANET_ID, httpResponse, pageHtml, tickerHeader } from '../helpers.ts'

function inspected(body: string) {
  return inspectPage(
    httpResponse({ body: pageHtml(body) }, `${BASE_URL}game.php?page=overview&cp=${PLANET_ID}`),
  )
}

function contentOnly(body = INSPECTED_CONTENT): string {
  return inspectedBody({ frame: '', header: '', content: body })
}

void test('input type casing preserves check states and submit labels', () => {
  const { document } = inspected(
    contentOnly(
      '<form><input name="flag" type="CHECKBOX" checked>' +
        '<input name="save" type="Submit" value="Save"></form>',
    ),
  )
  const form = document.forms[0]!
  assert.deepEqual(
    form.fields.map(({ type, checked, label }) => ({ type, checked, label })),
    [
      { type: 'checkbox', checked: true, label: '' },
      { type: 'submit', checked: null, label: 'Save' },
    ],
  )
  assert.deepEqual([...form.submittedFields], [['flag', 'on']])
})

void test('the document is reported as the response rendered it', () => {
  const { document } = inspected(contentOnly())
  assert.equal(document.title, 'Test')
  assert.equal(document.message, 'Everything is fine')
  assert.deepEqual(document.headings, [
    { level: 2, text: 'Overview' },
    { level: 3, text: 'Sub' },
  ])

  assert.match(document.text, /Everything is fine Overview/)
  assert.doesNotMatch(document.text, /var total/)
})

void test('every link is reported with the address and the handler it carries', () => {
  const { document } = inspected(contentOnly())
  assert.deepEqual(document.links, [
    {
      text: 'Notes',
      url: `${BASE_URL}notes.php?id=4`,
      title: 'Notes',
      handler: null,
    },
    {
      text: 'Tip',
      url: `${BASE_URL}game.php?page=overview&cp=${PLANET_ID}#`,
      title: '<span>Tip</span>',
      handler: null,
    },

    { text: 'Card', url: null, title: null, handler: 'Dialog.Playercard(1)' },

    {
      text: 'Card 2',
      url: `${BASE_URL}game.php?page=overview&cp=${PLANET_ID}#`,
      title: null,
      handler: 'Dialog.Playercard(2)',
    },
    { text: 'No address', url: null, title: null, handler: null },
    { text: 'one', url: `${BASE_URL}x.php?id=1`, title: null, handler: null },
  ])
})

void test('every image is reported with the address it resolves to and what it says', () => {
  const { document } = inspected(contentOnly())
  assert.deepEqual(document.images, [
    {
      url: `${BASE_URL}img/gebaeude/31.gif`,
      description: 'Mine',
      iconId: 31,
      tooltip: '<span>Building</span>',
    },

    {
      url: `${BASE_URL}img/x.png`,
      description: '',
      iconId: null,
      tooltip: 'Title',
    },
    {
      url: `${BASE_URL}img/gebaeude/31.gif`,
      description: 'M',
      iconId: 31,
      tooltip: null,
    },
  ])
})

void test('an image the page rendered without an address cannot be placed', () => {
  assert.throws(() => inspected(contentOnly('<img alt="no source">')), {
    code: ErrorCode.ParseError,
    message: /Missing image source/,
  })
})

void test('a form reports the controls it renders and what it would submit', () => {
  const { document } = inspected(contentOnly())
  const form = document.forms[0]!,
    bare = document.forms[1]!
  assert.equal(form.id, 'f1')
  assert.equal(form.action, `${BASE_URL}game.php?page=settings`)
  assert.equal(form.method, 'POST')
  assert.equal(form.encoding, 'multipart/form-data')

  assert.equal(bare.id, null)
  assert.equal(bare.action, `${BASE_URL}game.php?page=overview&cp=${PLANET_ID}`)
  assert.equal(bare.method, 'GET')
  assert.equal(bare.encoding, 'application/x-www-form-urlencoded')
  assert.deepEqual([...bare.submittedFields], [['loose', 'text']])
})

void test('each control is reported with the label and the value it stands at', () => {
  const { document } = inspected(contentOnly())
  const form = document.forms[0]!
  const controls = new Map(form.fields.map((field) => [field.name ?? field.type, field]))

  assert.equal(controls.get('user')?.label, 'User again')
  assert.equal(controls.get('user')?.value, 'AhMisty')
  assert.equal(controls.get('user')?.required, true)
  assert.deepEqual(
    [controls.get('user')?.minimum, controls.get('user')?.maximum, controls.get('user')?.step],
    ['1', '10', '2'],
  )

  assert.equal(controls.get('picked')?.label, 'Pick')

  assert.equal(controls.get('secret')?.label, 'Secret')
  assert.equal(controls.get('titled')?.label, 'Titled')

  assert.equal(controls.get('user')?.checked, null)

  assert.deepEqual(
    form.fields.filter((field) => field.name === 'side').map((field) => field.checked),
    [true, false],
  )
  assert.equal(controls.get('hidden')?.type, 'hidden')
})

void test('a control is reported by the type it renders or by the kind it is', () => {
  const { document } = inspected(contentOnly())
  const form = document.forms[0]!
  const types = form.fields.map((field) => [field.name ?? field.label, field.type])
  assert.deepEqual(types, [
    ['picked', 'text'],
    ['user', 'text'],
    ['mode', 'select'],
    ['multi', 'select'],
    ['notes', 'textarea'],
    ['side', 'radio'],
    ['side', 'radio'],
    ['secret', 'password'],
    ['titled', 'text'],
    ['Save', 'submit'],
    ['Go', 'submit'],
    ['', 'reset'],
    ['hidden', 'hidden'],
    ['trapped', 'text'],
  ])
})

void test('a select reports every option it renders with the state of each', () => {
  const { document } = inspected(contentOnly())
  const form = document.forms[0]!
  const mode = form.fields.find((field) => field.name === 'mode')
  assert.deepEqual(mode?.options, [
    { value: '1', label: 'One', selected: true, disabled: false },
    { value: '2', label: 'Two', selected: false, disabled: true },
  ])

  assert.deepEqual(form.fields.find((field) => field.name === 'user')?.options, [])

  assert.deepEqual(form.fields.find((field) => field.name === 'multi')?.value, ['1'])
})

void test('a form submits its successful controls and not the rest', () => {
  const { document } = inspected(contentOnly())
  assert.deepEqual(
    [...document.forms[0]!.submittedFields],
    [
      ['picked', 'p'],
      ['user', 'AhMisty'],
      ['mode', '1'],
      ['multi', '1'],
      ['notes', 'hi'],
      ['side', 'a'],
      ['secret', ''],
      ['titled', ''],
      ['hidden', 'h'],
    ],
  )
})

void test('a control outside every form is reported as one of the page’s own', () => {
  const { document } = inspected(contentOnly())
  assert.deepEqual(
    document.controls.map((control) => [control.name, control.label, control.type]),
    [['outside', 'Outside', 'text']],
  )
})

void test('a table reports its rows, cells and what each cell holds', () => {
  const { document } = inspected(contentOnly())
  assert.deepEqual(
    document.tables.map((table) => [table.id, table.caption]),
    [['t1', 'Records']],
  )
  const header = document.tables[0]!.rows[0]!,
    row = document.tables[0]!.rows[1]!
  assert.deepEqual(
    header.map((cell) => [cell.text, cell.isHeader, cell.columnSpan, cell.rowSpan]),
    [
      ['Name', true, 1, 1],
      ['Value', true, 2, 1],
    ],
  )
  assert.deepEqual(row[0]!.attributes, { rowspan: '2' })
  assert.deepEqual(
    row[1]!.links.map((link) => link.text),
    ['one'],
  )
  assert.deepEqual(
    row[2]!.images.map((image) => image.iconId),
    [31],
  )
})

void test('a row outside every table belongs to none of them', () => {
  const { document } = inspected(contentOnly('<template><tr><td>orphan</td></tr></template>'))
  assert.deepEqual(document.tables, [])
})

void test('a tooltip is read as the fragment it renders, with its own owner', () => {
  const { document } = inspected(contentOnly())
  assert.deepEqual(document.tooltips, [
    { sourceId: null, ownerElementId: null, text: 'Tip', tables: [], links: [] },
    { sourceId: null, ownerElementId: null, text: 'Building', tables: [], links: [] },
    {
      sourceId: 'tip',
      ownerElementId: 31,
      text: 'Innercell',
      tables: [
        {
          id: null,
          caption: '',
          rows: [
            [
              {
                text: 'cell',
                html: 'cell',
                isHeader: false,
                columnSpan: 1,
                rowSpan: 1,
                attributes: {},
                links: [],
                images: [],
              },
            ],
          ],
        },
      ],
      links: [{ text: 'Inner', url: `${BASE_URL}y.php?id=2`, title: null, handler: null }],
    },

    { sourceId: 'tip2', ownerElementId: null, text: 'plain text', tables: [], links: [] },
  ])
})

void test('the scripts a page carried are reported as the data they hold', () => {
  const { document } = inspected(contentOnly())
  assert.deepEqual(document.scripts.bindings, [{ name: 'total', data: '12' }])
})

void test('a page that asks to be reloaded states how long and where to', () => {
  const { document } = inspected(contentOnly())
  assert.deepEqual(document.refresh, {
    delaySeconds: 5,
    url: `${BASE_URL}game.php?page=overview`,
  })

  assert.equal(inspected(contentOnly('<p>plain</p>')).document.refresh, null)
  assert.equal(
    inspected(contentOnly('<meta http-equiv="author" content="someone">')).document.refresh,
    null,
  )
})

void test('a player line that prints no name states the player alone', () => {
  const { pageContext } = inspected(
    inspectedBody({
      frame: '<div class="usernameow" onclick="Dialog.Playercard(4242)"></div>',
      content: '',
    }),
  )
  assert.equal(pageContext.playerId, 4242)
  assert.equal(pageContext.username, null)
})

void test('a document that states no language reports none', () => {
  const body = `<span class="active_urlpalnet" url="cp=${PLANET_ID}"></span><p>x</p>`
  assert.equal(inspectPage(httpResponse({ body })).pageContext.language, null)
})

void test('a page that prints no message reports none', () => {
  assert.equal(inspected(contentOnly('<p>plain</p>')).document.message, null)
})

void test('the context is what the response states about the session it answered', () => {
  const { pageContext } = inspected(inspectedBody())
  assert.equal(pageContext.playerId, 4242)
  assert.equal(pageContext.username, 'AhMisty')
  assert.equal(pageContext.planetId, PLANET_ID)
  assert.equal(pageContext.planetName, 'Homeworld')
  assert.deepEqual(pageContext.coordinate, { galaxy: 1, system: 2, planet: 3 })
  assert.equal(pageContext.language, 'en')

  assert.equal(pageContext.authorizationLevel, 3)
  assert.equal(pageContext.timezoneDifferenceSeconds, -3600)
})

void test('the header’s resources are reported by the kind of reading each one carries', () => {
  const { pageContext } = inspected(inspectedBody())
  assert.deepEqual(
    [...pageContext.resourceReadings],
    [
      [
        901,
        {
          resourceId: 901,
          name: 'metal',
          displayedText: '1.000',
          kind: 'stock',
          stock: 1000,

          capacity: null,
          productionPerHour: null,
        },
      ],
      [
        902,
        {
          resourceId: 902,
          name: 'crystal',
          displayedText: '500',
          kind: 'stock',
          stock: 500,
          capacity: null,
          productionPerHour: null,
        },
      ],
      [
        903,
        {
          resourceId: 903,
          name: 'deuterium',
          displayedText: '100',
          kind: 'stock',
          stock: 100,
          capacity: null,
          productionPerHour: null,
        },
      ],
      [
        911,
        {
          resourceId: 911,
          name: 'energy',
          displayedText: '500',
          kind: 'supply',
          supply: { available: 500, total: 1234 },
        },
      ],
    ],
  )
})

void test('a header that renders a ticker reports what the ticker states as well', () => {
  const header = tickerHeader({
    metal: ['1000', '10', '100000'],
    crystal: ['1000', '10', '100000'],
    deuterium: ['1000', '10', '100000'],
    energy: ['500', '1234'],
  })
  const { pageContext } = inspected(inspectedBody({ header, frame: '' }))
  assert.deepEqual(pageContext.resourceReadings.get(901), {
    resourceId: 901,
    name: 'metal',
    displayedText: '1000',
    kind: 'stock',
    stock: 1000,
    capacity: 100000,
    productionPerHour: 10,
  })
})

void test('a resource the header renders without a balance is a decoding failure', () => {
  assert.throws(() => inspected(`<div id="res_nav"><span id="current_metal">1.000</span></div>`), {
    code: ErrorCode.ParseError,
    message: /Missing metal balance/,
  })
})

void test('a stock resource the header renders outside the ticker reports no capacity', () => {
  const header = '<div id="res_nav"><span id="current_darkmatter" data-real="50">50</span></div>'
  const { pageContext } = inspected(inspectedBody({ header, frame: '' }))
  assert.deepEqual(pageContext.resourceReadings.get(921), {
    resourceId: 921,
    name: 'darkmatter',
    displayedText: '50',
    kind: 'stock',
    stock: 50,
    capacity: null,
    productionPerHour: null,
  })
})

void test('a resource the header leaves out is absent rather than zero', () => {
  const { pageContext } = inspected(
    inspectedBody({
      header: '<div id="res_nav"><span id="current_metal" data-real="7">7</span></div>',
      frame: '',
    }),
  )
  assert.deepEqual([...pageContext.resourceReadings.keys()], [901])
})

void test('a page that names no player and stands on no planet reports neither', () => {
  const { pageContext } = inspected(inspectedBody({ frame: PLAYERLESS_FRAME, content: '' }))
  assert.equal(pageContext.playerId, null)
  assert.equal(pageContext.username, null)
  assert.equal(pageContext.planetName, null)
  assert.deepEqual(pageContext.planets, [])

  assert.equal(pageContext.authorizationLevel, null)
  assert.equal(pageContext.timezoneDifferenceSeconds, null)
})

void test('a document that names no planet reports none', () => {
  const body = pageHtml(
    inspectedBody({ frame: PLAYERLESS_FRAME, content: '' }).replace(ACTIVE_PLANET(PLANET_ID), ''),
  )
  assert.equal(inspectPage(httpResponse({ body })).pageContext.planetId, null)
})

void test('the planets the navigation lists carry their own activity and alerts', () => {
  const { pageContext } = inspected(inspectedBody({ content: '' }))
  assert.deepEqual(
    pageContext.planets.map((planet) => [
      planet.id,
      planet.type,
      planet.parentPlanetId,
      planet.name,
    ]),
    [
      [1000, 1, null, 'Homeworld'],
      [1001, 3, 1000, 'Nova'],
      [1000, 1, null, 'Homeworld'],
      [1002, 1, null, null],
    ],
  )

  assert.deepEqual(
    pageContext.planets.map((planet) => planet.coordinate),
    [{ galaxy: 1, system: 2, planet: 3 }, null, null, null],
  )
  const homeworld = pageContext.planets[0]!,
    moon = pageContext.planets[1]!
  assert.equal(homeworld.isCurrent, true)
  assert.equal(moon.isCurrent, false)
  assert.equal(moon.imageUrl, `${BASE_URL}img/moon.gif`)

  assert.deepEqual(
    homeworld.activity.map((activity) => [activity.kind, activity.elementId, activity.text]),
    [
      ['building', 31, 'Robotics Factory'],
      ['research', 113, 'Energy Tech'],
      ['shipyard', 202, 'Small Cargo'],
    ],
  )
  assert.deepEqual(moon.activity, [])
})

void test('a planet row that renders no link is skipped rather than read', () => {
  const { pageContext } = inspected(
    inspectedBody({ frame: PLANET_ROWS_WITH_AND_WITHOUT_LINK, content: '' }),
  )
  assert.deepEqual(pageContext.planets, [
    {
      id: 2000,
      type: 1,
      parentPlanetId: null,
      name: 'Nova',
      coordinate: { galaxy: 2, system: 3, planet: 4 },
      imageUrl: `${BASE_URL}img/planet.gif`,
      isCurrent: false,

      activity: [
        {
          kind: 'building',
          elementId: 31,
          text: 'Robotics Factory',
          html: "<img src='./img/gebaeude/31.gif'><span>Robotics Factory</span>",
        },
      ],
      alerts: [],
    },
  ])
})

void test('a planet row whose link states no planet is skipped as well', () => {
  const { pageContext } = inspected(
    inspectedBody({ frame: PLANET_ROWS_WITH_AND_WITHOUT_LINK, content: '' }),
  )
  assert.equal(pageContext.planets.length, 1)
  assert.equal(
    pageContext.planets.some((planet) => planet.name === 'Nameless' || planet.name === 'Ghost'),
    false,
  )
})

void test('an indicator reports the mission it shows, with the moon’s own swap undone', () => {
  const { pageContext } = inspected(inspectedBody({ content: '' }))
  const homeworld = pageContext.planets[0]!,
    moon = pageContext.planets[1]!
  assert.deepEqual(homeworld.alerts, [
    { mission: 1, displayedMission: 1, active: false, label: 'Attack' },
    { mission: 6, displayedMission: 6, active: true, label: 'Espionage' },
    { mission: 10, displayedMission: 10, active: true, label: 'Missiles' },
    { mission: 12, displayedMission: 12, active: true, label: 'Capture' },
  ])

  assert.deepEqual(moon.alerts, [
    { mission: 10, displayedMission: 6, active: true, label: 'Moon espionage' },
    { mission: 9, displayedMission: 9, active: true, label: 'Moon destruction' },
    { mission: 6, displayedMission: 10, active: true, label: 'Moon missiles' },
  ])
})

void test('a planet row that names its planet nowhere states no name', () => {
  const { pageContext } = inspected(
    inspectedBody({ frame: `${GAME_FRAME}${PLANET_ROW_WITHOUT_NAME}`, content: '' }),
  )
  const row = pageContext.planets.at(-1)
  assert.equal(row?.id, PLANET_ID)

  assert.equal(row?.name, 'Homeworld')
  assert.equal(row?.imageUrl, null)
  assert.equal(row?.isCurrent, true)
})

void test('a planet the selector names only is reported by the name it states', () => {
  const frame = `
    <select id="lstPlaneta"><option value="?page=overview&amp;cp=1000">Homeworld [1:2:3]</option></select>
    <div id="list_palnet">
      <div class="palnet_row"><span url="cp=1000"><img src="./img/planet.gif"></span></div>
    </div>
  `
  const { pageContext } = inspected(inspectedBody({ frame, content: '' }))
  assert.equal(pageContext.planetName, null)
  assert.deepEqual(
    pageContext.planets.map((planet) => planet.name),
    ['Homeworld'],
  )
})

void test('a table the page rendered without a row reports none', () => {
  const { document } = inspected(contentOnly('<table id="empty"></table>'))
  assert.deepEqual(document.tables, [{ id: 'empty', caption: '', rows: [] }])
})

void test('a row outside any table is excluded from the table inventory', () => {
  const { document } = inspected(
    contentOnly('<tr><td>Orphan</td></tr><table><tr><td>Owned</td></tr></table>'),
  )
  assert.equal(document.tables.length, 1)
  assert.equal(document.tables[0]?.rows[0]?.[0]?.text, 'Owned')
})

void test('the links a page offers for navigation are reported beside its own', () => {
  const { pageContext } = inspected(inspectedBody({ content: '' }))
  assert.deepEqual(pageContext.navigation, [
    { text: 'A', url: `${BASE_URL}a.php`, title: null, handler: null },
  ])
})

void test('the inspection a page reader hands its own parsed document gives the same answer', () => {
  const response = httpResponse(
    { body: pageHtml(inspectedBody()) },
    `${BASE_URL}game.php?page=overview&cp=${PLANET_ID}`,
  )
  const fromResponse = inspectPage(response)
  const fromPage = inspection(parsePage(response))
  assert.deepEqual(fromPage, fromResponse)
})

void test('one document inspected twice reports the same thing', () => {
  const page = parsePage(
    httpResponse(
      { body: pageHtml(inspectedBody()) },
      `${BASE_URL}game.php?page=overview&cp=${PLANET_ID}`,
    ),
  )
  assert.deepEqual(inspection(page), inspection(page))
})

void test('the header of a document with no resource nodes reports no resource', () => {
  const { pageContext } = inspected(contentOnly())
  assert.deepEqual([...pageContext.resourceReadings.keys()], [])
})
