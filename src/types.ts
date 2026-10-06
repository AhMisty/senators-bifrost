/**
 * Numeric selections keyed by element ID.
 *
 * 按元素 ID 索引的数值选择。
 */
export type ElementInput<Id extends number = number, Value extends number = number> = ReadonlyMap<
  Id,
  Value
>

/**
 * Observed quantities keyed by element ID.
 *
 * 按元素 ID 索引的观测数量。
 */
export type ElementMap = Map<number, number>

export type PlanetReference = {
  planetId: number
}

export type SnapshotConcurrencyOptions = {
  /**
   * Maximum in-flight requests; 1 is sequential, null is unlimited.
   *
   * 在途请求上限；1 为串行，null 为不限。
   */
  concurrency: number | null
}

/**
 * One observation's execution status; fulfilled does not guarantee business success.
 *
 * 单项观测的执行状态；fulfilled 不保证业务成功。
 */
export type SnapshotResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown }
  | { status: 'skipped' }

/**
 * Client-recorded time when the response body finished arriving, as Unix milliseconds.
 *
 * 客户端记录的正文接收完成时间，使用 Unix 毫秒时间戳。
 */
export type Observation = { observedAtMs: number }

/**
 * Observed planet and response time.
 *
 * 响应中的星球及观测时间。
 */
export type PlanetObservation = Observation & { planetId: number }

/**
 * Resource amounts; omitted fields submit zero.
 *
 * 资源数量；省略的字段提交为零。
 */
export type ResourceInput = Partial<Record<'metal' | 'crystal' | 'deuterium', number>>

/**
 * Universe position: galaxy:system:planet.
 *
 * 宇宙坐标：星系:恒星系:位置。
 */
export type Coordinate = { galaxy: number; system: number; planet: number }

/**
 * Target body: 1 planet, 2 debris, 3 moon.
 *
 * 目标类型：1 星球，2 残骸，3 月球。
 */
export type Location = Coordinate & {
  type: 1 | 2 | 3
}

/**
 * Raw request parameters keyed by server field names.
 *
 * 使用服务端字段名的原始请求参数。
 */
export type RequestParameters = URLSearchParams | string | Readonly<Record<string, string | number>>

export type ResourceAmounts = { metal: number; crystal: number; deuterium: number }

/**
 * Observed gross and net supply; displayed rounding prevents recovering exact consumption by subtraction.
 *
 * 观测到的总供给与净供给；显示舍入使两者不能相减还原精确消耗。
 */
export type ResourceSupply = {
  /**
   * Net supply after consumption.
   *
   * 扣除消耗后的净供给。
   */
  available: number
  /**
   * Gross production before consumption.
   *
   * 扣除消耗前的总产出。
   */
  total: number
}

export type FormOption<T = string> = { value: T; label: string }

export type PlanetContext = PlanetObservation & {
  /**
   * Header balances keyed by resource ID.
   *
   * 按资源 ID 索引的页头余额。
   */
  resources: ElementMap
  /**
   * Null when the header has no production ticker.
   *
   * 页头无产量计数器时为 null。
   */
  productionPerHour: ResourceAmounts | null
  storageCapacity: ResourceAmounts
  energy: ResourceSupply
}

export type Timing = {
  durationSeconds: number
  remainingSeconds: number
  /**
   * Calculated progress; zero duration means 100%.
   *
   * 计算得到的进度；时长为零表示 100%。
   */
  progressPercent: number
}

/**
 * Request and parsing error codes.
 *
 * 请求与解析错误码。
 */
export const ErrorCode = {
  /**
   * Caller input does not meet the operation's requirements.
   *
   * 调用方输入不满足操作要求。
   */
  ValidationError: 'validation',
  /**
   * The expected response cannot be decoded.
   *
   * 无法解析预期的响应。
   */
  ParseError: 'parse',
  /**
   * A failure reported by the server.
   *
   * 服务端响应明确报告的失败。
   */
  ServerError: 'server',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]
