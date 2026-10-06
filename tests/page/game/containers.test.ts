import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as bifrost from '../../../src/index.ts'
import type { ContainerReward, ContainersPage } from '../../../src/index.ts'
import {
  ErrorCode,
  containers,
  containersOpen,
  parsePage,
  readContainers,
} from '../../../src/index.ts'
import {
  containerContent,
  containerInventoryRow,
  containerPage,
  containerPageWithoutInventory,
  containerRow,
  containerRowWithoutAmount,
  containerRowWithoutIcon,
  stockNode,
} from '../../fixtures/game/economy.ts'
import {
  BASE_URL,
  PLANET_ID,
  answer,
  expectOperation,
  expectRefusal,
  gamePage,
  httpResponse,
  pageReply,
  read,
} from '../../helpers.ts'

const OTHER_PLANET_ID = 2000

const LOG_URL = `${BASE_URL}game.php?page=conteiner&cp=${PLANET_ID}`
const OPEN_URL = `${BASE_URL}game.php?page=conteiner&cp=${PLANET_ID}&mode=open`

const HEADER_COUNT = stockNode('container', '15')

const LABEL_COUNT = 12

void test('the log is asked for at the container page of the planet the caller names', async () => {
  await expectOperation((session) => containers(session, { planetId: PLANET_ID }), {
    url: LOG_URL,
  })
})

void test('the inventory, the day count and the reward log are read from the document', async () => {
  const page = await read(
    (session) => containers(session, { planetId: PLANET_ID }),
    pageReply(gamePage(containerContent, { header: HEADER_COUNT })),
  )
  assert.deepEqual(page, {
    kind: 'containers',
    planetId: PLANET_ID,

    observedAtMs: page.observedAtMs,

    unopenedCount: 15,
    openedLastDay: 3,
    logs: [
      { elementId: 202, name: 'Light Cargo', factor: 5, awarded: 1500 },
      { elementId: 901, name: 'Metal', factor: 1, awarded: 400000 },
    ],
  })
})

void test('the count is read from the header where it states one, and from the label otherwise', async () => {
  const sources: [string, string, number][] = [
    ['a header balance', HEADER_COUNT, 15],
    ['a header node stating no balance', '<span id="current_container">15</span>', LABEL_COUNT],
    ['no header at all', '', LABEL_COUNT],
  ]
  for (const [name, header, unopenedCount] of sources) {
    const page = await read(
      (session) => containers(session, { planetId: PLANET_ID }),
      pageReply(gamePage(containerContent, { header })),
    )
    assert.equal(page.unopenedCount, unopenedCount, name)
  }
})

void test('a refusal is reported as the message the page printed rather than raised', async () => {
  await expectRefusal(
    (session) => containers(session, { planetId: PLANET_ID }),
    'No containers to open',
    PLANET_ID,
  )
})

void test('a page that states no inventory is a decoding failure', async () => {
  await assert.rejects(
    () =>
      read(
        (session) => containers(session, { planetId: PLANET_ID }),
        pageReply(gamePage(containerPageWithoutInventory, { header: HEADER_COUNT })),
      ),
    { code: ErrorCode.ParseError, message: 'Missing container inventory' },
  )
})

void test('a page that states no day count is a decoding failure', async () => {
  await assert.rejects(
    () =>
      read(
        (session) => containers(session, { planetId: PLANET_ID }),
        pageReply(gamePage(containerInventoryRow)),
      ),
    { code: ErrorCode.ParseError, message: 'Missing containers opened last day' },
  )
})

void test('a reward row that states no amount is a decoding failure', async () => {
  const content = containerPage(
    containerRow(202, 'Light Cargo', '1.500', '5') + containerRowWithoutAmount,
  )
  await assert.rejects(
    () =>
      read((session) => containers(session, { planetId: PLANET_ID }), pageReply(gamePage(content))),
    { code: ErrorCode.ParseError, message: 'Missing container reward amount' },
  )
})

void test('a row that names no element is a decoding failure rather than a skipped row', async () => {
  const content = containerPage(containerRowWithoutIcon)
  await assert.rejects(
    () =>
      read((session) => containers(session, { planetId: PLANET_ID }), pageReply(gamePage(content))),
    { code: ErrorCode.ParseError, message: 'Missing element image' },
  )
})

void test('the planet a document names is the one reported, whatever the request named', async () => {
  const response = pageReply(
    gamePage(containerContent, { planetId: OTHER_PLANET_ID, header: HEADER_COUNT }),
  )
  await expectOperation(
    (session) => containers(session, { planetId: PLANET_ID }),
    { url: LOG_URL },
    response,
  )
  const page = await read((session) => containers(session, { planetId: PLANET_ID }), response)
  assert.equal(page.planetId, OTHER_PLANET_ID)
  assert.equal(page.logs.length, 2)
})

void test('the open control submits the count it is asked to consume', async () => {
  await expectOperation((session) => containersOpen(session, { planetId: PLANET_ID, amount: 3 }), {
    method: 'POST',
    url: OPEN_URL,
    body: [['conts', '3']],
  })
})

void test('an opened container is reported as the answer the server gave instead of a document', async () => {
  const refusal = await answer(
    (session) => containersOpen(session, { planetId: PLANET_ID, amount: LABEL_COUNT }),
    pageReply(gamePage('<div class="ally_contents">No containers left</div>')),
  )
  assert.deepEqual(refusal.data, { planetId: 1000, kind: 'message', message: 'No containers left' })

  const opened = await answer(
    (session) => containersOpen(session, { planetId: PLANET_ID, amount: 1 }),
    {
      status: 302,
      headers: { Location: './game.php?page=conteiner' },
    },
  )
  assert.deepEqual(opened.data, {
    planetId: null,
    kind: 'redirect',
    target: new URL(`${BASE_URL}game.php?page=conteiner`),
  })
})

void test('the reader decodes a document the caller already holds', () => {
  const page: ContainersPage = readContainers(
    parsePage(httpResponse({ body: gamePage(containerContent, { header: HEADER_COUNT }) })),
  )
  const rewards: ContainerReward[] = page.logs
  assert.deepEqual(page, {
    kind: 'containers',
    planetId: PLANET_ID,
    observedAtMs: 1,
    unopenedCount: 15,
    openedLastDay: 3,
    logs: [
      { elementId: 202, name: 'Light Cargo', factor: 5, awarded: 1500 },
      { elementId: 901, name: 'Metal', factor: 1, awarded: 400000 },
    ],
  })
  assert.deepEqual(
    rewards.map(({ elementId, factor }) => [elementId, factor]),
    [
      [202, 5],
      [901, 1],
    ],
  )
})

void test('the page module publishes the reader and the two functions it owns', () => {
  const owned = [readContainers, containers, containersOpen].map((fn) => fn.name).toSorted()
  assert.deepEqual(
    owned.filter((name) => Object.keys(bifrost).includes(name)),
    ['containers', 'containersOpen', 'readContainers'],
  )
})
