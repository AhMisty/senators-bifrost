import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseHtml, Selection } from '../../src/protocol/selection.ts'

void test('fragment queries preserve text nodes and CSS relationships', () => {
  const $ = parseHtml('<section><p class="one">A<b>B</b></p><p>C</p></section>')
  assert.equal($('body > section').length, 1)
  assert.equal($('section').children('p').length, 2)
  assert.equal($('p').not('.one').text(), 'C')
  assert.equal($('p').first().next('p').text(), 'C')
  assert.equal($('p').last().next().length, 0)
  assert.equal($('b').closest('section').length, 1)
  assert.equal($('b').closest('aside').length, 0)
  assert.equal($('p').first().siblings('p').text(), 'C')
  assert.equal($('p').slice(1).text(), 'C')
  const text = $('p').first().contents().node()
  assert.ok(text)
  assert.equal($(text).attr('id'), undefined)
  assert.equal($(text).html(), null)
  assert.equal($(text).children().length, 0)
  assert.equal($(text).contents().length, 0)
  assert.equal($(text).filter('b').length, 0)
  assert.equal($(text).is('b'), false)
  assert.equal($(text).not('b').length, 1)
  assert.equal($(text).hasClass('one'), false)
})

void test('empty selections remain empty when inspecting or changing nodes', () => {
  const empty = new Selection([])
  assert.equal(empty.node(), undefined)
  assert.equal(empty.attr('id'), undefined)
  assert.equal(empty.html(), null)
  assert.equal(empty.text(), '')
  assert.equal(empty.first().length, 0)
  assert.equal(empty.last().length, 0)
  assert.equal(empty.parent().length, 0)
  assert.equal(empty.parents('section').length, 0)
  assert.equal(empty.siblings('p').length, 0)
  assert.equal(empty.next().length, 0)
  empty.append(empty)
})

void test('cloning and moving nodes keep the original response tree independent', () => {
  const $ = parseHtml('<main><p>A<span>B</span></p><section></section></main>')
  const copy = $('p').clone()
  copy.find('span').remove()
  assert.equal(copy.text(), 'A')
  assert.equal($('p').text(), 'AB')
  $('section').append(copy)
  assert.equal($('section > p').text(), 'A')
  assert.equal(copy.parent('section').length, 1)
  assert.equal(copy.parent('aside').length, 0)
  const text = copy.contents().node()
  assert.ok(text)
  $(text).append($('span'))
  assert.equal($('span').length, 1)
  const detached = parseHtml('<i>D</i>')('i').clone()
  assert.equal(detached.parent().length, 0)
})

void test('compiled selectors observe changes and do not share matches between documents', () => {
  const $ = parseHtml('<form><input type="checkbox"></form>')
  const form = $('form')
  const selector = 'form:has(input:checked)'
  assert.equal(form.is(selector), false)
  assert.equal(form.filter(selector).length, 0)
  const input = $('input').node()
  assert.ok(input)
  input.attribs.checked = ''
  assert.equal(form.is(selector), true)
  assert.equal(form.filter(selector).length, 1)
  assert.equal(parseHtml('<form><input type="checkbox"></form>')('form').is(selector), false)
  delete input.attribs.checked
  assert.equal(form.is(selector), false)
  assert.equal(form.not(selector).length, 1)
})

void test('relative and scoped queries retain their own selection context', () => {
  const $ = parseHtml(
    '<main><section><b>A</b><i><b>B</b></i></section><section><b>C</b></section></main>',
  )
  assert.equal($('section').first().find('> b').text(), 'A')
  assert.equal($('section').last().find(':scope > b').text(), 'C')
  assert.equal($('section').first().find('> b, > i').text(), 'AB')
})

void test('selector cache eviction retains correct matches', () => {
  const node = parseHtml('<b class="cache-target">A</b>')('b')
  for (let index = 0; index <= 1024; index++) assert.equal(node.is(`.cache-absent-${index}`), false)
  assert.equal(node.is('.cache-target'), true)
  assert.equal(node.is('.cache-target'), true)
})
