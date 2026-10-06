import assert from 'node:assert/strict'
import { test } from 'node:test'

import { encodeParameters, scalarParameters } from '../../src/index.ts'

function pairs(parameters: URLSearchParams): [string, string][] {
  return [...parameters]
}

void test('a caller’s parameters are written as the form they would have submitted', () => {
  assert.deepEqual(pairs(encodeParameters({ a: '1', b: 2 })), [
    ['a', '1'],
    ['b', '2'],
  ])

  assert.deepEqual(pairs(encodeParameters({ z: '1', a: '2' })), [
    ['z', '1'],
    ['a', '2'],
  ])
})

void test('parameters that are already a form are copied rather than rebuilt', () => {
  const source = new URLSearchParams([
    ['keep', '1'],
    ['keep', '2'],
  ])
  const encoded = encodeParameters(source)
  assert.deepEqual(pairs(encoded), [
    ['keep', '1'],
    ['keep', '2'],
  ])

  assert.notEqual(encoded, source)
  assert.deepEqual(pairs(encodeParameters('raw=1&raw=2')), [
    ['raw', '1'],
    ['raw', '2'],
  ])
})

void test('a caller who names nothing submits nothing', () => {
  assert.deepEqual(pairs(encodeParameters()), [])
})

void test('the parameters a page states about itself are its scalars', () => {
  const parameters = scalarParameters(new URLSearchParams('page=overview&cp=1000&mode=show'))
  assert.deepEqual(
    [...parameters],
    [
      ['page', 'overview'],
      ['cp', '1000'],
      ['mode', 'show'],
    ],
  )
})

void test('a name a bracketed field extends is not one of the page’s scalars', () => {
  const parameters = scalarParameters(
    new URLSearchParams('ships=9&page=fleetStep3&ships[202]=5&galaxy=1'),
  )
  assert.deepEqual([...parameters.keys()], ['page', 'galaxy'])
  assert.equal(parameters.get('ships'), undefined)
  assert.equal(parameters.get('ships[202]'), undefined)
  assert.equal(parameters.get('page'), 'fleetStep3')
})

void test('later PHP arrays and scalars replace earlier values', () => {
  const leading = scalarParameters(new URLSearchParams('who=1&who[2]=x'))
  assert.equal(leading.get('who'), undefined)
  assert.deepEqual([...leading.keys()], [])
  assert.equal(scalarParameters(new URLSearchParams('who[2]=x&who=1')).get('who'), '1')

  const nested = scalarParameters(new URLSearchParams('a[b][c]=1&b=2'))
  assert.deepEqual([...nested.keys()], ['b'])

  assert.equal(scalarParameters(new URLSearchParams('ship=1&ships[202]=5')).get('ship'), '1')
})

void test('PHP parameter names are normalized before scalar values are read', () => {
  const source = new URLSearchParams([
    [' cp', '1000'],
    ['cp\0ignored', '1001'],
    ['player.name', 'Pilot'],
    ['flag[unfinished', 'yes'],
    ['', 'ignored'],
    ['[orphan]', 'ignored'],
  ])
  assert.deepEqual(
    [...scalarParameters(source)],
    [
      ['cp', '1001'],
      ['player_name', 'Pilot'],
      ['flag_unfinished', 'yes'],
    ],
  )
})

void test('the last value an address carries for a name is the one it states', () => {
  const parameters = scalarParameters(new URLSearchParams('range=1&range=101'))
  assert.deepEqual([...parameters], [['range', '101']])
})
