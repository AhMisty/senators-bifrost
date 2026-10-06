import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ErrorCode,
  abbreviated,
  countdownRemaining,
  displayed,
  leadingDisplayed,
  levelPair,
  OperationError,
  readAmount,
  readAt,
  readDecimal,
  readOptionalDecimal,
  readInteger,
  readQuantity,
  refusalText,
  timing,
  ValidationError,
} from '../../src/index.ts'

function refused(run: () => unknown): string {
  try {
    run()
  } catch (error) {
    if (!(error instanceof OperationError)) throw error
    assert.equal(error.code, ErrorCode.ParseError, 'refusal code')
    return error.message
  }
  throw new assert.AssertionError({ message: 'expected a refusal' })
}

void test('a finite quantity is read from a number or from the text of one', () => {
  assert.equal(readDecimal(12), 12)
  assert.equal(readDecimal(1.5e3), 1500)

  assert.equal(readDecimal(' -2.5 '), -2.5)
  assert.equal(readDecimal('1e3'), 1000)
  assert.equal(readDecimal('.5'), 0.5)
  assert.equal(readDecimal('4.'), 4)
})

void test('an optional numeric reading preserves finite values and reports unreadable values as null', () => {
  assert.equal(readOptionalDecimal(' -2.5e3 '), -2500)
  assert.equal(readOptionalDecimal(0), 0)
  for (const value of [undefined, null, '', 'many', '1e999', Number.NaN, Infinity, true, {}])
    assert.equal(readOptionalDecimal(value), null)
})

void test('a response value that is not a finite quantity is a parse failure', () => {
  const refusedValues: [string, unknown][] = [
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['an exponent that overflows', '1e999'],
    ['empty text', ''],
    ['words', 'twelve'],
    ['null', null],
    ['a boolean', true],
    ['an object', {}],
  ]
  for (const [name, value] of refusedValues)
    assert.throws(
      () => readDecimal(value),
      { code: ErrorCode.ParseError, message: 'Expected a numeric value' },
      name,
    )
})

void test('a whole number in a structural position is exact and at least the floor', () => {
  assert.equal(readInteger(12), 12)
  assert.equal(readInteger(-3, -10), -3)

  const refusedValues: [string, unknown, number, string][] = [
    ['a fraction', 1.5, 1, 'Expected a safe integer'],
    ['a quantity past binary64', Number.MAX_SAFE_INTEGER + 1, 1, 'Expected a safe integer'],
    ['text that is not a number', 'NaN', 1, 'Expected a numeric value'],
    ['a position below the floor', -3, 1, 'Expected a safe integer of at least 1'],
  ]
  for (const [name, value, minimum, message] of refusedValues)
    assert.throws(() => readInteger(value, minimum), { code: ErrorCode.ParseError, message }, name)
})

void test('a refusal is reported by its own wording rather than by its class name', () => {
  assert.equal(refusalText(new ValidationError('Invalid coordinates')), 'Invalid coordinates')
  assert.equal(refusalText(new Error('plain')), 'plain')
})

void test('a rendered quantity is decoded, and one that cannot be is a parse failure', () => {
  assert.equal(readDecimal('12.5'), 12.5)
  assert.equal(readAmount('0'), 0)
  assert.equal(readAmount('12'), 12)
  assert.equal(readQuantity('12'), 12)
  assert.equal(readQuantity(12, 1), 12)
  assert.equal(readInteger('12'), 12)
  assert.equal(readInteger(12, 1), 12)
})

void test('a decoded quantity the server could not have rendered names what was wrong', () => {
  assert.equal(
    refused(() => readDecimal('many')),
    'Expected a numeric value',
  )
  assert.equal(
    refused(() => readAmount(-1)),
    'Expected a nonnegative amount',
  )
  assert.equal(
    refused(() => readQuantity(-1)),
    'Expected a nonnegative whole number',
  )
  assert.equal(
    refused(() => readQuantity(0, 1)),
    'Expected a whole number of at least 1',
  )
  assert.equal(
    refused(() => readQuantity(1.5)),
    'Expected a nonnegative whole number',
  )
  assert.equal(
    refused(() => readInteger(1.5)),
    'Expected a safe integer',
  )
  assert.equal(
    refused(() => readInteger(-1, 1)),
    'Expected a safe integer of at least 1',
  )
})

