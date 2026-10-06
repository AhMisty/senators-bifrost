import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../src/index.ts'
import {
  ErrorCode,
  controlValue,
  fieldValue,
  requiredFieldValue,
  formFields,
  hasSubmitControl,
  isDisabled,
  optionValue,
  parsePage,
  selectedOptions,
} from '../../src/index.ts'
import { BASE_URL, httpResponse } from '../helpers.ts'

const PAGE_URL = `${BASE_URL}game.php?page=settings`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body }, PAGE_URL))
}

const FORM = [
  '<form action="./settings.php?page=settings">',
  '<input name="username" value="AhMisty">',
  '<input name="password" type="password">',
  '<input name="queueMessages" type="checkbox" value="1" checked>',
  '<input name="spyMessagesMode" type="checkbox" value="1">',
  '<input name="nothing" disabled value="x">',
  '<input name="submitted" type="submit" value="Save">',
  '<input name="upload" type="file">',
  '<input type="text" value="unnamed">',
  '<textarea name="text"> hello </textarea>',
  '<select name="single"><option value="a">A</option><option value="b" selected>B</option></select>',
  '<select name="multi" multiple><option value="1" selected>one</option>',
  '<option value="2" selected>two</option><option value="3">three</option></select>',
  '<select name="mixed" multiple><option value="1" selected disabled>one</option>',
  '<option value="2" selected>two</option></select>',
  '<select name="frozen"><option value="x" disabled>X</option></select>',
  '<button name="do" type="button">Do</button>',
  '</form>',
].join('')

void test('a field’s value is read by the name it submits as', () => {
  const form = pageOf(FORM).$('form')
  assert.equal(fieldValue(form, 'username'), 'AhMisty')

  assert.equal(fieldValue(form, 'text'), ' hello ')

  assert.equal(
    fieldValue(pageOf('<input name="agree" type="checkbox" checked>').$('body'), 'agree'),
    'on',
  )
})

void test('a field name is read as the name it is, not as selector syntax', () => {
  assert.throws(() => fieldValue(pageOf(FORM).$('form'), 'a"b'), {
    code: ErrorCode.ParseError,
    message: 'Missing a"b form field',
  })
})

void test('a field that is not there exactly once has no single value', () => {
  const form = pageOf(FORM).$('form')

  assert.throws(() => fieldValue(form, 'missing'), {
    code: ErrorCode.ParseError,
    message: 'Missing missing form field',
  })
  assert.throws(
    () => fieldValue(pageOf('<input name="a" value="1"><input name="a" value="2">').$('body'), 'a'),
    { code: ErrorCode.ParseError, message: 'Missing a form field' },
  )
})

void test('empty fields remain empty unless the protocol requires a value', () => {
  const form = pageOf(FORM).$('form')
  assert.equal(fieldValue(form, 'password'), '')
  assert.throws(() => requiredFieldValue(form, 'password'), {
    code: ErrorCode.ParseError,
    message: 'Missing password form value',
  })
})

void test('a control reporting several values has no single reading', () => {
  assert.throws(() => fieldValue(pageOf(FORM).$('form'), 'multi'), {
    code: ErrorCode.ParseError,
    message: 'Ambiguous multi form field',
  })
  assert.equal(fieldValue(pageOf('<select name="m" multiple></select>').$('body'), 'm'), '')
})

void test('the values a control submits are its selected options', () => {
  const page = pageOf(FORM)
  assert.equal(controlValue(page.$('select[name="single"]')), 'b')
  assert.deepEqual(controlValue(page.$('select[name="multi"]')), ['1', '2'])

  const chosen = page.$('select[name="multi"]').find('option').filter('[selected]')
  assert.deepEqual(controlValue(page.$('select[name="multi"]'), chosen.eq(0)), ['1'])
})

void test('a select nothing is selected in stands at its first usable option', () => {
  const page = pageOf(
    '<select name="theme"><option value="old" disabled>Old</option>' +
      '<option value="dark">Dark</option><option value="light">Light</option></select>' +
      '<select name="empty"></select>' +
      '<select name="wide" size="3"><option value="a">A</option></select>',
  )
  assert.equal(controlValue(page.$('select[name="theme"]')), 'dark')

  assert.equal(controlValue(page.$('select[name="empty"]')), '')

  assert.equal(controlValue(page.$('select[name="wide"]')), '')
})

void test('the option a control stands at is read on its own', () => {
  const page = pageOf(
    '<select name="single"><option value="a">A</option><option value="b" selected>B</option></select>' +
      '<select name="multi" multiple><option value="1" selected>one</option><option value="2" selected>two</option></select>',
  )

  const valuesOf = (selector: string): (string | undefined)[] =>
    selectedOptions(page.$(selector))
      .toArray()
      .map((node) => page.$(node).attr('value'))
  assert.deepEqual(valuesOf('select[name="single"]'), ['b'])

  assert.deepEqual(valuesOf('select[name="multi"]'), ['1', '2'])
})

