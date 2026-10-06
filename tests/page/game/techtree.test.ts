import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { TechtreePage } from '../../../src/index.ts'
import { ErrorCode, techtree } from '../../../src/index.ts'
import {
  requirementBlock,
  techTreePageContent,
  technologyRow,
  withoutCategoryWrapper,
} from '../../fixtures/game/economy.ts'
import {
  BASE_URL,
  PLANET_ID,
  fakeServer,
  gamePage,
  pageReply,
  sessionOn,
  DEFAULT_HEADER,
} from '../../helpers.ts'

const PAGE_URL = `${BASE_URL}game.php?page=techtree&cp=${PLANET_ID}`

function document(content = techTreePageContent): string {
  return gamePage(content, { header: DEFAULT_HEADER })
}

function treeOf(answer: Awaited<ReturnType<typeof techtree>>): TechtreePage {
  const data = answer.data
  if (data.kind !== 'techtree')
    assert.fail(`expected the technology tree, answered with ${data.kind}`)
  return data
}

void test('the tree is read for the planet the request names', async () => {
  const server = fakeServer(pageReply(document()))
  const answer = await techtree(sessionOn(server), { planetId: PLANET_ID })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, PAGE_URL)
  const tree = treeOf(answer)
  assert.equal(tree.kind, 'techtree')
  assert.equal(tree.planetId, PLANET_ID)
})

void test('each entry states the class its group sits under and the rows beside it', async () => {
  const tree = treeOf(
    await techtree(sessionOn(fakeServer(pageReply(document()))), { planetId: PLANET_ID }),
  )
  assert.deepEqual(
    tree.entries.map((entry) => [entry.elementId, entry.name, entry.categoryId]),
    [
      [1, 'Metal Mine', 0],
      [115, 'Combustion Engine', 100],
    ],
  )
  assert.deepEqual(tree.entries[0]!.requirements, [])
  assert.deepEqual(tree.entries[1]!.requirements, [
    { elementId: 113, name: 'Energy Technology', requiredLevel: 3, satisfied: true },
    { elementId: 111, name: 'Laser Technology', requiredLevel: 5, satisfied: false },
    { elementId: 112, name: 'Ion Technology', requiredLevel: 2, satisfied: false },
  ])
})

void test('a group the template wrapped in no class reports no class', async () => {
  const tree = treeOf(
    await techtree(
      sessionOn(fakeServer(pageReply(document(withoutCategoryWrapper(techTreePageContent))))),
      { planetId: PLANET_ID },
    ),
  )
  assert.deepEqual(
    tree.entries.map((entry) => entry.categoryId),
    [null, 100],
  )
})

void test('a group whose wrapper names another class reports no class either', async () => {
  const other = techTreePageContent.replace('<div class="u100">', '<div class="research">')
  const tree = treeOf(
    await techtree(sessionOn(fakeServer(pageReply(document(other)))), { planetId: PLANET_ID }),
  )
  assert.deepEqual(
    tree.entries.map((entry) => entry.categoryId),
    [0, null],
  )
})

void test('a requirement whose icon states no name is a decoding failure', async () => {
  const withoutAlt = requirementBlock(113, 'Energy Technology', '3', 'lime').replace(
    ' alt="Energy Technology"',
    '',
  )
  await assert.rejects(
    () =>
      techtree(
        sessionOn(
          fakeServer(
            pageReply(
              document(
                techTreePageContent.replace(
                  requirementBlock(113, 'Energy Technology', '3', 'lime'),
                  withoutAlt,
                ),
              ),
            ),
          ),
        ),
        { planetId: PLANET_ID },
      ),
    { code: ErrorCode.ParseError, message: 'Missing alt on the selected element' },
  )
})

void test('a requirement the template coloured neither way is a decoding failure', async () => {
  const uncoloured = requirementBlock(113, 'Energy Technology', '3', 'lime').replace(
    '<div class="text" style="color:lime;">',
    '<div class="text">',
  )
  await assert.rejects(
    () =>
      techtree(
        sessionOn(
          fakeServer(
            pageReply(
              document(
                techTreePageContent.replace(
                  requirementBlock(113, 'Energy Technology', '3', 'lime'),
                  uncoloured,
                ),
              ),
            ),
          ),
        ),
        { planetId: PLANET_ID },
      ),
    { code: ErrorCode.ParseError, message: 'Missing style on the selected element' },
  )
  const elsewhere = requirementBlock(113, 'Energy Technology', '3', 'lime').replaceAll(
    'color:lime',
    'color:orange',
  )
  await assert.rejects(
    () =>
      techtree(
        sessionOn(
          fakeServer(
            pageReply(
              document(
                techTreePageContent.replace(
                  requirementBlock(113, 'Energy Technology', '3', 'lime'),
                  elsewhere,
                ),
              ),
            ),
          ),
        ),
        { planetId: PLANET_ID },
      ),
    { code: ErrorCode.ParseError, message: 'Unreadable requirement status' },
  )
})

void test('a page without the filter bar is a decoding failure', async () => {
  await assert.rejects(
    () =>
      techtree(sessionOn(fakeServer(pageReply(document(technologyRow(1, 'Metal Mine', ''))))), {
        planetId: PLANET_ID,
      }),
    {
      code: ErrorCode.ParseError,
      message: 'Expected one #content #ally_content .gray_stripe .record_btn.ico_star, found 0',
    },
  )
})

void test('an entry whose icon cannot be read is a decoding failure', async () => {
  const unreadable = technologyRow(1, 'Metal Mine', '').replace('gebaeude/1.gif', 'x.png')
  await assert.rejects(
    () =>
      techtree(sessionOn(fakeServer(pageReply(document(techTreePageContent + unreadable)))), {
        planetId: PLANET_ID,
      }),
    { code: ErrorCode.ParseError, message: 'Missing element image' },
  )
})
