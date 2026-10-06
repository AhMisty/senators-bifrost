import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../src/index.ts'
import {
  ELEMENT_ICON_SELECTOR,
  ErrorCode,
  OperationError,
  RESOURCE_ICON_SELECTOR,
  contentText,
  controlOptions,
  elementId,
  hasTag,
  imageId,
  integerOptions,
  linkId,
  linkUrl,
  observe,
  parsePage,
  prefixedId,
  recordEntry,
  renderedOptions,
  requiredAttribute,
  requiredHtml,
  requiredLinkId,
  requiredTagName,
  requiredText,
  responseShape,
  responseUrl,
  selectOptions,
  shipTableRows,
  splitTrailingParenthetical,
  tableRows,
  textContent,
  tooltipPage,
} from '../../src/index.ts'
import { BASE_URL, httpResponse } from '../helpers.ts'

const GAME_URL = `${BASE_URL}game.php?page=overview&cp=1000`

function pageOf(body: string, url = GAME_URL): Page {
  return parsePage(httpResponse({ body }, url))
}

function inContent(body: string, url = GAME_URL): Page {
  return pageOf(`<div id="content"><div id="ally_content">${body}</div></div>`, url)
}

void test('body text preserves nested BBCode line breaks and consecutive empty lines', () => {
  const page = pageOf(
    '<div id="body">甲<br><span style="color:red">乙<br>丙</span><br><br><code>丁<br>戊</code></div>',
  )
  assert.equal(contentText(page.$('#body')), '甲\n乙\n丙\n\n丁\n戊')
  assert.equal(textContent(page.$('#body')), '甲乙丙丁戊')
  assert.equal(contentText(pageOf('<p>甲</p><br><p>乙</p>').$('body')), '甲\n\n乙')
})

void test('body paragraphs keep their boundaries without splitting inline formatting', () => {
  const page = pageOf(`
    <div id="body">开头 <strong>加粗</strong><p>段落 <em>斜体</em></p>
      <blockquote><p>引用</p></blockquote><ul><li>一</li><li>二</li></ul>结尾
      <!-- ignored --><script>hidden()</script><style>.hidden {}</style>
    </div>
  `)
  assert.equal(contentText(page.$('#body')), '开头 加粗\n段落 斜体\n引用\n一\n二\n结尾')
  assert.equal(contentText(page.$('.missing')), '')
  assert.equal(
    contentText(pageOf('<p>First <strong> second </strong> third</p>').$('p')),
    'First second third',
  )
  assert.equal(
    contentText(pageOf('<table><tr><td>Metal</td><td>100</td></tr></table>').$('table')),
    'Metal\n100',
  )
})

const PUBLIC_CARD = [
  '<main role="main">',
  '<div class="card mb-3">',
  '<h5 class="card-header">Login</h5>',
  '<div class="card-body"><p class="card-text">Wrong password</p></div>',
  '</div>',
  '</main>',
].join('')

const INDEX_URL = `${BASE_URL}index.php?page=login`

void test('a body is classified by what it carries rather than by its header', () => {
  const shaped: [string, string, string][] = [
    ['an empty body', '', 'empty'],
    ['whitespace only', '  \n\t ', 'empty'],
    ['markup', '<p>hello</p>', 'html'],
    ['a document', '<!DOCTYPE html><html><body>x</body></html>', 'html'],
    ['a bare number', '42', 'text'],
    ['prose', 'Nothing to see', 'text'],
    ['a bare comparison', '1 < 2 > 0', 'text'],
    ['an unclosed tag', '<div', 'text'],
  ]
  for (const [name, body, shape] of shaped)
    assert.equal(responseShape(httpResponse({ body })), shape, name)
})

void test('a body that looks like JSON is read as JSON whatever the header says', () => {
  for (const body of ['{"a":1}', '[1,2]', '"text"', 'true', 'false', 'null'])
    assert.equal(responseShape(httpResponse({ body })), 'json', body)

  assert.equal(responseShape(httpResponse({ body: '1' })), 'text')
  assert.equal(responseShape(httpResponse({ body: 'truex' })), 'text')
})

