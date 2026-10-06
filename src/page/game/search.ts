import type { Ack, PageReply } from '../../protocol/ack.ts'
import { coordinate } from '../../protocol/coordinates.ts'
import type { Selection } from '../../protocol/dom.ts'
import { requiredLinkId, selectOptions, tableRows, textContent } from '../../protocol/dom.ts'
import { displayed, readQuantity } from '../../protocol/numbers.ts'
import { observation, parseHtmlText } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { observe, OperationError } from '../../protocol/result.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES, SEARCH_TYPES } from '../../protocol/routes.ts'
import type { SearchType } from '../../protocol/routes.ts'
import type { StaticValue } from '../../protocol/script-data.ts'
import type { Session } from '../../session.ts'
import type { Coordinate, FormOption, Observation } from '../../types.ts'
import { ErrorCode } from '../../types.ts'

export type SearchPage = Observation & {
  kind: 'search'

  types: FormOption<SearchType>[]
}

/**
 * A player or alliance match identified by the server result row.
 *
 * 由服务端结果行标识的玩家或联盟匹配项。
 */
export type SearchResult =
  | {
      kind: 'alliance'
      tag: string
      name: string
      members: number
      points: number
    }
  | {
      kind: 'player'

      id: number | null
      name: string

      alliance: {
        id: number
        name: string
      } | null

      planet: string
      coordinate: Coordinate

      rankText: string
    }

export type SearchResultsPage = Observation & {
  kind: 'searchResults'
  results: SearchResult[]
}

export type SearchSuggestionEntry = {
  label: string

  type: SearchType

  category: string
}

export type SearchSuggestionsPage = Observation & {
  kind: 'searchSuggestions'
  suggestions: SearchSuggestionEntry[]
}

export function readSearch(page: Page): SearchPage {
  page.one('[name="searchtext"]')
  return {
    kind: 'search',
    ...observation(page),
    types: selectOptions(page, '[name="type"]').map(({ value, label }) => ({
      value: searchType(value),
      label,
    })),
  }
}

function readSearchResult(page: Page, row: Selection): SearchResult {
  const cells = row.children('td')
  if (cells.length === 4)
    return {
      kind: 'alliance',
      tag: textContent(cells.eq(0)),
      name: textContent(cells.eq(1)),
      members: readQuantity(textContent(cells.eq(2))),

      points: displayed(textContent(cells.eq(3))),
    }
  if (cells.length === 6) {
    const alliance = cells.eq(2).find('a')
    return {
      kind: 'player',
      id: page.handlerId(cells.eq(0).find('a').attr('onclick'), 'Playercard'),
      name: textContent(cells.eq(0)),
      alliance: alliance.length
        ? {
            id: requiredLinkId(page, alliance),
            name: textContent(alliance),
          }
        : null,
      planet: textContent(cells.eq(3)),
      coordinate: coordinate(textContent(cells.eq(4))),
      rankText: textContent(cells.eq(5)),
    }
  }
  throw new OperationError(ErrorCode.ParseError, 'Unknown search result row')
}

export function readSearchResults(page: Page): SearchResultsPage {
  page.one('#resulttable')
  return {
    kind: 'searchResults',
    ...observation(page),
    results: tableRows(page, '#resulttable tr').map((row) => readSearchResult(page, row)),
  }
}

function searchType(value: string): SearchType {
  switch (value) {
    case SEARCH_TYPES.playerName:
      return 'playerName'
    case SEARCH_TYPES.planetName:
      return 'planetName'
    case SEARCH_TYPES.allianceName:
      return 'allianceName'
    case SEARCH_TYPES.allianceTag:
      return 'allianceTag'
    default:
      throw new OperationError(ErrorCode.ParseError, 'Unknown search type')
  }
}

export function readSearchSuggestions(payload: StaticValue): SearchSuggestionEntry[] {
  if (!Array.isArray(payload))
    throw new OperationError(ErrorCode.ParseError, 'Invalid autocomplete response')
  return payload.map((item) => {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item) ||
      typeof item.label !== 'string' ||
      typeof item.type !== 'string' ||
      typeof item.category !== 'string'
    )
      throw new OperationError(ErrorCode.ParseError, 'Invalid autocomplete item')
    return {
      label: parseHtmlText(item.label),

      type: searchType(item.type),
      category: item.category,
    }
  })
}

export function search(session: Session): Promise<Observed<PageReply<SearchPage>>> {
  return routePage(session, GAME_ROUTES.search, {}, readSearch)
}

/**
 * Search by player name by default; the term is sent unchanged.
 *
 * 默认按玩家名称搜索；搜索词保持原样发送。
 */
export function searchResult(
  session: Session,
  options: {
    term: string

    type?: SearchType | undefined
  },
): Promise<Observed<PageReply<SearchResultsPage>>> {
  return routePage(
    session,
    GAME_ROUTES.searchResult,
    {
      query: { type: SEARCH_TYPES[options.type ?? 'playerName'], search: options.term },
    },
    readSearchResults,
  )
}

/**
 * Fetch suggestions for the selected search kinds, defaulting to player names.
 *
 * 读取所选搜索类别的候选项，默认搜索玩家名称。
 */
export async function searchAutocomplete(
  session: Session,
  options: {
    term: string

    types?: readonly SearchType[]
  },
): Promise<Observed<Ack | SearchSuggestionsPage>> {
  const types = options.types ?? ['playerName']
  const answer = await routeAck(session, GAME_ROUTES.searchAutocomplete, {
    query: { term: options.term, type: types.map((type) => SEARCH_TYPES[type]).join('|') },
  })
  return observe<Ack | SearchSuggestionsPage>(answer.response, () =>
    answer.data.kind === 'json'
      ? {
          kind: 'searchSuggestions',

          observedAtMs: answer.response.observedAtMs,
          suggestions: readSearchSuggestions(answer.data.value),
        }
      : answer.data,
  )
}
