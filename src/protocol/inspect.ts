import { ErrorCode } from '../types.ts'
import type { HttpResponse } from './client.ts'
import {
  RESOURCE_IDS,
  hasTicker,
  headerBalance,
  headerCapacity,
  headerResource,
  resourceSupply,
} from './context.ts'
import { coordinateIn } from './coordinates.ts'
import type { Selection } from './dom.ts'
import {
  imageId,
  optionValue,
  renderedOptions,
  requiredAttribute,
  requiredHtml,
  requiredTagName,
  responseUrl,
  selections,
  splitTrailingParenthetical,
  textContent,
} from './dom.ts'
import { controlValue, formFields, selectedOptions, isDisabled } from './forms.ts'
import { handlerAddress } from './handlers.ts'
import type {
  NavigationPlanet,
  PageContext,
  PageDocument,
  PageField,
  PageImage,
  PageInspection,
  PageLink,
  PageResource,
  PageTable,
  PlanetActivity,
  PlanetAlert,
} from './inspect-types.ts'
import { readAmount, readDecimal, readInteger } from './numbers.ts'
import type { Page } from './page.ts'
import { parsePage, tooltipPage } from './page.ts'
import { OperationError, withResponse } from './result.ts'

function pageLinks(page: Page, selection: Selection): PageLink[] {
  return selection.toArray().map((node) => {
    const link = page.$(node)
    const href = link.attr('href')
    const handler = handlerAddress(href)
    return {
      text: textContent(link),
      url: href && handler === null ? responseUrl(href, page.url).href : null,
      title: link.attr('title') ?? link.attr('data-tooltip-content') ?? null,
      handler: link.attr('onclick') ?? handler,
    }
  })
}

function images(page: Page, selection: Selection): PageImage[] {
  return selection.toArray().map((node) => {
    const image = page.$(node)

    const source = image.attr('src')
    if (source === undefined) throw new OperationError(ErrorCode.ParseError, 'Missing image source')
    return {
      url: responseUrl(source, page.url).href,
      description: image.attr('alt') ?? '',
      iconId: imageId(source),
      tooltip: image.attr('data-tooltip-content') ?? image.attr('title') ?? null,
    }
  })
}

function fields(page: Page, controls: Selection, labels: ReadonlyMap<string, string>): PageField[] {
  return controls.toArray().map((node) => {
    const control = page.$(node)
    const type =
      control.attr('type')?.toLowerCase() ??
      (control.is('input')
        ? 'text'
        : control.is('button')
          ? 'submit'
          : requiredTagName(control).toLowerCase())
    const id = control.attr('id') ?? null
    const label = (id ? labels.get(id) : undefined) || textContent(control.closest('label'))
    const options = control.is('select') ? selectedOptions(control) : undefined
    const current = controlValue(control, options)
    const selected = new Set(options?.toArray())

    const rendered = renderedOptions(control)
    return {
      name: control.attr('name') ?? null,
      id,
      type,
      value: current,
      label:
        label ||
        control.attr('aria-label') ||
        control.attr('placeholder') ||
        control.attr('title') ||
        (control.is('button')
          ? textContent(control)
          : ['submit', 'button', 'reset'].includes(type)
            ? (control.attr('value') ?? '')
            : (control.attr('alt') ?? '')),
      disabled: isDisabled(page, control),
      required: control.attr('required') !== undefined,
      checked: type === 'checkbox' || type === 'radio' ? control.is(':checked') : null,
      minimum: control.attr('min') ?? null,
      maximum: control.attr('max') ?? null,
      step: control.attr('step') ?? null,

      options: rendered.map(({ node: optionNode, option }) => {
        return {
          value: optionValue(option),
          label: textContent(option),
          selected: selected.has(optionNode),
          disabled: isDisabled(page, option),
        }
      }),
    }
  })
}

const BODY_TEXTS = new WeakMap<Page, string>()

function bodyText(page: Page): string {
  const cached = BODY_TEXTS.get(page)
  if (cached !== undefined) return cached
  const copy = page.$('body').clone()
  copy.find('script,style').remove()
  const text = textContent(copy)
  BODY_TEXTS.set(page, text)
  return text
}

