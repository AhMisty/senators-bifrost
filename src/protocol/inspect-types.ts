import type { Coordinate, FormOption, ResourceSupply } from '../types.ts'
import type { ScriptSnapshot } from './script-data.ts'

/**
 * Page link and event source; source is observed, never executed.
 *
 * 页面链接及事件源码；源码仅供观察，不执行。
 */
export type PageLink = {
  text: string

  /**
   * Absolute URL, or null for missing or JavaScript hrefs.
   *
   * 绝对地址；href 缺失或为 JavaScript 时为 null。
   */
  url: string | null

  title: string | null

  handler: string | null
}

export type PageImage = {
  url: string

  description: string

  iconId: number | null
  tooltip: string | null
}

/**
 * Control display and submission data; multiple values are arrays and noncheckable controls use null.
 *
 * 控件的显示与提交信息；多选 value 为数组，checked 对不可勾选控件为 null。
 */
export type PageField = {
  name: string | null
  id: string | null

  type: string

  value: string | string[]

  label: string
  disabled: boolean
  required: boolean

  checked: boolean | null
  minimum: string | null
  maximum: string | null
  step: string | null

  options: (FormOption & { selected: boolean; disabled: boolean })[]
}

/**
 * Form description and successful fields; submittedFields excludes submit buttons.
 *
 * 表单描述及可提交字段；提交按钮不包含在 submittedFields 中。
 */
export type PageForm = {
  id: string | null

  action: string
  method: string
  encoding: string
  fields: PageField[]

  submittedFields: URLSearchParams
}

/**
 * Table cell; html is unsanitized remote content requiring safe handling before rendering.
 *
 * 表格单元格；html 是未净化的远端内容，呈现时需由调用方安全处理。
 */
export type PageCell = {
  text: string

  html: string
  isHeader: boolean
  columnSpan: number
  rowSpan: number
  attributes: Record<string, string>
  links: PageLink[]
  images: PageImage[]
}

/**
 * Document table; each row belongs only to its innermost containing table.
 *
 * 文档表格；每行仅属于包含它的最内层表格。
 */
export type PageTable = {
  id: string | null
  caption: string

  rows: PageCell[][]
}

export type PageTooltip = {
  sourceId: string | null

  ownerElementId: number | null
  text: string
  tables: PageTable[]
  links: PageLink[]
}

/**
 * Reported header resources; display text may be rounded and missing capacity or production is null.
 *
 * 头部实际报告的资源；显示文本可能舍入，未报告的容量与产量为 null。
 */
export type PageResource = {
  resourceId: number
  name: string

  displayedText: string
} & (
  | {
      kind: 'stock'

      stock: number

      capacity: number | null

      productionPerHour: number | null
      supply?: never
    }
  | {
      kind: 'supply'
      supply: ResourceSupply
      stock?: never
      capacity?: never
      productionPerHour?: never
    }
)

/**
 * Planet construction state; html contains unsanitized tooltip markup.
 *
 * 星球建造状态；html 为未净化的提示内容。
 */
export type PlanetActivity = {
  kind: 'building' | 'research' | 'shipyard'
  elementId: number | null
  text: string

  html: string
}

/**
 * Incoming alerts: 1 attack, 6 spy, 9 moon destruction, 10 missiles, 12 capture; retain the displayed ID.
 *
 * 来袭提示：1 攻击、6 侦察、9 毁月、10 导弹、12 占领；保留显示任务编号。
 */
export type PlanetAlert = {
  mission: 1 | 6 | 9 | 10 | 12

  /**
   * True unless hidden by the template's inline style.
   *
   * 未被模板内联样式隐藏时为 true。
   */
  active: boolean

  displayedMission: 1 | 6 | 9 | 10 | 12

  label: string
}

/**
 * Navigation planet or moon; moons reference their parent planet and have empty activity.
 *
 * 导航中的行星或月球；月球关联母星，月球 activity 为空。
 */
export type NavigationPlanet = {
  id: number

  /**
   * 1 denotes a planet and 3 a moon.
   *
   * 1 为行星，3 为月球。
   */
  type: 1 | 3

  parentPlanetId: number | null
  name: string | null
  coordinate: Coordinate | null
  imageUrl: string | null
  isCurrent: boolean

  activity: PlanetActivity[]
  alerts: PlanetAlert[]
}

/**
 * Identity, planet and resources disclosed by this response, without filling from other pages.
 *
 * 仅包含本响应实际公开的身份、星球及资源上下文，不从其他页面补齐。
 */
export type PageContext = {
  playerId: number | null
  username: string | null
  planetId: number | null
  planetName: string | null
  coordinate: Coordinate | null

  language: string | null

  authorizationLevel: number | null

  /**
   * User timezone offset minus server timezone offset, in seconds.
   *
   * 玩家时区偏移减去服务端时区偏移，单位为秒。
   */
  timezoneDifferenceSeconds: number | null

  resourceReadings: Map<number, PageResource>
  planets: NavigationPlanet[]
  navigation: PageLink[]
}

/**
 * Static document content; text excludes scripts/styles and controls lists controls outside forms.
 *
 * 静态文档内容；text 排除 script/style，controls 为表单之外的控件。
 */
export type PageDocument = {
  title: string

  text: string

  message: string | null
  headings: { level: number; text: string }[]
  links: PageLink[]
  images: PageImage[]
  forms: PageForm[]

  controls: PageField[]
  tables: PageTable[]
  tooltips: PageTooltip[]
  scripts: ScriptSnapshot

  refresh: { delaySeconds: number; url: string } | null
}

/**
 * Complete document and page context disclosed by the response.
 *
 * 完整文档及该响应公开的页面上下文。
 */
export type PageInspection = {
  document: PageDocument

  pageContext: PageContext
}
