import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Comment } from 'domhandler'

import { parseHtmlDocument } from '../../src/protocol/html.ts'
import { parseHtml } from '../../src/protocol/selection.ts'

void test('HTML text and attributes decode character references exactly once', () => {
  const $ = parseHtml(
    '<DIV TITLE="&notit; &notin; &amp;copy;" title="ignored">' +
      '&amp; &#169; &#x1f600; &notin; &amp;copy;' +
      '<textarea>A&amp;&lt;td&gt;&#169;</textarea></DIV>',
  )
  assert.equal($('div').attr('title'), '&notit; ∉ &copy;')
  assert.equal($('div').contents().first().text(), '& © 😀 ∉ &copy;')
  assert.equal($('textarea').text(), 'A&<td>©')
  assert.equal($('textarea').children().length, 0)
})

void test('raw script and style bodies preserve entities and markup source', () => {
  const source = 'const raw = "&amp;&#169;"; if (a < b) raw += "<div>";'
  const $ = parseHtml(`<script>${source}</script><style>p::before{content:"&amp;"}</style>`)
  assert.equal($('script').text(), source)
  assert.equal($('style').text(), 'p::before{content:"&amp;"}')
  assert.equal($('script').children().length, 0)
})

void test('attribute names cannot replace a DOM attribute record prototype', () => {
  const $ = parseHtml('<div __proto__="&amp;copy;" constructor="label" __proto__="ignored"></div>')
  const node = $('div').node()
  assert.ok(node)
  assert.equal(Object.getPrototypeOf(node.attribs), Object.prototype)
  assert.equal(Object.hasOwn(node.attribs, '__proto__'), true)
  assert.equal(node.attribs.__proto__, '&copy;')
  assert.equal(node.attribs.constructor, 'label')
})

void test('fragments gain containers while full documents keep one body and declarations', () => {
  const fragment = parseHtmlDocument('<!DOCTYPE html>before<span>A</span>after')
  assert.equal(fragment.children[0]?.type, 'directive')
  const $ = parseHtml(
    '<!DOCTYPE html><html><head><title>T</title></head><body>A<br>B</body></html>',
  )
  assert.equal($('body').length, 1)
  assert.equal($('body').text(), 'AB')
  assert.equal($('head > title').text(), 'T')
  const contents = parseHtml('<section>before<span>A</span>after</section>')
  assert.equal(contents('body > section').length, 1)
  assert.equal(contents('section').contents().length, 3)
  assert.equal(contents('section').text(), 'beforeAafter')
})

void test('comments and foreign XML tokens retain their node data', () => {
  const $ = parseHtml('<svg><?xml version="1.0"?><![CDATA[A < B &amp;]]><g /></svg><!--&amp;-->')
  assert.equal($('svg').text(), 'A < B &amp;')
  assert.equal($('svg > g').length, 1)
  assert.equal($('svg').contents().first().node()?.type, 'directive')
  const comment = $('body').contents().last().node()
  assert.ok(comment instanceof Comment)
  assert.equal(comment.data, '&amp;')
})

void test('nested table rows and sections remain inside their enclosing cells', () => {
  const $ = parseHtml(
    '<table id="outer"><tbody><tr><td>' +
      '<table id="inner"><thead><tr><th>Level</th><th>Storage</th></tr></thead>' +
      '<tbody><tr><td>2</td><td>100.000</td></tr></tbody></table>' +
      '</td></tr></tbody></table>',
  )
  assert.equal($('#outer > tbody > tr > td > #inner').length, 1)
  assert.equal($('#inner > thead > tr').children('th').text(), 'LevelStorage')
  assert.equal($('#inner > tbody > tr').children('td').text(), '2100.000')
  assert.equal($('#inner').parents('table').node(), $('#outer').node())
})

void test('title decodes RCDATA while xmp retains literal markup and entities', () => {
  const $ = parseHtml('<title>A&lt;b&gt; &amp; <i>B</i></title><xmp>A&lt;b&gt; <i>B</i></xmp>')
  assert.equal($('title').text(), 'A<b> & <i>B</i>')
  assert.equal($('title').children().length, 0)
  assert.equal($('xmp').text(), 'A&lt;b&gt; <i>B</i>')
  assert.equal($('xmp').children().length, 0)
})

void test('omitted cell and row ends preserve siblings within their nearest table', () => {
  const $ = parseHtml(
    '<table id="outer"><tr><td>outer<table id="inner"><tr><th>H<th>I<tr><td>A<td>B</table>' +
      '<td>tail<tr><td>C<td>D</table>',
  )
  assert.deepEqual(
    $('#inner > tr')
      .toArray()
      .map((node) =>
        $(node)
          .children()
          .toArray()
          .map((cell) => $(cell).text()),
      ),
    [
      ['H', 'I'],
      ['A', 'B'],
    ],
  )
  assert.deepEqual(
    $('#outer > tr')
      .toArray()
      .map((node) =>
        $(node)
          .children('td')
          .toArray()
          .map((cell) => $(cell).text()),
      ),
    [
      ['outerHIAB', 'tail'],
      ['C', 'D'],
    ],
  )
  assert.equal($('#inner').parent().node(), $('#outer > tr > td').first().node())
})

void test('omitted section ends and an unwrapped cell close before the next table row', () => {
  const $ = parseHtml(
    '<table id="sections"><thead><tr><th>Head<tbody><tr><td>Body<tfoot><tr><td>Foot</table>' +
      '<table id="unwrapped"><td>Before<span>X</span><tr><td>After</table>' +
      '<td>First<td>Second',
  )
  assert.equal($('#sections > thead > tr > th').text(), 'Head')
  assert.equal($('#sections > tbody > tr > td').text(), 'Body')
  assert.equal($('#sections > tfoot > tr > td').text(), 'Foot')
  assert.equal($('#unwrapped > td').text(), 'BeforeX')
  assert.equal($('#unwrapped > tr > td').text(), 'After')
  assert.equal($('body > td').length, 2)
  assert.equal($('body > td').text(), 'FirstSecond')
})

void test('foreignObject restores SVG parsing after its HTML integration content', () => {
  const $ = parseHtml(
    '<svg><foreignObject><div>A<br><span>B</span></div></foreignObject>' +
      '<g><path /><circle /></g></svg><div>After</div>',
  )
  assert.equal($('svg > foreignobject > div').text(), 'AB')
  assert.equal($('svg > foreignobject > div > br').length, 1)
  assert.equal($('svg > g > path').length, 1)
  assert.equal($('svg > g > circle').length, 1)
  assert.equal($('body > div').text(), 'After')
})