void test('a display figure is decoded through the grouping the server printed', () => {
  assert.equal(displayed('1.234'), 1234)
  assert.equal(displayed('1.234.567'), 1234567)
  assert.equal(displayed('1,23'), 1.23)
  assert.equal(displayed(' 1.234,5 '), 1234.5)
  assert.equal(displayed('+12.345'), 12345)
  assert.equal(displayed('-1.500'), -1500)

  for (const value of ['', 'twelve', '1.23.4', ',5', '1,2,3', '−1.500'])
    assert.throws(
      () => displayed(value),
      { code: ErrorCode.ParseError, message: 'Invalid formatted quantity' },
      `expected ${value} refused`,
    )
  assert.equal(
    refused(() => displayed('9'.repeat(310))),
    'Expected a numeric value',
  )
})

void test('a display figure leading a longer text is read up to its last digit', () => {
  assert.equal(leadingDisplayed('12.345 Felder'), '12.345')
  assert.equal(leadingDisplayed('1,23 M'), '1,23')

  assert.equal(leadingDisplayed('12.'), '12')
  assert.equal(leadingDisplayed('no quantity'), null)
  assert.equal(leadingDisplayed(''), null)
})

void test('a level label is decoded with its maximum where it states one', () => {
  assert.deepEqual(levelPair('(Level 1/20)', displayed), { level: 1, maximum: 20 })
  assert.deepEqual(levelPair('+10%', displayed), { level: 10, maximum: null })
  assert.deepEqual(levelPair(' 12 ', displayed), { level: 12, maximum: null })
  assert.deepEqual(levelPair('1.5/2.5', Number), { level: 1.5, maximum: 2.5 })
  assert.throws(() => levelPair('no level', displayed), {
    code: ErrorCode.ParseError,
    message: 'Invalid level label',
  })
})

void test('an abbreviated quantity is restored on its digits rather than on a number', () => {
  assert.equal(abbreviated('1,23 M'), 1230000)
  assert.equal(abbreviated('999'), 999)
  assert.equal(abbreviated('1,23'), 1.23)
  assert.equal(abbreviated('2,5K'), 2500)
  assert.equal(abbreviated('1 K'), 1000)
  assert.equal(abbreviated('-1,23 K'), -1230)
  assert.equal(abbreviated('-1,5 B'), -1500000000000)
})

void test('an abbreviation keeps every digit the page printed, including past its own scale', () => {
  assert.equal(abbreviated('1,23456 K'), 1234.56)
  assert.equal(abbreviated('-1,23456 K'), -1234.56)
  assert.equal(abbreviated('12 T'), 12e18)
})

void test('every scale the formatter prints is decoded', () => {
  const scales: [string, number][] = [
    ['K', 3],
    ['M', 6],
    ['B', 12],
    ['T', 18],
    ['Q', 24],
    ['Q+', 30],
    ['S', 36],
    ['S+', 42],
    ['O', 48],
    ['N', 54],
  ]
  for (const [suffix, places] of scales)
    assert.equal(abbreviated(`1 ${suffix.toLowerCase()}`), 10 ** places, suffix)
})

void test('a list a reader indexed is read at a position the document states', () => {
  assert.equal(readAt(['a', 'b'], 1), 'b')
  assert.equal(
    refused(() => readAt(['a'], 1)),
    'Missing element 1 of 1',
  )
  assert.equal(
    refused(() => readAt([], 0)),
    'Missing element 0 of 0',
  )
})

void test('a quantity that carries no abbreviation is refused where it is not one', () => {
  assert.throws(() => abbreviated('1,23 X'), {
    code: ErrorCode.ParseError,
    message: 'Unknown abbreviated quantity',
  })
  assert.throws(() => abbreviated('twelve'), {
    code: ErrorCode.ParseError,
    message: 'Unknown abbreviated quantity',
  })
  assert.throws(() => abbreviated('1.23.4 M'), {
    code: ErrorCode.ParseError,
    message: 'Invalid formatted quantity',
  })
  assert.equal(
    refused(() => abbreviated(`${'9'.repeat(310)} K`)),
    'Expected a numeric value',
  )
})

void test('the time left on a queue entry is never negative', () => {
  assert.equal(countdownRemaining(100, 40), 60)

  assert.equal(countdownRemaining(100, 140), 0)
})

void test('progress toward a duration is complete when there is no duration', () => {
  assert.deepEqual(timing(100, 25), {
    durationSeconds: 100,
    remainingSeconds: 25,
    progressPercent: 75,
  })
  assert.equal(timing(0, 0).progressPercent, 100)
})
