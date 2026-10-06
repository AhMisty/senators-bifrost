import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { HttpResponse } from '../../src/index.ts'
import {
  ErrorCode,
  OperationError,
  ValidationError,
  observe,
  withResponse,
} from '../../src/index.ts'
import { httpResponse } from '../helpers.ts'

const RESPONSE = httpResponse({ body: '<p>x</p>' })

function threw(run: () => unknown): unknown {
  try {
    run()
  } catch (error) {
    return error
  }
  return assert.fail('expected a refusal')
}

function refusal(run: () => unknown): OperationError {
  const caught = threw(run)
  assert.ok(caught instanceof OperationError)
  return caught
}

void test('a decode is returned together with the response it came from', () => {
  const observed = observe(RESPONSE, () => 7)
  assert.equal(observed.data, 7)
  assert.equal(observed.response, RESPONSE)
})

void test('a failure the library raised already knows its response', () => {
  const thrown = new OperationError(ErrorCode.ParseError, 'no such element', RESPONSE)
  assert.equal(
    threw(() =>
      withResponse(RESPONSE, () => {
        throw thrown
      }),
    ),
    thrown,
  )
  assert.equal(thrown.response, RESPONSE)
})

void test('a failure raised without a response is given the one it was observed on', () => {
  assert.equal(
    refusal(() =>
      withResponse(RESPONSE, () => {
        throw new OperationError(ErrorCode.ParseError, 'no such element')
      }),
    ).response,
    RESPONSE,
  )
})

void test('a failure that is not the library’s own is not rewritten', () => {
  for (const defect of [
    new TypeError('undefined is not a function'),
    new RangeError('invalid index'),
  ]) {
    assert.equal(
      threw(() =>
        withResponse(RESPONSE, () => {
          throw defect
        }),
      ),
      defect,
    )
  }
})

void test('a decode that succeeds is returned unchanged', () => {
  assert.equal(
    withResponse(RESPONSE, () => 'decoded'),
    'decoded',
  )
})

void test('a failure says what kind it is and where it came from', () => {
  const cause = new Error('root')
  const failure = new OperationError(ErrorCode.ParseError, 'unreadable', RESPONSE, { cause })
  assert.equal(failure.name, 'OperationError')
  assert.equal(failure.code, ErrorCode.ParseError)
  assert.equal(failure.message, 'unreadable')
  assert.equal(failure.response, RESPONSE)
  assert.equal(failure.cause, cause)

  assert.equal(new OperationError('parse', 'x').response, undefined)
})

void test('a value the library cannot express is a validation failure', () => {
  const failure = new ValidationError('Expected a numeric value')
  assert.equal(failure.name, 'ValidationError')
  assert.equal(failure.code, ErrorCode.ValidationError)
  assert.equal(failure.message, 'Expected a numeric value')
  assert.equal(failure.response, undefined)

  assert.ok(failure instanceof OperationError)
  assert.ok(failure instanceof Error)
})

void test('a response is what the reader decodes, so it travels with the answer', () => {
  const response: HttpResponse = httpResponse({ status: 500, body: 'boom' })
  assert.deepEqual(
    observe(response, () => 'decoded'),
    { data: 'decoded', response },
  )
})
