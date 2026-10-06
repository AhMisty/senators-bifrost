import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../src/index.ts'
import { ErrorCode, handlerAddress, parsePage } from '../../src/index.ts'
import { httpResponse } from '../helpers.ts'

function pageOf(): Page {
  return parsePage(httpResponse({ body: '<p>x</p>' }))
}

void test('an address carries a handler only where it spells the scheme out', () => {
  assert.equal(handlerAddress('javascript:Dialog.Playercard(4242)'), 'Dialog.Playercard(4242)')

  assert.equal(handlerAddress('JavaScript:Dialog.Playercard(4242)'), 'Dialog.Playercard(4242)')
  assert.equal(handlerAddress('JAVASCRIPT:void 0'), 'void 0')

  assert.equal(handlerAddress('javascript:'), '')
})

void test('an address that names no inline handler carries none', () => {
  assert.equal(handlerAddress(undefined), null)
  assert.equal(handlerAddress('./game.php?page=overview'), null)
  assert.equal(handlerAddress('mailto:a@b.example'), null)

  assert.equal(handlerAddress('/play/javascript:game.php'), null)
})

void test('the static arguments of a call are read without executing the handler', () => {
  const page = pageOf()
  assert.deepEqual(page.handlerCalls('Price901("601", 1000);', 'Price901'), [['601', '1000']])

  assert.deepEqual(page.handlerCalls('a(1);a(2);', 'a'), [['1'], ['2']])

  assert.deepEqual(page.handlerCalls('a(9007199254740993)', 'a'), [['9007199254740993']])
})

void test('a handler that returns a call names the same call as one that makes it', () => {
  const page = pageOf()
  assert.deepEqual(page.handlerCalls('return Price901("601", 1000);', 'Price901'), [
    ['601', '1000'],
  ])

  assert.deepEqual(page.handlerCalls('Price901("601", 1000); // buy one', 'Price901'), [
    ['601', '1000'],
  ])
})

void test('an address that holds the handler has its scheme taken off first', () => {
  const page = pageOf()
  assert.deepEqual(page.handlerCalls('javascript:Price901("601", 1000)', 'Price901'), [
    ['601', '1000'],
  ])

  const body = handlerAddress('javascript:Price901("601", 1000)')
  assert.deepEqual(page.handlerCalls(body ?? '', 'Price901'), [['601', '1000']])
})

void test('a call the handler does not make is not reported', () => {
  const page = pageOf()
  assert.deepEqual(page.handlerCalls('Price901("601", 1000);', 'Price902'), [])

  assert.deepEqual(page.handlerCalls('Dialog.Price901("601", 1000);', 'Price901'), [])
})

void test('a call whose arguments are not static has no reading', () => {
  const computed: [string, string][] = [
    ['Price901(id, 100)', 'Executable data is not supported: Identifier'],
    ['Price901(...amounts)', 'Non-static call argument'],
    ['Price901(1 + 2)', 'Executable data is not supported: BinaryExpression'],
  ]
  const page = pageOf()
  for (const [source, message] of computed)
    assert.throws(
      () => page.handlerCalls(source, 'Price901'),
      { code: ErrorCode.ParseError, message },
      source,
    )
})

void test('a handler the browser could not have run is a decoding failure', () => {
  assert.throws(() => pageOf().handlerCalls('Price901(]x);', 'Price901'), {
    code: ErrorCode.ParseError,
    message: 'Invalid script',
  })
})

void test('the one call a handler holds is read from it', () => {
  const page = pageOf()
  assert.deepEqual(page.staticCall('GetOfficerTime(601, 120);', 'GetOfficerTime'), ['601', '120'])

  assert.throws(() => page.staticCall('F(1); F(2);', 'F'), {
    code: ErrorCode.ParseError,
    message: /Ambiguous inline handler/,
  })
  assert.throws(() => page.staticCall('G(1);', 'F'), {
    code: ErrorCode.ParseError,
    message: 'Ambiguous inline handler',
  })
})
