import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Page, StaticValue } from '../../../src/index.ts'
import {
  ErrorCode,
  parsePage,
  readSearch,
  readSearchResults,
  readSearchSuggestions,
  search,
  searchAutocomplete,
  searchResult,
} from '../../../src/index.ts'
import {
  autocompleteSuggestionsPayload,
  searchAllianceResults,
  searchPlayerResults,
} from '../../fixtures/game/social.ts'
import {
  BASE_URL,
  decode,
  expectOperation,
  gamePage,
  httpResponse,
  jsonResponse,
  pageHtml,
  pageReply,
} from '../../helpers.ts'

const SHELL_URL = `${BASE_URL}game.php?page=search`
const RESULT_URL = `${BASE_URL}game.php?type=playername&search=Bob&page=search&mode=result`
const SUGGEST_URL = `${BASE_URL}game.php?term=Bob&type=playername&page=search&mode=autocomplete`

const SHELL = [
  '<form action="game.php?page=search&amp;mode=result" method="post">',
  '<input type="text" name="searchtext" value="">',
  '<select name="type">',
  '<option value="playername" selected="selected">Player name</option>',
  '<option value="planetname">Planet name</option>',
  '<option value="allytag">Alliance tag</option>',
  '<option value="allyname">Alliance name</option>',
  '</select>',
  '</form>',
].join('')

function pageOf(body: string): Page {
  return parsePage(httpResponse({ body }, SHELL_URL))
}

void test('the shell is read as the type selector it renders', async () => {
  const observed = await decode((session) => search(session), pageReply(gamePage(SHELL)))
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.deepEqual(document, {
    kind: 'search',

    observedAtMs: observed.response.observedAtMs,
    types: [
      { value: 'playerName', label: 'Player name' },
      { value: 'planetName', label: 'Planet name' },
      { value: 'allianceTag', label: 'Alliance tag' },
      { value: 'allianceName', label: 'Alliance name' },
    ],
  })
})

void test('search forms and results omit navigation context', () => {
  assert.equal('planetId' in readSearch(pageOf(gamePage(SHELL))), false)
  assert.equal('planetId' in readSearch(pageOf(pageHtml(SHELL))), false)
  assert.equal('planetId' in readSearchResults(pageOf(gamePage(searchPlayerResults))), false)
  assert.equal('planetId' in readSearchResults(pageOf(pageHtml(searchPlayerResults))), false)
})

void test('a response that is not the search shell is refused', () => {
  assert.throws(() => readSearch(pageOf(pageHtml('<div>Nothing here</div>'))), {
    code: ErrorCode.ParseError,
    message: 'Expected one [name="searchtext"], found 0',
  })
})

void test('a player row is read from the six cells it lists', () => {
  const document = readSearchResults(pageOf(pageHtml(searchPlayerResults)))
  assert.deepEqual(document.results, [
    {
      kind: 'player',

      id: 4242,
      name: 'AhMisty',
      alliance: { id: 7, name: 'Void Runners' },
      planet: 'Homeworld',
      coordinate: { galaxy: 1, system: 2, planet: 3 },
      rankText: '12',
    },
    {
      kind: 'player',
      id: 77,
      name: 'Scout',

      alliance: null,
      planet: 'Outpost',
      coordinate: { galaxy: 2, system: 5, planet: 1 },
      rankText: '98',
    },
  ])
})

void test('an alliance row is told apart from a player one by its own shape', () => {
  const document = readSearchResults(pageOf(pageHtml(searchAllianceResults)))
  assert.deepEqual(document.results, [
    {
      kind: 'alliance',
      tag: 'VOID',
      name: 'Void Runners',
      members: 12,
      points: 1234567,
    },
  ])
})

void test('a result fragment that rendered no match lists none', () => {
  const document = readSearchResults(
    pageOf(pageHtml('<table id="resulttable"><tr><th>Name</th><th>Position</th></tr></table>')),
  )
  assert.deepEqual(document.results, [])
})

void test('a row of neither shape leaves the result it lists undecided', () => {
  const row = '<tr><td>one</td><td>two</td><td>three</td><td>four</td><td>five</td></tr>'
  assert.throws(
    () => readSearchResults(pageOf(pageHtml(`<table id="resulttable">${row}</table>`))),
    { code: ErrorCode.ParseError, message: 'Unknown search result row' },
  )
})

