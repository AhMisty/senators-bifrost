// 游戏数据类型：各解析器产出的格式化数据形状，跨模块共享。
// 元素 id → 数值 的映射贯穿全部页面（资源/建筑/科研/舰船统一用数字 id，无名称目录）。
export type ElementMap = Map<number, number>

// 队列项：element 为元素 id，count 为数量/等级（科研与建筑队列中 count 表示等级）
export type QueueItem = {
  element: number
  count: number
}

export type Coordinate = {
  galaxy: number
  system: number
  position: number
}

// 特殊资源（921-924）：从 control 页的命名元素解析，主资源（金属/晶体/重氢）在 elements 映射中
export type Resources = {
  darkmatter: number
  antimatter: number
  stardust: number
  container: number
}

// 行星列信息：type 区分行星/月球（New-Star 主题的行星列容器无 id，按类型图标 class 区分）
export type PlanetInfo = {
  id: number
  type: 'planet' | 'moon'
  name: string
  coordinate: Coordinate
  used: number
  size: number
  elements: ElementMap
}

export type ControlData = {
  playerId: number
  resources: Resources
  // 161 项元素总量（含资源/建筑/科研/舰船/防御等，id 来自页面图标序列）
  elements: ElementMap
  planets: PlanetInfo[]
}

export type Limits = {
  metal: number
  crystal: number
  deuterium: number
}

// 队列解析：items 来自 2Moons 系主题的 #build_process（本主题缺失时为空列表）；
// progress 为 New-Star 主题的建造进度百分比（0-100，无队列时 0）
export type QueueData = {
  items: QueueItem[]
  progress: number
}

export type BuildingsData = {
  // 净能源（产能 − 消耗，可为负）
  energy: number
  limits: Limits
  queue: QueueData
  // 建筑 id → 当前等级
  levels: ElementMap
}

export type ResearchData = {
  queue: QueueData
  // 科技 id → 当前等级
  levels: ElementMap
}

export type ShipyardData = {
  // 净能源（产能 − 消耗，可为负）
  energy: number
  limits: Limits
  queue: QueueData
  // 舰船/防御 id → 已拥有数量
  available: ElementMap
}

// 动作结果：业务失败返回 {ok:false, error}（错误文本来自页面的 ally_contents 块）；网络/解析错误仍抛异常
export type ActionResult = { ok: true } | { ok: false; error: string }
