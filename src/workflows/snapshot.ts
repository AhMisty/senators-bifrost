import { notifications } from '../endpoints.ts'
import { buildings } from '../page/game/buildings.ts'
import { control } from '../page/game/control.ts'
import { findDebris } from '../page/game/findDebris.ts'
import { overview } from '../page/game/overview.ts'
import { planet } from '../page/game/planet.ts'
import { research } from '../page/game/research.ts'
import { resources } from '../page/game/resources.ts'
import { shipyard } from '../page/game/shipyard.ts'
import type { Observed } from '../protocol/result.ts'
import type { Session } from '../session.ts'
import type { PlanetReference, SnapshotConcurrencyOptions, SnapshotResult } from '../types.ts'
import { WorkflowRequests } from './requests.ts'

/**
 * A named extension result; retain the response to inspect data outside the shared kind field.
 *
 * 带名称的扩展结果；公共类型仅保留 kind，其他数据可通过原始响应检查。
 */
export type SnapshotPage = { name: string; result: SnapshotResult<Observed<{ kind: string }>> }

export type SnapshotOptions = PlanetReference & SnapshotConcurrencyOptions

/**
 * One independent account read with typed business parameters supplied by the caller.
 *
 * 一个独立账号读取，由调用方提供对应业务方法的类型化参数。
 */
export type SnapshotRequest = {
  name: string
  read: (session: Session) => Promise<Observed<{ kind: string }>>
}

/**
 * One independent read bound to the snapshot planet.
 *
 * 一个绑定至快照星球的独立读取。
 */
export type PlanetSnapshotRequest = {
  name: string
  read: (session: Session, planet: PlanetReference) => Promise<Observed<{ kind: string }>>
}

async function readAdditional<Request extends { name: string }>(
  reader: WorkflowRequests,
  requests: readonly Request[],
  read: (request: Request) => Promise<Observed<{ kind: string }>>,
): Promise<SnapshotPage[]> {
  const results = await reader.batch(requests.map((request) => () => read(request)))
  return requests.map((request, index) => ({ name: request.name, result: results[index]! }))
}

export type PlanetSnapshotOptions = SnapshotOptions & {
  additional?: readonly PlanetSnapshotRequest[] | undefined
}

/**
 * Independent planet observations and their responses; the snapshot is not atomic.
 *
 * 相互独立的星球观察结果及响应；整个快照不是原子操作。
 */
export type PlanetSnapshot = {
  kind: 'planetSnapshot'

  /**
   * Requested planet; each returned document identifies the planet actually selected by New-Star.
   *
   * 请求的星球；每个返回文档分别标明 New-Star 实际选择的星球。
   */
  planetId: number
  startedAtMs: number
  completedAtMs: number
  overview: SnapshotResult<Awaited<ReturnType<typeof overview>>>
  buildings: SnapshotResult<Awaited<ReturnType<typeof buildings>>>
  shipyard: SnapshotResult<Awaited<ReturnType<typeof shipyard>>>
  resources: SnapshotResult<Awaited<ReturnType<typeof resources>>>
  planet: SnapshotResult<Awaited<ReturnType<typeof planet>>>
  findDebris: SnapshotResult<Awaited<ReturnType<typeof findDebris>>>
  additional: SnapshotPage[]
}

/**
 * Collect overview, buildings, fleet shipyard, resources, planet details and local debris, plus explicit extensions.
 *
 * 采集总览、建筑、舰船建造、资源、星球详情和附近残骸，并执行显式扩展。
 *
 * @returns Independent results, including failed or skipped reads.
 *
 * 各项独立结果，包括失败或跳过的读取。
 *
 * @throws {ValidationError} When concurrency is neither null nor a positive safe integer.
 *
 * 并发数既不是 null，也不是正安全整数时抛出。
 */
export async function snapshotPlanet(
  session: Session,
  options: PlanetSnapshotOptions,
): Promise<PlanetSnapshot> {
  const reader = new WorkflowRequests(session, options.concurrency)
  return readPlanetSnapshot(reader, options)
}