void test('a response that is not a result fragment is refused', () => {
  assert.throws(() => readSearchResults(pageOf(pageHtml('<div>Nothing here</div>'))), {
    code: ErrorCode.ParseError,
    message: 'Expected one #resulttable, found 0',
  })
})

void test('the suggestions are read from the payload the endpoint answers with', async () => {
  const observed = await decode(
    (session) => searchAutocomplete(session, { term: 'Bo' }),
    jsonResponse(autocompleteSuggestionsPayload()),
  )
  const document = observed.data
  assert.notEqual(document.kind, 'redirect')
  assert.deepEqual(document, {
    kind: 'searchSuggestions',

    observedAtMs: observed.response.observedAtMs,
    suggestions: [
      { label: 'AhBoby', type: 'playerName', category: 'Player name' },
      { label: 'BoBoland', type: 'planetName', category: 'Planet name' },
      { label: 'BOL', type: 'allianceTag', category: 'Alliance tag' },
      { label: 'Bolts', type: 'allianceName', category: 'Alliance name' },
    ],
  })
})

void test('a payload the endpoint could not have written is a parsing failure', () => {
  const broken: [string, StaticValue, string][] = [
    ['not an array', { label: 'x' }, 'Invalid autocomplete response'],

    ['a string entry', ['x'], 'Invalid autocomplete item'],
    ['a null entry', [null], 'Invalid autocomplete item'],
    ['a nested array', [[]], 'Invalid autocomplete item'],
    ['no label', [{}], 'Invalid autocomplete item'],
    ['no type', [{ label: 'x' }], 'Invalid autocomplete item'],
  ]
  for (const [name, payload, message] of broken)
    assert.throws(
      () => readSearchSuggestions(payload),
      { code: ErrorCode.ParseError, message },
      name,
    )
})

void test('suggestion labels decode HTML and search types stay usable by requests', () => {
  assert.deepEqual(
    readSearchSuggestions([
      { label: '<b>Bob</b> &amp; Co', type: 'playername', category: 'Players' },
    ]),
    [{ label: 'Bob & Co', type: 'playerName', category: 'Players' }],
  )
  assert.throws(() => readSearchSuggestions([{ label: 'x', type: 'unknownmode', category: 'A' }]), {
    code: ErrorCode.ParseError,
  })
  assert.throws(() => readSearchSuggestions([{ label: 'x', type: 'playername' }]), {
    code: ErrorCode.ParseError,
  })
  assert.deepEqual(readSearchSuggestions([]), [])
})

void test('the three documents ask three addresses', async () => {
  await expectOperation((session) => search(session), { url: SHELL_URL })
  await expectOperation((session) => searchResult(session, { term: 'Bob' }), {
    url: RESULT_URL,
  })
  await expectOperation((session) => searchAutocomplete(session, { term: 'Bob' }), {
    url: SUGGEST_URL,
  })
})

void test('a search of another kind travels as the value the endpoint reads', async () => {
  await expectOperation(
    (session) =>
      searchResult(session, {
        term: 'VOID',
        type: 'allianceTag',
      }),
    {
      url: `${BASE_URL}game.php?type=allytag&search=VOID&page=search&mode=result`,
    },
  )
})

void test('a term is sent as the caller typed it', async () => {
  await expectOperation((session) => searchResult(session, { term: ' Bo ' }), {
    url: `${BASE_URL}game.php?type=playername&search=+Bo+&page=search&mode=result`,
  })
})

void test('the suggestion request names every type it asks about, in order', async () => {
  await expectOperation(
    (session) =>
      searchAutocomplete(session, { term: 'Bo', types: ['allianceTag', 'allianceName'] }),
    {
      url: `${BASE_URL}game.php?term=Bo&type=allytag%7Callyname&page=search&mode=autocomplete`,
    },
  )
})

void test('a suggestion request that was not answered with a payload is a receipt', async () => {
  const observed = await decode((session) => searchAutocomplete(session, { term: 'Bo' }), {
    status: 302,
    headers: { Location: './index.php?page=login' },
  })
  assert.deepEqual(observed.data, {
    kind: 'redirect',
    target: new URL(`${BASE_URL}index.php?page=login`),
  })
})

void test('a search fragment is decoded where the endpoint rendered one', async () => {
  const observed = await decode(
    (session) => searchResult(session, { term: 'VOID' }),
    pageReply(pageHtml(searchAllianceResults)),
  )
  const document = observed.data
  assert.notEqual(document.kind, 'message')
  assert.equal(document.kind, 'searchResults')
  assert.equal(document.results.length, 1)
})
