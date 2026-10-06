import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ErrorCode,
  addressParams,
  coordinate,
  coordinateIn,
  formatCoordinate,
  matchCoordinate,
  parseCoordinate,
  readLocationType,
} from '../../src/index.ts'

void test('a rendered coordinate is read bracketed or bare', () => {
  assert.deepEqual(matchCoordinate('[1:2:3]'), { galaxy: 1, system: 2, planet: 3 })
  assert.deepEqual(matchCoordinate('1:2:3'), { galaxy: 1, system: 2, planet: 3 })
  assert.deepEqual(matchCoordinate(' [4:5:6] '), { galaxy: 4, system: 5, planet: 6 })
})

void test('a text that is not a coordinate states none', () => {
  for (const text of ['[1:2:3', '1:2:3]', '1:2', 'a:b:c', '', '0:1:1', '1:0:1', '1:1:0', '1:2:3:4'])
    assert.equal(matchCoordinate(text), null, text)
  assert.equal(matchCoordinate('1:2:99999999999999999999'), null)
})

void test('a rendered coordinate the caller asked for raises where it is unreadable', () => {
  assert.deepEqual(coordinate('[7:8:9]'), { galaxy: 7, system: 8, planet: 9 })
  assert.throws(() => coordinate('nowhere'), {
    code: ErrorCode.ParseError,
    message: 'Invalid coordinates',
  })
})

void test('a bracketed coordinate wins over a bare one beside it', () => {
  assert.deepEqual(coordinateIn('[1:2:3]'), { galaxy: 1, system: 2, planet: 3 })
  assert.deepEqual(coordinateIn('5:6:7'), { galaxy: 5, system: 6, planet: 7 })
  assert.deepEqual(coordinateIn('Homeworld [1:2:3] 9:9:9'), { galaxy: 1, system: 2, planet: 3 })
  assert.equal(coordinateIn('Homeworld'), null)
})

void test('a coordinate travels as the three fields the game address expects', () => {
  assert.deepEqual(addressParams({ galaxy: 1, system: 2, planet: 3 }), {
    galaxy: '1',
    system: '2',
    planet: '3',
  })
})

void test('a target body is one of the three the endpoint names', () => {
  for (const value of [1, 2, 3] as const) assert.equal(readLocationType(value), value)
  for (const value of [0, 4, -1, 1.5])
    assert.throws(
      () => readLocationType(value),
      { code: ErrorCode.ParseError, message: 'Unknown target type' },
      `refused ${value}`,
    )
})

void test('a written coordinate is the three parts the endpoint requires', () => {
  assert.equal(formatCoordinate({ galaxy: 1, system: 2, planet: 3 }), '1:2:3')
  assert.equal(formatCoordinate({ galaxy: 42, system: 499, planet: 15 }), '42:499:15')
})

void test('coordinate formatting leaves business limits to the server', () => {
  assert.equal(formatCoordinate({ galaxy: 0, system: 2, planet: 3 }), '0:2:3')
  assert.equal(formatCoordinate({ galaxy: 1, system: 2, planet: 0.5 }), '1:2:0.5')
})

void test('a stated coordinate is read from its text, bracketed or bare', () => {
  assert.deepEqual(parseCoordinate('1:2:3'), { galaxy: 1, system: 2, planet: 3 })
  assert.deepEqual(parseCoordinate('[4:5:6]'), { galaxy: 4, system: 5, planet: 6 })
})

void test('a stated coordinate that is not one is a caller mistake', () => {
  for (const text of ['nowhere', '1:2', '0:1:1', ''])
    assert.throws(
      () => parseCoordinate(text),
      { code: ErrorCode.ValidationError, message: 'Invalid coordinates' },
      text,
    )
})