void test('a control is read the way a browser reads it', () => {
  const page = pageOf('<input name="a" value="typed"><textarea name="b">  spaced  </textarea>')
  assert.equal(controlValue(page.$('input[name="a"]')), 'typed')
  assert.equal(controlValue(page.$('textarea[name="b"]')), '  spaced  ')
})

void test('an option submits the value the template wrote, or its own text', () => {
  const page = pageOf(
    '<select name="s"><option>Plain</option><option value="v">Valued</option></select>',
  )
  assert.equal(optionValue(page.$('option').eq(0)), 'Plain')
  assert.equal(optionValue(page.$('option').eq(1)), 'v')
})

void test('a form submits its successful controls, in the order it renders them', () => {
  const page = pageOf(FORM)
  assert.deepEqual(
    [...formFields(page, page.$('form'))],
    [
      ['username', 'AhMisty'],
      ['password', ''],
      ['queueMessages', '1'],
      ['text', ' hello '],
      ['single', 'b'],
      ['multi', '1'],
      ['multi', '2'],
      ['mixed', '2'],
    ],
  )
})

void test('form submission treats input types as case insensitive and omits empty names', () => {
  const page = pageOf(
    '<form><input name="unchecked" type="CHECKBOX">' +
      '<input name="checked" type="CHECKBOX" checked>' +
      '<input name="submitted" type="Submit" value="Save">' +
      '<input name="upload" type="FILE">' +
      '<input name="" value="ignored"><input name="kept" value="1"></form>',
  )
  assert.deepEqual(
    [...formFields(page, page.$('form'))],
    [
      ['checked', 'on'],
      ['kept', '1'],
    ],
  )
})

void test('a select the template disabled entirely submits nothing', () => {
  const page = pageOf(
    '<form><input name="kept" value="1"><select name="frozen"><option disabled>X</option></select></form>',
  )
  assert.deepEqual([...formFields(page, page.$('form'))], [['kept', '1']])
})

void test('a field inside a disabled fieldset is not submitted', () => {
  const page = pageOf(
    '<form><fieldset disabled><legend><input name="escaping" value="1"></legend>' +
      '<input name="trapped" value="2"></fieldset></form>',
  )

  assert.deepEqual([...formFields(page, page.$('form'))], [['escaping', '1']])
})

void test('a form is submitted by the control the caller named, not by any of them', () => {
  const page = pageOf(
    '<form action="./settings.php?page=settings"><input name="id" value="1">' +
      '<button type="submit">Buy</button></form>',
  )

  assert.equal(hasSubmitControl(page, page.$('input[name="id"]')), true)

  const bare = pageOf(
    '<form action="./settings.php?page=settings"><input name="id" value="1"></form>',
  )
  assert.equal(hasSubmitControl(bare, bare.$('input[name="id"]')), false)

  assert.equal(hasSubmitControl(bare, bare.$('p')), false)
})

void test('a submit control counts only where it can actually submit', () => {
  const controls = '<input name="id" value="1">'
  const shaped: [string, boolean][] = [
    ['<button type="submit">Buy</button>', true],
    ['<button>Buy</button>', true],
    ['<input type="submit" value="Buy">', true],
    ['<input type="image" src="./buy.png">', true],
    ['<button type="button">Buy</button>', false],
    ['<input type="text" value="Buy">', false],
    ['<button type="submit" disabled>Buy</button>', false],
    ['', false],
  ]
  for (const [button, expected] of shaped) {
    const page = pageOf(`<form action="./settings.php?page=settings">${controls}${button}</form>`)
    assert.equal(
      hasSubmitControl(page, page.$('input[name="id"]')),
      expected,
      button || 'no button',
    )
  }
})

void test('a disabled control is not a control that can submit', () => {
  const page = pageOf(
    '<form action="./settings.php?page=settings"><input name="id" value="1" disabled>' +
      '<button type="submit">Buy</button></form>',
  )
  assert.equal(hasSubmitControl(page, page.$('input[name="id"]')), false)

  assert.equal(hasSubmitControl(page, page.$('.nothing')), false)
})

void test('a disabled control is read as disabled however the template disabled it', () => {
  const page = pageOf(
    [
      '<input id="plain" disabled>',
      '<select id="grouped"><optgroup disabled><option id="groupedOption">X</option></optgroup></select>',
      '<fieldset disabled><input id="trapped">',
      '<legend><input id="escaping"></legend></fieldset>',
      '<fieldset disabled><input id="legendsFieldset"><legend><input id="inLegend2"></legend></fieldset>',
      '<input id="free">',
    ].join(''),
  )
  assert.equal(isDisabled(page, page.$('#plain')), true)

  assert.equal(isDisabled(page, page.$('#groupedOption')), true)
  assert.equal(isDisabled(page, page.$('#trapped')), true)

  assert.equal(isDisabled(page, page.$('#escaping')), false)
  assert.equal(isDisabled(page, page.$('#inLegend2')), false)
  assert.equal(isDisabled(page, page.$('#free')), false)
})
