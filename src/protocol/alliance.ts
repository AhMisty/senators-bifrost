import type { Selection } from './dom.ts'
import { contentText, responseUrl, selections, tableRows, textContent } from './dom.ts'
import { abbreviated, displayed } from './numbers.ts'
import type { Page } from './page.ts'

/**
 * Alliance action link; an omitted mode means show.
 *
 * 联盟页面提供的操作链接；未指定 mode 时使用 show。
 */
export type AllianceAction = {
  mode: string

  action: string | null

  id: string | null
  href: string
}

export type ContentSection = { title: string; text: string }

/**
 * Read this document's alliance actions in document order.
 *
 * 读取本页面的联盟操作，按文档顺序返回。
 */
export function allianceActions(
  page: Page,
  options: { cardButtons?: boolean } = {},
): AllianceAction[] {
  const selectors = [
    '#content .gray_flettab > a',
    '#content .gray_flettab > .tornaindietroa > a',
    '#content .tornaindietro > a',
    '#content .designation > a',
    '#content .ally_img > div > a[onclick]',
    '#content .card-body > a:has(> button)',
    '#content .card-body > a.batn_editing',
    '#content .alleanza45 > .ally_contents > div > a',
    '#content .alleanza5 > a[onclick]',
    '#content form[action]',
  ]
  if (options.cardButtons) selectors.push('#content .ally_img > div > a:has(> button)')
  return selections(page.$(selectors.join(',')))
    .filter((item) => !item.closest('.card-text,.alleanza36').length)

    .flatMap((item) => {
      const address = item.attr('href') ?? item.attr('action')
      return address === undefined ? [] : [responseUrl(address, page.url)]
    })
    .filter(
      (url) =>
        url.origin === page.url.origin &&
        url.pathname === page.url.pathname &&
        url.searchParams.get('page') === 'alliance',
    )
    .map((url) => ({
      mode: url.searchParams.get('mode') ?? 'show',
      action: url.searchParams.get('action'),
      id: url.searchParams.get('id'),
      href: url.href,
    }))
}

/**
 * Read titled sections, excluding sections with empty text.
 *
 * 读取标题与正文，并排除正文为空的区块。
 */
export function contentSections(
  page: Page,
  container: Selection,
  titleSelector: string,
  textSelector: string,
  nested: boolean,
): ContentSection[] {
  return container
    .toArray()
    .map((node) => {
      const section = page.$(node)
      const part = (selector: string): Selection =>
        nested ? section.find(selector) : section.children(selector)
      return { title: textContent(part(titleSelector)), text: contentText(part(textSelector)) }
    })
    .filter((section) => section.text)
}

export function memberListRows(page: Page): Selection[] {
  page.one('#memberList')
  return tableRows(page, '#memberList tbody tr')
}

/**
 * Member identity, join date and activity text; an undisclosed player ID is null.
 *
 * 成员身份、加入日期与活动原文；未公开的玩家 ID 为 null。
 */
export type MemberRow = {
  id: number | null
  name: string
  joinedAtText: string

  activityText: string
}

export function memberRow(page: Page, row: Selection): MemberRow {
  const cells = row.children('td')
  return {
    id: page.handlerId(cells.eq(0).find('a').attr('onclick'), 'Playercard'),
    name: textContent(cells.eq(0)),
    joinedAtText: textContent(cells.eq(5)),
    activityText: textContent(cells.eq(6)),
  }
}

/**
 * Prefer the full score tooltip; otherwise decode abbreviated text.
 *
 * 优先读取完整积分提示，否则解码缩写文本。
 */
export function memberPoints(cell: Selection): number {
  const title = cell.find('span[title]').attr('title')
  return title === undefined ? abbreviated(textContent(cell)) : displayed(title)
}