function pageDocument(page: Page): PageDocument {
  const labels = new Map<string, string>()
  page.$('label[for]').each((_index, node) => {
    const label = page.$(node)
    const id = requiredAttribute(label, 'for')
    const text = textContent(label)
    labels.set(id, [labels.get(id), text].filter(Boolean).join(' '))
  })
  const refresh = page
    .$('meta[http-equiv]')
    .filter((_index, node) => page.$(node).attr('http-equiv')?.toLowerCase() === 'refresh')
    .attr('content')
    ?.match(/^\s*(\d+(?:\.\d+)?)\s*;\s*url\s*=\s*(.+)$/i)
  return {
    title: textContent(page.$('title')),
    text: bodyText(page),
    message: page.message(),
    headings: page
      .$('h1,h2,h3,h4,h5,h6')
      .toArray()
      .map((node) => ({ level: Number(node.tagName.slice(1)), text: textContent(page.$(node)) })),
    links: pageLinks(page, page.$('a')),
    images: images(page, page.$('img')),
    forms: selections(page.$('form')).map((form) => ({
      id: form.attr('id') ?? null,

      action: responseUrl(form.attr('action') ?? '', page.url).href,
      method: (form.attr('method') ?? 'GET').toUpperCase(),
      encoding: form.attr('enctype') ?? 'application/x-www-form-urlencoded',
      fields: fields(page, form.find('input,select,textarea,button'), labels),
      submittedFields: formFields(page, form),
    })),
    controls: fields(
      page,
      page
        .$('input,select,textarea,button')
        .filter((_index, node) => page.$(node).closest('form').length === 0),
      labels,
    ),
    tables: pageTables(page),

    tooltips: selections(page.$('[data-tooltip-content]')).map((item) => {
      const tooltip = tooltipPage(page, item)
      const owner = item
        .closest('.build_box')
        .attr('id')
        ?.match(/(?:^|_)(\d+)$/)?.[1]
      return {
        sourceId: item.attr('id') ?? null,
        ownerElementId: owner ? readInteger(owner, 1) : null,
        text: textContent(tooltip.$('body')),
        tables: pageTables(tooltip),
        links: pageLinks(tooltip, tooltip.$('a')),
      }
    }),
    scripts: page.scripts.snapshot(),
    refresh: refresh
      ? {
          delaySeconds: readAmount(refresh[1]),
          url: responseUrl(refresh[2]!.replace(/^['"]|['"]$/g, ''), page.url).href,
        }
      : null,
  }
}

/**
 * Inspect a complete response statically, returning text, controls, links and page context.
 *
 * 静态检查完整响应；返回正文、控件、链接与页面上下文。
 */
export function inspectPage(response: HttpResponse): PageInspection {
  return withResponse(response, () => inspection(parsePage(response)))
}

/**
 * Inspect an already parsed page, reusing its caches.
 *
 * 检查已解析的页面，复用该页面的缓存。
 */
export function inspection(page: Page): PageInspection {
  return { document: pageDocument(page), pageContext: pageContext(page) }
}

function emptyContext(): PageContext {
  return {
    playerId: null,
    username: null,
    planetId: null,
    planetName: null,
    coordinate: null,
    language: null,
    authorizationLevel: null,
    timezoneDifferenceSeconds: null,
    resourceReadings: new Map(),
    planets: [],
    navigation: [],
  }
}

function alertIndicator(suffix: string): PlanetAlert['displayedMission'] | null {
  switch (suffix) {
    case '1':
      return 1
    case '6':
      return 6
    case '9':
      return 9
    case '10':
      return 10
    case '12':
      return 12
    default:
      return null
  }
}

/**
 * The moon template swaps spy and missile indicator IDs; restore the actual mission.
 *
 * 月球模板交换了侦察与导弹图标编号，此处还原真实任务。
 */
function alertMission(
  displayed: PlanetAlert['displayedMission'],
  moon: boolean,
): PlanetAlert['mission'] {
  if (displayed === 6) return moon ? 10 : 6
  if (displayed === 10) return moon ? 6 : 10
  return displayed
}

function pageContext(page: Page): PageContext {
  const context = emptyContext()
  const planetLabels = new Map<number, string>()
  page.$('#lstPlaneta option[value]').each((_index, node) => {
    const option = page.$(node)

    const id = responseUrl(option.attr('value'), page.url).searchParams.get('cp')
    planetLabels.set(readInteger(id, 1), textContent(option).replace(/\s*\[\d+:\d+:\d+\]$/, ''))
  })
  const actor = page.$('.usernameow[onclick]')
  if (actor.length) {
    context.playerId = page.handlerId(actor.attr('onclick'), 'Playercard')
    context.username = textContent(actor) || null
  }
  context.planetId = page.optionalPlanetId()
  context.planetName = textContent(page.$('#planet_select .active_panet .name_palnet')) || null
  context.coordinate = coordinateIn(
    page.$('#planet_select .active_panet .coordinates_palnet').text(),
  )
  context.language = page.$('html').attr('lang') ?? null
  const snapshot = page.scripts.snapshot()
  const authorization = snapshot.bindings.find((entry) => entry.name === 'auth')
  if (typeof authorization?.data === 'string')
    context.authorizationLevel = readInteger(authorization.data)
  const timezone = snapshot.bindings.find((entry) => entry.name === 'ServerTimezoneOffset')
  if (typeof timezone?.data === 'string')
    context.timezoneDifferenceSeconds = readDecimal(timezone.data)
  for (const id of RESOURCE_IDS) {
    const reading = headerResource(page, id)
    if (reading === null) continue
    let resource: PageResource
    if (reading.kind === 'supply') {
      resource = {
        resourceId: reading.resourceId,
        name: reading.name,
        displayedText: textContent(reading.text),
        kind: 'supply',
        supply: resourceSupply(page, reading.resourceId),
      }
    } else {
      const stock = headerBalance(page, reading.resourceId)
      if (stock === null)
        throw new OperationError(ErrorCode.ParseError, `Missing ${reading.name} balance`)
      const supply = hasTicker(reading.resourceId) ? headerCapacity(page, reading.resourceId) : null
      resource = {
        resourceId: reading.resourceId,
        name: reading.name,
        displayedText: textContent(reading.text),
        kind: 'stock',
        stock,
        capacity: supply?.capacity ?? null,
        productionPerHour: supply?.production ?? null,
      }
    }
    context.resourceReadings.set(reading.resourceId, resource)
  }
  page.$('#list_palnet .palnet_row').each((_index, node) => {
    const row = page.$(node)
    const planet = row.find('span[url]').first()

    if (!planet.length) return
    const id = new URLSearchParams(requiredAttribute(planet, 'url')).get('cp')
    if (!id) return
    const planetId = readInteger(id, 1)

    const icons = selections(planet.find('.ico_build img[data-tooltip-content][src]'))
    const activity: PlanetActivity[] = icons.map((item) => {
      const source = requiredAttribute(item, 'src')
      const html = requiredAttribute(item, 'data-tooltip-content')
      const content = tooltipPage(page, item)
      return {
        kind: source.includes('_build')
          ? 'building'
          : source.includes('_tech')
            ? 'research'
            : 'shipyard',
        elementId: imageId(content.$('img').attr('src')),
        text: textContent(content.$('body')),
        html,
      }
    })

    const indicators = selections(row.find('.fleet_indicators img[id]'))
    for (const item of selections(row.find('span[url]'))) {
      const currentId = readInteger(new URLSearchParams(item.attr('url')).get('cp'), 1)
      const moon = currentId !== planetId
      const alerts: PlanetAlert[] = indicators.flatMap((icon) => {
        const match = icon.attr('id')?.match(/^(\d+)m(\d+)$/)
        if (!match || Number(match[1]) !== currentId) return []
        const displayedMission = alertIndicator(match[2]!)
        if (displayedMission === null) return []
        return [
          {
            mission: alertMission(displayedMission, moon),
            displayedMission,
            active: !/display\s*:\s*none/i.test(icon.attr('style') ?? ''),
            label: requiredAttribute(icon, 'data-tooltip-content'),
          },
        ]
      })
      const image = item.find('img').first().attr('src')
      const selectorName = planetLabels.get(currentId)
      const entry: NavigationPlanet = {
        id: currentId,
        type: moon ? 3 : 1,
        parentPlanetId: moon ? planetId : null,
        name:
          textContent(item.find('.name_palnet')) ||
          (currentId === context.planetId ? context.planetName : null) ||
          (selectorName
            ? moon
              ? splitTrailingParenthetical(selectorName).text
              : selectorName
            : null),
        coordinate: coordinateIn(item.find('.coordinates_palnet').text()),
        imageUrl: image ? responseUrl(image, page.url).href : null,
        isCurrent: currentId === context.planetId,
        activity: moon ? [] : activity,
        alerts,
      }
      context.planets.push(entry)
    }
  })
  context.navigation = pageLinks(
    page,
    page.$('#left_menu a, #top_nav_parte_left a, #top_nav_parte_sotto a, nav a, .navbar a'),
  )
  return context
}

/**
 * Group rows by their nearest table to avoid duplicate ownership and repeated traversal.
 *
 * 预先按最近的 table 分组行，避免嵌套表格重复归属与重复遍历。
 */
function pageTables(page: Page): PageTable[] {
  const owned = new Map<unknown, Selection[]>()
  for (const row of selections(page.$('tr'))) {
    const owner = row.closest('table').node()
    if (owner === undefined) continue
    const rows = owned.get(owner)
    if (rows) rows.push(row)
    else owned.set(owner, [row])
  }
  return selections(page.$('table')).map((table) => {
    return {
      id: table.attr('id') ?? null,
      caption: textContent(table.children('caption')),
      rows: (owned.get(table.node()) ?? []).map((row) =>
        row
          .children('th,td')
          .toArray()
          .map((cell) => {
            const item = page.$(cell)
            return {
              text: textContent(item),
              html: requiredHtml(item, 'cell'),
              isHeader: item.is('th'),
              attributes: { ...cell.attribs },
              columnSpan: readInteger(item.attr('colspan') ?? 1, 1),
              rowSpan: readInteger(item.attr('rowspan') ?? 1, 1),
              links: pageLinks(page, item.find('a')),
              images: images(page, item.find('img')),
            }
          }),
      ),
    }
  })
}