async function readPlanetSnapshot(
  reader: WorkflowRequests,
  options: PlanetSnapshotOptions,
): Promise<PlanetSnapshot> {
  const startedAtMs = Date.now()
  const { session } = reader
  const { planetId } = options
  const home = await reader.read(() => overview(session, { planetId }))
  const buildingRequest = reader.read(() => buildings(session, { planetId }))
  const shipyardRequest = reader.read(() => shipyard(session, { planetId }))
  const productionRequest = reader.read(() => resources(session, { planetId }))
  const planetRequest = reader.read(() => planet(session, { planetId }))
  const debrisRequest = reader.read(() => findDebris(session, { planetId }))
  const buildingList = await buildingRequest
  const shipyardList = await shipyardRequest
  const production = await productionRequest
  const planetDetails = await planetRequest
  const debrisField = await debrisRequest
  const additional = await readAdditional(reader, options.additional ?? [], (request) =>
    request.read(session, { planetId }),
  )
  return {
    kind: 'planetSnapshot',
    planetId,
    startedAtMs,
    completedAtMs: Date.now(),
    overview: home,
    buildings: buildingList,
    shipyard: shipyardList,
    resources: production,
    planet: planetDetails,
    findDebris: debrisField,
    additional,
  }
}

/**
 * Account extensions run once; per-planet extensions run only for their selected bodies.
 *
 * 账号扩展只运行一次；星球扩展只在其指定的天体执行。
 */
export type AccountSnapshotOptions = SnapshotOptions & {
  additionalByPlanet?: ReadonlyMap<number, readonly PlanetSnapshotRequest[]> | undefined
  additional?: readonly SnapshotRequest[] | undefined
}

export type AccountSnapshot = {
  kind: 'accountSnapshot'
  startedAtMs: number
  completedAtMs: number
  control: SnapshotResult<Awaited<ReturnType<typeof control>>>
  notifications: SnapshotResult<Awaited<ReturnType<typeof notifications>>>
  research: SnapshotResult<Awaited<ReturnType<typeof research>>>
  planets: PlanetSnapshot[]
  additional: SnapshotPage[]
}

/**
 * Read control, notifications and research once, then each listed planet or moon. Research quotes use the requested planet.
 *
 * 总览矩阵、通知和研究各读取一次，再采集矩阵列出的行星和月球；研究报价以请求星球为准。
 *
 * @returns Independent results; planets is empty when control does not return its document.
 *
 * 各项独立结果；总览矩阵未返回目标文档时，planets 为空。
 *
 * @throws {ValidationError} When concurrency is neither null nor a positive safe integer.
 *
 * 并发数既不是 null，也不是正安全整数时抛出。
 */
export async function snapshotAccount(
  session: Session,
  options: AccountSnapshotOptions,
): Promise<AccountSnapshot> {
  const reader = new WorkflowRequests(session, options.concurrency)
  return readAccountSnapshot(reader, options)
}

async function readAccountSnapshot(
  reader: WorkflowRequests,
  options: AccountSnapshotOptions,
): Promise<AccountSnapshot> {
  const startedAtMs = Date.now()
  const { session } = reader
  const empire = await reader.read(() => control(session, { planetId: options.planetId }))
  const counterRequest = reader.read(() => notifications(session))
  const researchRequest = reader.read(() => research(session, { planetId: options.planetId }))
  const counters = await counterRequest
  const researchPage = await researchRequest
  const planets: PlanetSnapshot[] = []
  if (empire.status === 'fulfilled' && empire.value.data.kind === 'control')
    for (const entry of empire.value.data.planets) {
      const result = await readPlanetSnapshot(reader, {
        planetId: entry.id,
        concurrency: options.concurrency,
        additional: options.additionalByPlanet?.get(entry.id),
      })
      planets.push(result)
    }

  const additional = await readAdditional(reader, options.additional ?? [], (request) =>
    request.read(session),
  )

  return {
    kind: 'accountSnapshot',
    startedAtMs,
    completedAtMs: Date.now(),
    control: empire,
    notifications: counters,
    research: researchPage,
    planets,
    additional,
  }
}
