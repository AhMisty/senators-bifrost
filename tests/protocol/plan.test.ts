import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ErrorCode, parsePage, planCandidates, resourceCandidates } from '../../src/index.ts'
import { logisticsPageContent, resourceCells, row } from '../fixtures/game/logistics.ts'
import { httpResponse } from '../helpers.ts'

function formOf(body: string) {
  const page = parsePage(httpResponse({ body: logisticsPageContent('delivery', body) }))
  return { page, form: page.$('form') }
}

void test('a row reports the planet its control names and the three figures beside it', () => {
  const { page, form } = formOf(row(1001, 'Homeworld', '[1:2:3]', '0:12:30', '<p>x</p>'))
  assert.deepEqual(
    planCandidates(page, form, () => ({})),
    [
      {
        planetId: 1001,
        name: 'Homeworld',
        coordinate: { galaxy: 1, system: 2, planet: 3 },
        travelTimeText: '0:12:30',
      },
    ],
  )
})

void test('the rows are read in the order the template drew them', () => {
  const { page, form } = formOf(
    row(1001, 'First', '[1:2:3]', '0:01:00', '') + row(1002, 'Second', '[4:5:6]', '0:02:00', ''),
  )
  assert.deepEqual(
    planCandidates(page, form, () => ({})).map((candidate) => candidate.name),
    ['First', 'Second'],
  )
})

void test('a row the page refused to draw a control for is not a candidate', () => {
  const { page, form } = formOf(
    row(1001, 'Offered', '[1:2:3]', '0:01:00', '') +
      `<div class="rd_planet_row"><span class="rd_planet_data_name"><span>Skipped</span><span>[7:8:9]</span><span>0:03:00</span></span></div>`,
  )
  assert.deepEqual(
    planCandidates(page, form, () => ({})).map((candidate) => candidate.planetId),
    [1001],
  )
})

void test('a form offering nothing yields no candidate rather than failing', () => {
  const { page, form } = formOf('')
  assert.deepEqual(
    planCandidates(page, form, () => ({})),
    [],
  )
})

void test('a control naming no planet is a decoding failure', () => {
  const { page, form } = formOf(
    `<div class="rd_planet_row"><input name="palanets[]" value="" type="checkbox"></div>`,
  )
  assert.throws(() => planCandidates(page, form, () => ({})), {
    code: ErrorCode.ParseError,
    message: 'Expected a numeric value',
  })
})

void test('a row whose own lines state nothing is a decoding failure', () => {
  const nameless = formOf(row(1001, '', '[1:2:3]', '0:01:00', ''))
  assert.throws(() => planCandidates(nameless.page, nameless.form, () => ({})), {
    code: ErrorCode.ParseError,
    message: 'Missing plan row name',
  })
  const timeless = formOf(row(1001, 'Homeworld', '[1:2:3]', '', ''))
  assert.throws(() => planCandidates(timeless.page, timeless.form, () => ({})), {
    code: ErrorCode.ParseError,
    message: 'Missing plan row travel time',
  })
})

void test('what a plan adds to a row travels beside the shared figures', () => {
  const { page, form } = formOf(
    row(1001, 'Homeworld', '[1:2:3]', '0:12:30', resourceCells('1.000', '2.000', '3.000')),
  )

  assert.deepEqual(resourceCandidates(page, form), [
    {
      planetId: 1001,
      name: 'Homeworld',
      coordinate: { galaxy: 1, system: 2, planet: 3 },
      travelTimeText: '0:12:30',
      resourceTexts: ['1.000', '2.000', '3.000'],
    },
  ])
})

void test('a row listing no resource states an empty list rather than failing', () => {
  const { page, form } = formOf(row(1001, 'Homeworld', '[1:2:3]', '0:12:30', ''))
  assert.deepEqual(
    resourceCandidates(page, form).map((candidate) => candidate.resourceTexts),
    [[]],
  )
})