void test('a JSON header is believed even where the body is markup', () => {
  const response = httpResponse({
    body: '<p>hello</p>',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
  assert.equal(responseShape(response), 'json')

  assert.equal(
    responseShape(httpResponse({ body: 'x', headers: { 'Content-Type': 'APPLICATION/JSON' } })),
    'json',
  )
})

void test('markup is recognised by a tag opening, not by a stray angle bracket', () => {
  assert.equal(hasTag('<p>x</p>'), true)
  assert.equal(hasTag('<!-- comment -->'), true)
  assert.equal(hasTag('<?xml version="1.0"?>'), true)
  assert.equal(hasTag('</closing>'), true)
  assert.equal(hasTag('1 < 2 > 0'), false)
  assert.equal(hasTag('< div>'), false)
  assert.equal(hasTag('<div'), false)
  assert.equal(hasTag(''), false)
})

void test('a parsed page reports the address and time it was read from', () => {
  const page = pageOf('<p>x</p>')
  assert.equal(page.url.href, GAME_URL)
  assert.equal(page.observedAtMs, 1)

  assert.equal(page.parameters.get('page'), 'overview')
  assert.equal(page.parameters.get('cp'), '1000')
})

void test('an element a reader needs is required to be exactly one', () => {
  const page = pageOf(
    '<div class="only">one</div><div class="many">a</div><div class="many">b</div>',
  )
  assert.equal(page.one('.only').text(), 'one')

  const matches: [string, string][] = [
    ['.missing', 'Expected one .missing, found 0'],
    ['.many', 'Expected one .many, found 2'],
  ]
  for (const [selector, message] of matches)
    assert.throws(() => page.one(selector), { code: ErrorCode.ParseError, message }, selector)
})

void test('an attribute a reader needs is required to be there', () => {
  const page = pageOf('<span id="a" url="game.php?cp=7"></span><span id="b"></span>')
  assert.equal(page.attribute('#a', 'url'), 'game.php?cp=7')
  assert.throws(() => page.attribute('#b', 'url'), {
    code: ErrorCode.ParseError,
    message: 'Missing url on #b',
  })
})

void test('the markup and the property a reader needs are required to be there', () => {
  const page = pageOf('<span id="cell">x</span><span id="empty"></span>')
  assert.equal(requiredHtml(page.$('#cell'), 'cell'), 'x')

  assert.equal(requiredHtml(page.$('#empty'), 'cell'), '')
  assert.equal(requiredTagName(page.$('#cell')), 'SPAN')
  assert.throws(() => requiredHtml(page.$('.missing'), 'cell'), {
    code: ErrorCode.ParseError,
    message: 'Missing cell markup',
  })
  assert.throws(() => requiredTagName(page.$('.missing')), {
    code: ErrorCode.ParseError,
    message: 'Missing tagName on the selected element',
  })
  assert.throws(() => requiredTagName(page.$('#cell').contents()), {
    code: ErrorCode.ParseError,
    message: 'Missing tagName on the selected element',
  })
})

void test('a document states the planet it answers for, once', () => {
  const planet = pageOf('<span class="active_urlpalnet" url="cp=1000"></span>')
  assert.equal(planet.hasPlanet(), true)
  assert.equal(planet.planetId(), 1000)

  assert.equal(planet.planetId(), 1000)

  assert.equal(planet.optionalPlanetId(), 1000)
  assert.equal(pageOf('<p>no planet here</p>').hasPlanet(), false)
  assert.equal(pageOf('<p>no planet here</p>').optionalPlanetId(), null)
})

void test('a planet a document states but the address does not name is a decoding failure', () => {
  const broken = pageOf('<span class="active_urlpalnet" url="cp="></span>')
  assert.throws(() => broken.planetId(), {
    code: ErrorCode.ParseError,
    message: 'Expected a numeric value',
  })
  assert.throws(() => broken.optionalPlanetId(), {
    code: ErrorCode.ParseError,
    message: 'Expected a numeric value',
  })
})

void test('a document printing two planet markers states no single planet', () => {
  const page = pageOf(
    '<span class="active_urlpalnet" url="cp=1000"></span>' +
      '<span class="active_urlpalnet" url="cp=2000"></span>',
  )

  for (const read of [() => page.planetId(), () => page.optionalPlanetId()])
    assert.throws(read, {
      code: ErrorCode.ParseError,
      message: 'Expected one .active_urlpalnet[url], found 2',
    })
})

void test('the value of a rendered control is read by the name it submits as', () => {
  const page = pageOf(
    [
      '<input name="planet" value="Homeworld">',
      '<textarea name="notes">hello</textarea>',
      '<input name="empty" value="">',
      '<select name="multi" multiple><option value="1" selected>a</option>',
      '<option value="2" selected>b</option></select>',
    ].join(''),
  )
  assert.equal(page.fieldValue('planet'), 'Homeworld')
  assert.equal(page.fieldValue('notes'), 'hello')
  assert.equal(page.fieldValue('empty'), '')

  const absent: [string, string][] = [['missing', 'Missing missing form field']]
  for (const [name, message] of absent)
    assert.throws(() => page.fieldValue(name), { code: ErrorCode.ParseError, message }, name)

  assert.throws(() => page.fieldValue('multi'), {
    code: ErrorCode.ParseError,
    message: 'Ambiguous multi form field',
  })
})

void test('a page reports the mode it was asked for, and the default where none was named', () => {
  assert.equal(pageOf('<p>x</p>', `${GAME_URL}&mode=Show`).mode(), 'show')
  assert.equal(pageOf('<p>x</p>').mode(), 'show')
})

void test('the element an inline handler addresses is read from its call', () => {
  const page = pageOf('<p>x</p>')
  assert.equal(page.handlerId('Dialog.Playercard(4242)', 'Playercard'), 4242)
  assert.equal(page.handlerId('Dialog.PM(77);Dialog.Playercard(77, 1);', 'Playercard'), 77)
  assert.equal(page.handlerId('return Dialog.PM(8);', 'PM'), 8)

  assert.equal(page.handlerId('Dialog.Playercard(1); Dialog.Playercard(2);', 'Playercard'), null)
  assert.equal(page.handlerId('Dialog.Playercard("Homeworld")', 'Playercard'), null)
  assert.equal(page.handlerId('Dialog.Playercard(]x);', 'Playercard'), null)
  assert.equal(page.handlerId('Dialog.Playercard()', 'Playercard'), null)
  assert.equal(page.handlerId('Playercard(4242)', 'Playercard'), null)
  assert.equal(page.handlerId(undefined, 'Playercard'), null)
})

void test('a string an inline handler passes is read from its call', () => {
  const page = pageOf('<p>x</p>')
  assert.equal(page.handlerText('Dialog.setSubject("Homeworld")', 'setSubject'), 'Homeworld')
  assert.equal(
    page.handlerText('Dialog.setSubject("a"); Dialog.setSubject("b");', 'setSubject'),
    null,
  )
  assert.equal(page.handlerText('Dialog.setSubject(1)', 'setSubject'), null)
  assert.equal(page.handlerText('setSubject("Homeworld")', 'setSubject'), null)
  assert.equal(page.handlerText(undefined, 'setSubject'), null)
})

void test('a message is read from the block the endpoint prints a refusal into', () => {
  assert.equal(inContent('<div class="ally_contents">Refused</div>').message(), 'Refused')

  assert.equal(
    inContent('<p>before</p><div class="ally_contents">  <b>Refused</b> \n</div>').message(),
    'Refused',
  )
})

void test('a document with no message block reports none', () => {
  assert.equal(inContent('<div class="build_box">ok</div>').message(), null)

  assert.equal(inContent('<div><div class="ally_contents">Refused</div></div>').message(), null)
  assert.equal(inContent('<p>ok</p>').message(true), null)
})

void test('two message blocks are ambiguous rather than the first one', () => {
  const page = inContent('<div class="ally_contents">one</div><div class="ally_contents">two</div>')
  assert.throws(() => page.message(), {
    code: ErrorCode.ParseError,
    message: 'Ambiguous message page',
  })
})

void test('the public card is a message only for a receipt', () => {
  const index = pageOf(PUBLIC_CARD, INDEX_URL)
  assert.equal(index.message(true), 'Wrong password')
  assert.equal(index.message(), null)
})

void test('the card is read only on the scripts that render a refusal into it', () => {
  assert.equal(pageOf(PUBLIC_CARD, `${BASE_URL}admin.php`).message(true), 'Wrong password')

  assert.equal(pageOf(PUBLIC_CARD, GAME_URL).message(true), null)
  assert.equal(
    pageOf(PUBLIC_CARD, `${BASE_URL}sub/index.php?page=login`).message(true),
    'Wrong password',
  )
})

void test('the card is read only where it holds nothing but the message', () => {
  const shapes: [string, string][] = [
    ['no main', PUBLIC_CARD.replace('<main role="main">', '<div>').replace('</main>', '</div>')],
    ['two children of main', PUBLIC_CARD.replace('</main>', '<div>extra</div></main>')],
    ['no card', PUBLIC_CARD.replace('class="card mb-3"', 'class="panel"')],
    ['no card header', PUBLIC_CARD.replace('<h5 class="card-header">Login</h5>', '')],
    [
      'two children of the card body',
      PUBLIC_CARD.replace(
        '<p class="card-text">Wrong password</p>',
        '<p class="card-text">Wrong password</p><p>and more</p>',
      ),
    ],
  ]
  const controls = ['<form action="x"></form>', '<input name="a">', '<select name="a"></select>']
  for (const control of controls)
    shapes.push([
      `a control: ${control}`,
      PUBLIC_CARD.replace('<p class="card-text">Wrong password</p>', control),
    ])
  for (const [name, markup] of shapes)
    assert.equal(pageOf(markup, INDEX_URL).message(true), null, name)
})

void test('message receipts preserve visible breaks and collapse inline whitespace', () => {
  const page = inContent('<div class="ally_contents">  <b>Two<br>new</b>\n  <i>lines</i> </div>')
  assert.equal(page.message(), 'Two\nnew lines')
})

void test('a form is found by the page it submits to rather than by its address', () => {
  const page = inContent(
    [
      '<form action="game.php?page=settings&amp;mode=send"></form>',
      '<form action="https://other.example.com/play/game.php?page=settings"></form>',
      '<form action="game.php?page=other"></form>',
      '<form action="./settings.php?page=settings"></form>',
    ].join(''),
    `${BASE_URL}game.php?page=settings`,
  )
  assert.equal(page.form('settings').attr('action'), 'game.php?page=settings&mode=send')
})

void test('a form the page does not carry, or carries twice, is a decoding failure', () => {
  const settings = `${BASE_URL}game.php?page=settings`
  assert.throws(() => inContent('<p>none</p>', settings).form('settings'), {
    code: ErrorCode.ParseError,
    message: 'Missing or ambiguous settings form',
  })
  assert.throws(
    () =>
      inContent(
        '<form action="game.php?page=settings"></form><form action="game.php?page=settings"></form>',
        settings,
      ).form('settings'),
    { code: ErrorCode.ParseError, message: 'Missing or ambiguous settings form' },
  )
})

void test('an element icon names its id through the address it carries', () => {
  assert.equal(imageId('styles/theme/nsc/img/gebaeude/31.gif'), 31)
  assert.equal(imageId('styles/theme/nsc/img/resources/901.gif'), 901)
  assert.equal(imageId('styles/theme/nsc/img/gebaeude/31f.gif'), 31)
  assert.equal(imageId('styles/theme/nsc/img/GEBAEUDE/31.GIF'), 31)
  assert.equal(imageId('styles/theme/nsc/img/gebaeude/31.png'), 31)
  assert.equal(imageId('styles/theme/nsc/img/ship/31.gif'), null)
  assert.equal(imageId('no address at all'), null)
  assert.equal(imageId(undefined), null)
})

void test('the selectors name the two icon directories the templates use', () => {
  assert.equal(ELEMENT_ICON_SELECTOR, 'img[src*="gebaeude/"]')
  assert.equal(RESOURCE_ICON_SELECTOR, 'img[src*="resources/"]')
})

void test('an element icon a selector guaranteed is required to be readable', () => {
  assert.equal(elementId('gebaeude/31.gif'), 31)

  assert.throws(() => elementId(undefined), {
    code: ErrorCode.ParseError,
    message: 'Missing element image',
  })
  assert.throws(() => elementId('gebaeude/none.gif'), {
    code: ErrorCode.ParseError,
    message: 'Missing element image',
  })
})

void test('a catalogue row states the element it lists and the name it prints', () => {
  const page = pageOf(
    '<table><tr class="record"><td class="record_img_utits">' +
      '<img src="images/gebaeude/31.gif"></td>' +
      '<td class="record_name_utits"> Robotics <i>Factory</i> </td></tr></table>',
  )
  assert.deepEqual(recordEntry(page.$('tr.record')), {
    elementId: 31,
    name: 'Robotics Factory',
  })

  assert.throws(() => recordEntry(page.$('p')), {
    code: ErrorCode.ParseError,
    message: 'Missing element image',
  })
})

void test('a rendered text is read with its whitespace collapsed', () => {
  const page = pageOf('<p class="t">  a   <b>b</b>\n c </p>')
  assert.equal(textContent(page.$('.t')), 'a b c')
  assert.equal(textContent('  raw   string '), 'raw string')
  assert.equal(textContent(page.$('.missing')), '')
})

void test('a trailing parenthetical is split off the label it qualifies', () => {
  assert.deepEqual(splitTrailingParenthetical('Homeworld (Activity)'), {
    text: 'Homeworld',
    trailing: '(Activity)',
  })

  assert.deepEqual(splitTrailingParenthetical('Homeworld'), {
    text: 'Homeworld',
    trailing: null,
  })
  assert.deepEqual(splitTrailingParenthetical('(Activity)').trailing, null)
  assert.deepEqual(splitTrailingParenthetical('Homeworld (a) (b)'), {
    text: 'Homeworld (a)',
    trailing: '(b)',
  })
})

void test('a text a reader needs is required not to be blank', () => {
  const page = pageOf('<p class="t"> Homeworld </p><p class="blank"> </p>')
  assert.equal(requiredText(page.$('.t'), 'planet name'), 'Homeworld')
  assert.throws(() => requiredText(page.$('.blank'), 'planet name'), {
    code: ErrorCode.ParseError,
    message: 'Missing planet name',
  })
})

void test('a rendered address is resolved against the response that carried it', () => {
  assert.equal(responseUrl('./index.php', new URL(GAME_URL)).href, `${BASE_URL}index.php`)
  assert.equal(
    responseUrl('https://other.example.com/x', new URL(GAME_URL)).href,
    'https://other.example.com/x',
  )

  assert.throws(() => responseUrl(undefined, new URL(GAME_URL)), {
    code: ErrorCode.ParseError,
    message: 'Missing response URL',
  })
  assert.throws(() => responseUrl('http://', new URL(GAME_URL)), {
    code: ErrorCode.ParseError,
    message: 'Invalid response URL',
  })
})

void test('an attribute a selector guaranteed is required to be on the element', () => {
  const page = pageOf('<a class="l" href="./notes.php?id=4">x</a><a class="n">y</a>')
  assert.equal(requiredAttribute(page.$('.l'), 'href'), './notes.php?id=4')
  assert.throws(() => requiredAttribute(page.$('.n'), 'href'), {
    code: ErrorCode.ParseError,
    message: 'Missing href on the selected element',
  })
})

void test('a link is resolved against the page that rendered it', () => {
  const page = pageOf('<a class="l" href="./notes.php?id=4">x</a>')
  assert.equal(linkUrl(page, page.$('.l')).href, `${BASE_URL}notes.php?id=4`)
})

void test('an id a link carries is read, and a link that states none reports none', () => {
  const page = pageOf(
    '<a class="l" href="./game.php?page=playerCard&amp;id=4242">x</a>' +
      '<a class="d" href="./game.php?page=x">y</a>' +
      '<a class="e" href="./game.php?page=x&amp;start=">z</a>',
  )
  assert.equal(linkId(page, '.l'), 4242)

  assert.equal(linkId(page, '.l', 'id'), 4242)

  assert.equal(linkId(page, '.missing'), null)
  assert.equal(linkId(page, '.d'), null)
  assert.equal(linkId(page, '.e', 'start'), null)
  assert.equal(linkId(page, '.l', 'cp'), null)
})

void test('a parameter a link states unreadably is a decoding failure', () => {
  const page = pageOf('<a class="l" href="./game.php?page=x&amp;start=soon">x</a>')
  assert.throws(() => linkId(page, '.l', 'start'), {
    code: ErrorCode.ParseError,
    message: 'Expected a numeric value',
  })
})

void test('a required link id is a decoding failure where the link does not carry one', () => {
  const page = pageOf(
    '<a class="d" href="./game.php?page=x">y</a>' +
      '<a class="e" href="./game.php?page=x&amp;start=">z</a>',
  )
  assert.throws(() => requiredLinkId(page, page.$('.d')), {
    code: ErrorCode.ParseError,
    message: 'Missing id on the link',
  })

  assert.throws(() => requiredLinkId(page, page.$('.e'), 'start'), {
    code: ErrorCode.ParseError,
    message: 'Missing start on the link',
  })
})

void test('an id is read only from a link this document itself rendered', () => {
  for (const href of [
    './playerCard.php?id=4242',
    'https://other.example.com/play/game.php?id=4242',
  ]) {
    const page = pageOf(`<a class="l" href="${href}">x</a>`)
    assert.throws(() => linkId(page, '.l'), {
      code: ErrorCode.ParseError,
      message: 'Link outside the document',
    })
  }
})

void test('the options a control offers are read with the labels the template rendered', () => {
  const page = pageOf(
    '<select name="theme"><option value="dark">Dark</option>' +
      '<option value="light" selected> Light </option>' +
      '<option disabled value="old">Old</option></select>',
  )
  assert.deepEqual(selectOptions(page, 'select[name="theme"]'), [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'old', label: 'Old' },
  ])
  assert.deepEqual(selectOptions(page, 'select[name="missing"]'), [])
})

void test('a control listing ids reports each option as the number it submits', () => {
  const page = pageOf(
    '<select name="rank"><option value="1">Recruit</option>' +
      '<option value="7" selected>Officer</option></select>',
  )
  assert.deepEqual(integerOptions(page.$('select[name="rank"]'), 1), [
    { value: 1, label: 'Recruit' },
    { value: 7, label: 'Officer' },
  ])

  const belowFloor = pageOf('<select name="rank"><option value="0">None</option></select>')
  assert.throws(() => integerOptions(belowFloor.$('select'), 1), {
    code: ErrorCode.ParseError,
    message: 'Expected a safe integer of at least 1',
  })
  const unreadable = pageOf('<select name="rank"><option value="">Blank</option></select>')
  assert.throws(() => integerOptions(unreadable.$('select'), 1), {
    code: ErrorCode.ParseError,
    message: 'Expected a numeric value',
  })
})

void test('each rendered option is reported with the element that rendered it', () => {
  const page = pageOf('<select><option value="1">a</option><option value="2">b</option></select>')
  const rendered = renderedOptions(page.$('select'))
  assert.equal(rendered.length, 2)
  assert.deepEqual(
    rendered.map(({ option }) => option.attr('value')),
    ['1', '2'],
  )

  assert.deepEqual(
    rendered.map(({ node }) => page.$(node).attr('value')),
    ['1', '2'],
  )
  assert.deepEqual(controlOptions(page.$('select')), [
    { value: '1', label: 'a' },
    { value: '2', label: 'b' },
  ])
})

void test('the rows of a table are its data rows, not its empty-state message', () => {
  const page = pageOf(
    [
      '<table class="t">',
      '<tr><td>a</td><td>b</td></tr>',
      '<tr><td colspan="2">Nothing here</td></tr>',
      '<tr></tr>',
      '<tr><td colspan="1">kept</td></tr>',
      '</table>',
    ].join(''),
  )
  const rows = tableRows(page, 'table.t tr')
  assert.equal(rows.length, 2)

  assert.deepEqual(
    rows.map((row) => textContent(row)),
    ['ab', 'kept'],
  )
})

void test('an id is read out of the literal prefix its own template wrote it with', () => {
  const page = pageOf(
    [
      '<div id="s_202"></div>',
      '<div id="u000"></div>',
      '<div id="tabs-3"></div>',
      '<div id="mes_100"></div>',
    ].join(''),
  )
  const idOf = (selector: string): string => requiredAttribute(page.$(selector), 'id')
  assert.equal(prefixedId(idOf('#s_202'), 's_', 1), 202)
  assert.equal(prefixedId(idOf('#mes_100'), 'mes_'), 100)

  assert.equal(prefixedId(idOf('#u000'), 'u'), 0)
  assert.equal(prefixedId(idOf('#tabs-3'), 'tabs-'), 3)

  assert.throws(() => prefixedId('s_', 's_', 1), {
    code: ErrorCode.ParseError,
    message: 'Expected a numeric value',
  })
})

void test('a ship or resource table row reports its icon and its count control', () => {
  const page = pageOf(
    [
      '<table class="s">',
      '<tr><td><img src="images/ship/202.gif"></td>',
      '<td><span class="reducefleet_count_ship">12</span></td></tr>',
      '<tr><td>no icon</td><td>no control</td></tr>',
      '</table>',
    ].join(''),
  )
  const rows = shipTableRows(page.$('table.s'))
  assert.equal(rows.length, 2)
  assert.equal(rows[0]!.icon, 'images/ship/202.gif')
  assert.equal(textContent(rows[0]!.count), '12')

  assert.equal(rows[1]!.icon, null)
  assert.equal(rows[1]!.count.length, 0)
})

void test('a tooltip is read as a page of its own, parsed once per response', () => {
  const page = pageOf(
    [
      '<div id="a" data-tooltip-content="<span>1 / 2</span>"></div>',
      '<div id="b" data-tooltip-content="<span>1 / 2</span>"></div>',
      '<div id="c" data-tooltip-content="<span>3 / 4</span>"></div>',
      '<div id="d"></div>',
    ].join(''),
  )
  const first = tooltipPage(page, page.$('#a'))
  assert.equal(textContent(first.$('span')), '1 / 2')

  assert.equal(tooltipPage(page, page.$('#b')), first)
  assert.notEqual(tooltipPage(page, page.$('#c')), first)

  assert.equal(textContent(tooltipPage(page, page.$('#d')).$('span')), '')

  const other = pageOf('<div id="a" data-tooltip-content="<span>1 / 2</span>"></div>')
  assert.notEqual(tooltipPage(other, other.$('#a')), first)

  assert.equal(first.observedAtMs, page.observedAtMs)
  assert.equal(first.url.href, page.url.href)
})

void test('a document nested past the call stack propagates its RangeError', () => {
  const depth = 20_000
  const response = httpResponse({
    body: '<div>'.repeat(depth) + 'x' + '</div>'.repeat(depth),
  })
  try {
    observe(response, () => textContent(parsePage(response).$('body')))
    assert.fail('expected a refusal')
  } catch (error) {
    assert.ok(error instanceof RangeError)
  }
})

void test('a page reader that fails names the failure as a protocol one', () => {
  const page = pageOf('<p>x</p>')
  try {
    page.one('.missing')
    assert.fail('expected a refusal')
  } catch (error) {
    assert.ok(error instanceof OperationError)
    assert.equal(error.code, ErrorCode.ParseError)
    assert.match(error.message, /Expected one \.missing, found 0/)
  }
})
