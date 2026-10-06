import type { Ack, PageReply } from '../../protocol/ack.ts'
import {
  isSupplyResourceId,
  readResourceId,
  resourceSupply,
  resourceTicker,
  TICKER_RESOURCES,
} from '../../protocol/context.ts'
import type { StockResourceId, SupplyResourceId } from '../../protocol/context.ts'
import {
  ELEMENT_ICON_SELECTOR,
  elementId,
  optionValue,
  renderedOptions,
  requiredAttribute,
  selections,
} from '../../protocol/dom.ts'
import { fixedElementBody } from '../../protocol/elements.ts'
import { controlValue } from '../../protocol/forms.ts'
import { abbreviated, readQuantity } from '../../protocol/numbers.ts'
import { planetObservation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import { OperationError } from '../../protocol/result.ts'
import type { Observed, PlanetData } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import {
  PRODUCTION_ELEMENT_IDS,
  readProducerId,
  readProductionStep,
} from '../../protocol/values.ts'
import type { ProducerElementId, ProductionStep } from '../../protocol/values.ts'
import type { Session } from '../../session.ts'
import { ErrorCode } from '../../types.ts'
import type {
  ElementInput,
  ElementMap,
  PlanetObservation,
  PlanetReference,
  ResourceSupply,
} from '../../types.ts'

/**
 * Production steps 0–10 correspond to 0%–100%.
 *
 * 生产档位 0–10 对应 0%–100%。
 */
export type ProductionSetting = {
  elementId: ProducerElementId

  elementLevel: number
  step: ProductionStep

  allowedSteps: ProductionStep[]
}

/**
 * Basic, producer and bonus values retain the page's abbreviated precision; storage and aggregate production prefer raw ticker data.
 *
 * 基础、生产设施及加成数值保留页面缩写精度；仓储容量与总产量优先使用原始计时数据。
 */
export type ResourceProduction = {
  basic: number

  producers: ElementMap

  bonus: number
} & (
  | {
      kind: 'stock'
      resourceId: StockResourceId
      storageCapacity: number
      hourly: number
      daily: number

      weekly: number
      supply?: never
    }
  | {
      kind: 'supply'
      resourceId: SupplyResourceId

      supply: ResourceSupply
      storageCapacity?: never
      hourly?: never
      daily?: never
      weekly?: never
    }
)

export type ResourcesPage = PlanetObservation & {
  kind: 'resources'

  settings: ProductionSetting[]

  production: ResourceProduction[]
}

type ProductionSettingRow = Omit<ProductionSetting, 'elementLevel'>

function productionSettings(page: Page): ProductionSettingRow[] {
  const form = page
    .$('form')
    .filter((_index, node) => page.$(node).find('input[name="mode"][value="send"]').length > 0)
  if (form.length !== 1)
    throw new OperationError(ErrorCode.ParseError, 'Missing resource production form')
  return selections(form.find('select[name^="prod["]')).map((select) => {
    const id = requiredAttribute(select, 'name').match(/^prod\[(\d+)\]$/)
    if (!id) throw new OperationError(ErrorCode.ParseError, 'Invalid production field')
    return {
      elementId: readProducerId(id[1]),
      step: readProductionStep(controlValue(select)),

      allowedSteps: renderedOptions(select).map(({ option }) =>
        readProductionStep(optionValue(option)),
      ),
    }
  })
}

export function readResources(page: Page): ResourcesPage {
  const settings = productionSettings(page)
  const columns = page.$('.rexx1')
  const labels = columns

    .filter(
      (_index, node) => !/rexx(?:9\d+|procent)/.test(requiredAttribute(page.$(node), 'class')),
    )
  if (labels.length !== 1)
    throw new OperationError(ErrorCode.ParseError, 'Missing resource production label column')

  const producers = selections(labels.first().children('.rexx2')).flatMap((row) => {
    const src = row.find(ELEMENT_ICON_SELECTOR).first().attr('src')
    return src === undefined ? [] : [{ elementId: elementId(src), row }]
  })
  if (
    producers.length !== settings.length ||
    producers.some((entry, index) => entry.elementId !== settings[index]!.elementId)
  )
    throw new OperationError(ErrorCode.ParseError, 'Production columns do not align')
  const levels = producers.map((entry) => readQuantity(entry.row.find('.rexx4').text()))
  const production: ResourceProduction[] = []
  const resourceIds = new Set<number>()
  columns.each((_index, node) => {
    const resource = requiredAttribute(page.$(node), 'class').match(/(?:^|\s)rexx(9\d+)(?:\s|$)/)
    if (!resource) return
    const rows = selections(page.$(node).children('.rexx2')).map((row) => row.text().trim())
    if (rows.length !== settings.length + 6)
      throw new OperationError(ErrorCode.ParseError, 'Production columns do not align')
    const offset = settings.length + 1
    const id = readResourceId(resource[1])
    if (resourceIds.has(id))
      throw new OperationError(ErrorCode.ParseError, 'Duplicate resource production column')
    resourceIds.add(id)
    /**
     * Vacation mode omits tickers; rendered columns then provide rounded values.
     *
     * 休假模式不提供资源计时数据，此时读取页面显示的舍入值。
     */
    const ticker = resourceTicker(page, id)

    const hourly = ticker?.production ?? null
    const capacity = ticker?.capacity ?? null
    const details = {
      basic: abbreviated(rows[0]!),
      producers: new Map(
        settings.map((setting, index) => [setting.elementId, abbreviated(rows[index + 1]!)]),
      ),
      bonus: abbreviated(rows[offset]!),
    }
    if (isSupplyResourceId(id))
      production.push({
        ...details,
        resourceId: id,
        kind: 'supply',
        supply: resourceSupply(page, id),
      })
    else
      production.push({
        ...details,
        resourceId: id,
        kind: 'stock',
        storageCapacity: capacity ?? abbreviated(rows[offset + 1]!),
        hourly: hourly ?? abbreviated(rows[offset + 2]!),

        daily: hourly === null ? abbreviated(rows[offset + 3]!) : hourly * 24,
        weekly: hourly === null ? abbreviated(rows[offset + 4]!) : hourly * 168,
      })
  })
  if (TICKER_RESOURCES.some(({ id }) => !resourceIds.has(id)))
    throw new OperationError(ErrorCode.ParseError, 'Missing resource production column')
  return {
    kind: 'resources',
    ...planetObservation(page),
    settings: settings.map((setting, index) => ({
      elementId: setting.elementId,
      elementLevel: levels[index]!,
      step: setting.step,
      allowedSteps: setting.allowedSteps,
    })),
    production,
  }
}

export function resources(
  session: Session,
  options: PlanetReference,
): Promise<Observed<PlanetData<PageReply<ResourcesPage>>>> {
  return routePage(session, GAME_ROUTES.resources, { planetId: options.planetId }, readResources)
}

/**
 * Update only the supplied production steps on the selected planet.
 *
 * 仅更新所选星球中本次提供的生产档位。
 */
export function resourcesSend(
  session: Session,
  options: PlanetReference & { steps: ElementInput<ProducerElementId, ProductionStep> },
): Promise<Observed<Ack>> {
  return routeAck(
    session,
    GAME_ROUTES.resourcesSend,
    {
      planetId: options.planetId,
      method: 'POST',
      body: fixedElementBody(options.steps, PRODUCTION_ELEMENT_IDS, 'prod[', ']'),
    },
    false,
  )
}

/**
 * Set production on all owned planets to 100% when enabled and 0% when disabled.
 *
 * 将所有所属星球的生产设为 100%（启用）或 0%（停用）。
 */
export function resourcesAllPlanets(
  session: Session,
  options: PlanetReference & { enabled: boolean },
): Promise<Observed<PlanetData<Ack>>> {
  return routeAck(session, GAME_ROUTES.resourcesAllPlanets, {
    planetId: options.planetId,
    method: 'POST',
    body: { action: options.enabled ? 'on' : 'off' },
  })
}
