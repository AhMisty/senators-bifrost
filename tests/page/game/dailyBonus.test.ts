import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { DailyBonusPage } from '../../../src/index.ts'
import { ErrorCode, claimDailyBonus } from '../../../src/index.ts'
import {
  BASE_URL,
  PLANET_ID,
  decode,
  fakeServer,
  gamePage,
  pageReply,
  sessionOn,
  DEFAULT_HEADER,
} from '../../helpers.ts'

const PAGE_URL = `${BASE_URL}game.php?page=bonus&cp=${PLANET_ID}`

function rewardTile(id: number, amount: string): string {
  return (
    '<div class="fade"><div class="card">' +
    `<img src="dpath/gebaeude/${id}.gif" alt=""><div class="card-title">${amount}</div>` +
    '</div></div>'
  )
}

function document(tiles = rewardTile(921, '500') + rewardTile(924, '1')): string {
  return gamePage(tiles, { header: DEFAULT_HEADER })
}

function rewardOf(answer: Awaited<ReturnType<typeof claimDailyBonus>>): DailyBonusPage {
  const data = answer.data
  if (data.kind !== 'dailyBonus')
    assert.fail(`expected the daily bonus, answered with ${data.kind}`)
  return data
}

void test('claiming the bonus is the request itself, and what it paid comes back as the tiles', async () => {
  const server = fakeServer(pageReply(document()))
  const answer = await claimDailyBonus(sessionOn(server), { planetId: PLANET_ID })
  assert.equal(server.requests.length, 1)
  assert.equal(server.requests[0]!.method, 'GET')
  assert.equal(server.requests[0]!.url.href, PAGE_URL)
  const reward = rewardOf(answer)
  assert.equal(reward.kind, 'dailyBonus')
  assert.equal(reward.planetId, PLANET_ID)
  assert.deepEqual(
    [...reward.rewards],
    [
      [921, 500],
      [924, 1],
    ],
  )
})

void test('a second claim inside the same day is reported as the redirect it is', async () => {
  const refused = await decode((session) => claimDailyBonus(session, { planetId: PLANET_ID }), {
    status: 302,
    headers: { Location: './game.php?page=overview' },
  })
  assert.deepEqual(refused.data, {
    planetId: null,
    kind: 'redirect',
    target: new URL(`${BASE_URL}game.php?page=overview`),
  })
})

void test('a document that renders no tile is a decoding failure rather than an empty receipt', async () => {
  await assert.rejects(
    () =>
      claimDailyBonus(sessionOn(fakeServer(pageReply(gamePage('<p>nothing here</p>')))), {
        planetId: PLANET_ID,
      }),
    { code: ErrorCode.ParseError, message: 'Missing daily bonus receipt' },
  )
})

void test('a tile whose icon cannot be read is a decoding failure', async () => {
  await assert.rejects(
    () =>
      claimDailyBonus(
        sessionOn(
          fakeServer(
            pageReply(document(rewardTile(921, '500').replace('gebaeude/921.gif', 'x.png'))),
          ),
        ),
        { planetId: PLANET_ID },
      ),
    { code: ErrorCode.ParseError, message: 'Missing element image' },
  )
})
