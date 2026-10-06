import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page } from '../../src/index.ts'
import { adminFormFields, blockLines, parsePage } from '../../src/index.ts'
import {
  ACCOUNT_EDITOR_ALLIANCE_BODY,
  ACCOUNT_EDITOR_PERSONAL_BODY,
  ACCOUNT_EDITOR_SHIPS_BODY,
  DUMP_BODY,
  FLYING_FLEET_MISSION_ANCHOR,
  FORM_FIELDS_CHOSEN_TABLES,
  FORM_FIELDS_DISABLED_ROW,
  INFORMATION_BODY,
  RIGHTS_SELECTOR_BODY,
} from '../fixtures/admin/formPages.ts'
import { BASE_URL, httpResponse, pageHtml } from '../helpers.ts'

const ADMIN_URL = `${BASE_URL}admin.php?page=dump`

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body: pageHtml(body) }, ADMIN_URL))
}

const CHECKBOX_ROW = `<form><table><tbody>${FORM_FIELDS_DISABLED_ROW}</tbody></table></form>`

void test('a catalogue form reports every named control, in the order the template renders them', () => {
  assert.deepEqual(adminFormFields(pageOf(ACCOUNT_EDITOR_SHIPS_BODY).$('form')), [
    { name: 'id', type: 'text', value: '0', checked: false, options: [] },
    { name: 'small_ship_cargo', type: 'text', value: '0', checked: false, options: [] },
    { name: 'spy_sonde', type: 'text', value: '0', checked: false, options: [] },
    { name: 'add', type: 'submit', value: 'Add', checked: false, options: [] },
    { name: 'delete', type: 'submit', value: 'Delete', checked: false, options: [] },
  ])
})

void test('the kind of a control is its own type, and text where the template wrote none', () => {
  assert.deepEqual(adminFormFields(pageOf(ACCOUNT_EDITOR_ALLIANCE_BODY).$('form')), [
    { name: 'id', type: 'text', value: '', checked: false, options: [] },
    { name: 'changeleader', type: 'text', value: '', checked: false, options: [] },
    { name: 'name', type: 'text', value: '', checked: false, options: [] },
    { name: 'tag', type: 'text', value: '', checked: false, options: [] },
    { name: 'delete_u', type: 'text', value: '', checked: false, options: [] },

    { name: 'delete', type: 'checkbox', value: 'on', checked: false, options: [] },
    { name: 'externo', type: 'textarea', value: 'Founded 2025', checked: false, options: [] },
    { name: 'interno', type: 'textarea', value: '', checked: false, options: [] },
    { name: 'solicitud', type: 'textarea', value: '', checked: false, options: [] },
  ])
})

void test('a selector reports the option it has selected, or the list a multiple one carries', () => {
  const personal = adminFormFields(pageOf(ACCOUNT_EDITOR_PERSONAL_BODY).$('form'))
  assert.deepEqual(
    personal.find((field) => field.name === 'vacation'),
    {
      name: 'vacation',
      type: 'select',
      value: '',
      checked: false,
      options: [
        { value: '', label: 'Select' },
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
    },
  )

  const dump = adminFormFields(pageOf(DUMP_BODY).$('form'))
  assert.deepEqual(dump.find((field) => field.name === 'dbtables[]')?.value, [])
  const chosen = adminFormFields(pageOf(`<form>${FORM_FIELDS_CHOSEN_TABLES}</form>`).$('form'))
  assert.deepEqual(chosen.find((field) => field.name === 'dbtables[]')?.value, [
    'uni_planets',
    'uni_users',
  ])
})

void test('a control the account may not set is still reported, with what it holds', () => {
  assert.deepEqual(adminFormFields(pageOf(CHECKBOX_ROW).$('form')), [
    { name: 'spy_sonde', type: 'text', value: '0', checked: false, options: [] },
  ])
})

void test('a control with no name submits nothing and is not reported', () => {
  assert.deepEqual(
    adminFormFields(pageOf(RIGHTS_SELECTOR_BODY).$('form')).map((field) => [
      field.name,
      field.type,
    ]),
    [
      ['id_1', 'select'],
      ['regexp', 'text'],
    ],
  )
})

void test('the lines of a block are read where the template breaks them', () => {
  const blocks = pageOf(INFORMATION_BODY).$('.card-body > p.card-text')

  assert.deepEqual(blockLines(blocks.eq(0)), [
    'Web server Apache (fpm-fcgi)',
    'JSON loaded',
    'Error log error.log (0)',
  ])
  assert.deepEqual(blockLines(blocks.eq(1)), [
    'Game version 1.8.0',
    'Address http://uni.example.com/',
  ])
})

void test('a block whose last line carries no break ends on that line', () => {
  assert.deepEqual(blockLines(pageOf(FLYING_FLEET_MISSION_ANCHOR).$('a')), [
    'Transport',
    '12',
    'Raiders (R)',
  ])
})

void test('a block with nothing in it yields no lines rather than one empty one', () => {
  const page = pageOf(INFORMATION_BODY)
  assert.deepEqual(blockLines(page.$('.missing')), [])
  assert.deepEqual(blockLines(pageOf('<p class="card-text"><br></p>').$('p')), [])
  assert.deepEqual(blockLines(pageOf('<p class="card-text"> \n </p>').$('p')), [])
})

void test('a line carries the text the template rendered, with its whitespace collapsed', () => {
  const page = pageOf('<p class="card-text">Metal 1&nbsp;000<br> <b>Crystal</b> 500 </p>')
  assert.deepEqual(blockLines(page.$('p')), ['Metal 1 000', 'Crystal 500'])
})
