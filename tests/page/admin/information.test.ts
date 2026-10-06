import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ErrorCode, adminInformation } from '../../../src/index.ts'
import { GIVEAWAY_BODY, INFORMATION_BODY } from '../../fixtures/admin/listPages.ts'
import {
  BASE_URL,
  expectOperation,
  fakeServer,
  pageHtml,
  pageReply,
  read,
  sessionOn,
} from '../../helpers.ts'

void test('the two paragraphs are read line by line, as the template broke them', async () => {
  const observed = await read(adminInformation, pageReply(pageHtml(INFORMATION_BODY)))
  const { observedAtMs, ...information } = observed
  assert.ok(observedAtMs > 0, 'the document carries the time it was read')
  assert.deepEqual(information, {
    kind: 'adminInformation',
    environment: [
      'Server software Apache/2.4.62 (Unix) PHP version 8.2.27 (apache2handler)',
      'JSON extension enabled',
      'bcmath extension loaded',
      'cURL extension loaded',
      'Safe mode disabled',
      'Memory limit 256M',
      'MySQL client 8.0.36',
      'MySQL server 8.0.36',
      'Error log /var/log/php_errors.log (1024, enabled)',
      'Time zone 0 / 0 / 0',
      'Suhosin extension absent',
    ],
    installation: [
      'Game version 1.8.0 (a1b2c3d)',
      'Database version 5.7.44',
      'Game address http://uni.example.com/',
      'Game path http://uni.example.com/play/index.php',
    ],
  })
  assert.equal('planetId' in information, false)
})

void test('a document that is not this page is refused rather than read as two empty blocks', async () => {
  await assert.rejects(() => adminInformation(sessionOf(GIVEAWAY_BODY)), {
    code: ErrorCode.ParseError,
    message: 'Expected 2 information blocks, found 0',
  })
})

function sessionOf(body: string) {
  return sessionOn(fakeServer(pageReply(pageHtml(body))))
}

void test('the page is the one address the reading asks for', async () => {
  await expectOperation((session) => adminInformation(session), {
    url: `${BASE_URL}admin.php?page=information`,
  })
})
