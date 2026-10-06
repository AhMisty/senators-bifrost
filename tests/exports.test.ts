import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  Ack as AdminAck,
  Coordinate as AdminCoordinate,
  HttpResponse as AdminResponse,
  Observed as AdminObserved,
  EndpointOptions as AdminOptions,
  PageRoute as AdminRoute,
  PageScope as AdminScope,
  StaticValue as AdminStatic,
  AdminPlanetEditorKey,
  AdminPlayerEditorKey,
  AdminRightKey,
  AdminUniverseSettingKey,
} from '../src/admin.ts'
import * as admin from '../src/admin.ts'
import * as game from '../src/game.ts'
import type * as sdk from '../src/index.ts'
import type {
  DirectShop,
  ElementInput,
  GrowthModule,
  FleetSpeed,
  PlanetReference,
  PlanetStockId,
  ProducerElementId,
  ProductionStep,
  ResourceId,
  Session,
  SupplyResourceId,
} from '../src/index.ts'
import type {
  Ack as PublicAck,
  FormOption as PublicFormOption,
  PageReply as PublicReply,
  PageRoute as PublicRoute,
  RequestParameters as PublicParameters,
  StaticValue as PublicStatic,
} from '../src/public.ts'
import * as publicPages from '../src/public.ts'
import type { Coordinate as RuleCoordinate, SupplyBalance } from '../src/rules.ts'
import * as rules from '../src/rules.ts'
import { BASE_URL } from './helpers.ts'

void test('entry points expose only their current-server responsibility', () => {
  assert.equal(typeof game.Session, 'function')
  assert.equal(typeof game.buildings, 'function')
  assert.equal('adminLogin' in game, false)
  assert.equal('publicRegisterSend' in game, false)
  assert.equal('ADMIN_ROUTES' in game, false)
  assert.equal('PUBLIC_ROUTES' in game, false)
  assert.equal('GAME_ROUTES' in admin, false)
  assert.equal('PUBLIC_ROUTES' in admin, false)
  assert.equal('GAME_ROUTES' in publicPages, false)
  assert.equal('ADMIN_ROUTES' in publicPages, false)
  assert.equal(game.GAME_ROUTES.overview.path, 'game.php')
  assert.equal(admin.ADMIN_ROUTES.overview.path, 'admin.php')
  assert.equal(publicPages.PUBLIC_ROUTES.login.path, 'index.php')
  assert.equal(typeof admin.adminLogin, 'function')
  assert.equal(typeof publicPages.publicRegisterSend, 'function')
  assert.equal(typeof rules.calculateFleetFuel, 'function')
  assert.equal('Session' in rules, false)
})

void test('every entry carries the readers and errors it answers with', () => {
  for (const [name, entry] of [
    ['game', game],
    ['admin', admin],
    ['public', publicPages],
  ] as const) {
    assert.equal(typeof entry.OperationError, 'function', name)
    assert.equal(typeof entry.ValidationError, 'function', name)
    assert.equal(typeof entry.ErrorCode, 'object', name)
    assert.equal(typeof entry.parsePage, 'function', name)
    assert.equal(typeof entry.readReply, 'function', name)
    assert.equal(typeof entry.readAck, 'function', name)
    assert.equal(typeof entry.Client, 'function', name)
    assert.equal(typeof entry.ScriptData, 'function', name)
  }
})

void test('the names a sub-entry is written in are the ones it carries', () => {
  const response: AdminResponse = {
    url: new URL(`${BASE_URL}admin.php`),
    status: 200,
    headers: new Headers(),
    body: '',
    observedAtMs: 1,
  }
  const answered: AdminObserved<AdminAck> = { data: { kind: 'empty' }, response }
  const options: AdminOptions = { query: { filter: 1 } }
  const scope: AdminScope = {}
  const coordinate: AdminCoordinate = { galaxy: 1, system: 2, planet: 3 }
  const refused: PublicAck = { kind: 'message', message: 'Wrong password' }
  const replied: PublicReply<{ kind: 'empty' }> = { kind: 'empty' }
  const parameters: PublicParameters = { page: 'login' }
  const option: PublicFormOption = { value: '1', label: 'One' }
  const supply: SupplyBalance = { total: 2, consumption: 1 }
  const ruleCoordinate: RuleCoordinate = coordinate

  const route: AdminRoute = { path: 'admin.php', page: 'overview' }
  const adminStatic: AdminStatic = { kind: 'json' }
  const publicRoute: PublicRoute = { path: 'index.php' }
  const publicStatic: PublicStatic = ['one', 'two', null]
  assert.deepEqual(
    [
      answered.data,
      options,
      scope,
      refused,
      replied,
      parameters,
      option,
      supply,
      ruleCoordinate,
      route,
      adminStatic,
      publicRoute,
      publicStatic,
      typeof publicPages.publicLogin,
    ],
    [
      { kind: 'empty' },
      { query: { filter: 1 } },
      {},
      { kind: 'message', message: 'Wrong password' },
      { kind: 'empty' },
      { page: 'login' },
      { value: '1', label: 'One' },
      { total: 2, consumption: 1 },
      coordinate,
      { path: 'admin.php', page: 'overview' },
      { kind: 'json' },
      { path: 'index.php' },
      ['one', 'two', null],
      'function',
    ],
  )
})

void test('the admin entry exposes the field types used by its editing operations', () => {
  const fields: [
    AdminPlanetEditorKey,
    AdminPlayerEditorKey,
    AdminRightKey,
    AdminUniverseSettingKey,
  ] = ['metal_mine', 'spy_tech', 'ShowBanPage.class', 'game_name']
  assert.deepEqual(fields, ['metal_mine', 'spy_tech', 'ShowBanPage.class', 'game_name'])
})

/**
 * Verify public input and response contracts at compile time alongside entry-point behavior.
 *
 * 将公开输入与返回值的编译期契约同入口行为一起验证。
 */
type API = typeof sdk
type Options<K extends keyof API> = API[K] extends (...args: never[]) => unknown
  ? Parameters<API[K]>[1]
  : never

type PlanetMethod =
  | GrowthModule
  | `${Exclude<GrowthModule, 'ancientContainerShop'>}Upgrade`
  | 'ancientContainerUpgrade'
  | DirectShop
  | `${DirectShop}Send`
  | 'achievements'
  | 'battleSimulator'
  | 'buildings'
  | 'buildingsUpgrade'
  | 'buildingsCancel'
  | 'buildingsRemove'
  | 'buildingsDowngrade'
  | 'buildingsFinish'
  | 'containers'
  | 'containersOpen'
  | 'control'
  | 'createMoon'
  | 'createMoonBuy'
  | 'claimDailyBonus'
  | 'delivery'
  | 'findDebris'
  | 'fleetDealer'
  | 'fleetDealerSend'
  | 'fleetTable'
  | 'information'
  | 'informationDestroyMissiles'
  | 'market'
  | 'marketCreateLot'
  | 'marketBuyLot'
  | 'marketCancelLot'
  | 'overview'
  | 'overviewRename'
  | 'overviewDelete'
  | 'planet'
  | 'planetField'
  | 'planetDiameter'
  | 'records'
  | 'reduceFleet'
  | 'reduceResources'
  | 'research'
  | 'researchUpgrade'
  | 'researchCancel'
  | 'researchRemove'
  | 'researchFinish'
  | 'resources'
  | 'resourcesSend'
  | 'resourcesAllPlanets'
  | 'settingsVacation'
  | 'shipyard'
  | 'shipyardDefense'
  | 'shipyardProduce'
  | 'shipyardCancel'
  | 'techtree'
  | 'trader'
  | 'traderTrade'
  | 'traderSend'
  | 'depositAllianceResources'
  | 'withdrawAllianceResources'
  | 'allianceDeposit'
  | 'allianceWithdrawal'
  | 'snapshotPlanet'
  | 'snapshotAccount'

type OriginMethod =
  | 'dispatchFleet'
  | 'fleetStep1'
  | 'fleetStep1CheckTarget'
  | 'fleetStep2'
  | 'fleetStep3'
  | 'fleetAjax'
  | 'fleetMissile'
  | 'galaxy'
  | 'phalanx'
  | 'planetCoord'
  | 'informationSendFleet'
  | 'deliverySend'
  | 'reduceFleetGather'
  | 'reduceResourcesGather'

type RequiredPlanets = {
  [K in PlanetMethod]: Options<K> extends PlanetReference ? true : false
}[PlanetMethod]
type RequiredOrigins = {
  [K in OriginMethod]: Options<K> extends { origin: PlanetReference } ? true : false
}[OriginMethod]
type EndpointMethod = Exclude<
  Extract<keyof API, `admin${string}` | `public${string}`>,
  'publicBattleReport'
>
type EndpointScopes = {
  [K in EndpointMethod]: Options<K> extends undefined
    ? true
    : 'planetId' extends keyof NonNullable<Options<K>>
      ? false
      : true
}[EndpointMethod]

type Assert<T extends true> = T
type SettingsMethod =
  | 'settingsSend'
  | 'settingsVacation'
  | 'settingsEmail'
  | 'settingsPassword'
  | 'settingsUsername'
type RequiredDeletionChoice = {
  [K in SettingsMethod]: Options<K> extends { accountDeletionEnabled: boolean } ? true : false
}[SettingsMethod]
export type Deletion = Assert<RequiredDeletionChoice>
type WorkflowMethod =
  | 'dispatchFleet'
  | 'sendMessage'
  | 'sendBuddyRequest'
  | 'snapshotPlanet'
  | 'snapshotAccount'
type RequiredConcurrency = {
  [K in 'snapshotPlanet' | 'snapshotAccount']: Options<K> extends { concurrency: number | null }
    ? true
    : false
}['snapshotPlanet' | 'snapshotAccount']
export type Concurrency = Assert<RequiredConcurrency>
export type SequentialOptions = Assert<
  Extract<
    | keyof Options<'dispatchFleet'>
    | keyof Options<'sendMessage'>
    | keyof Options<'sendBuddyRequest'>,
    'concurrency'
  > extends never
    ? true
    : false
>
export type Planets = Assert<RequiredPlanets>
export type Origins = Assert<RequiredOrigins>
export type Endpoints = Assert<EndpointScopes>

type BusinessMethod = {
  [K in keyof API]: API[K] extends (...args: never[]) => unknown
    ? Parameters<API[K]>[0] extends Session
      ? K
      : never
    : never
}[keyof API]
type RawMethod =
  | 'get'
  | 'post'
  | 'routeRequest'
  | 'routeResponse'
  | 'routePage'
  | 'routeAck'
  | 'ackOf'
  | 'readAck'
  | 'readReply'
  | 'buyElement'
  | 'upgradeGrowth'
type FixedBusinessParameters = {
  [K in Exclude<BusinessMethod, RawMethod>]: Extract<
    keyof NonNullable<Options<K>>,
    'query' | 'body' | 'withCookie'
  > extends never
    ? true
    : false
}[Exclude<BusinessMethod, RawMethod>]
export type Fixed = Assert<FixedBusinessParameters>
export type Producers = Assert<9999 extends ProducerElementId ? false : true>
export type Speed = Assert<Options<'fleetStep2'>['speed'] extends FleetSpeed ? true : false>
export type DispatchSpeed = Assert<
  Options<'dispatchFleet'>['speed'] extends FleetSpeed ? true : false
>
export type GatherSpeed = Assert<
  Options<'reduceFleetGather'>['speed'] extends FleetSpeed ? true : false
>
export type Trade = Assert<
  Options<'traderTrade'>['resourceId'] extends PlanetStockId ? true : false
>
export type Production = Assert<
  Options<'resourcesSend'>['steps'] extends ElementInput<ProducerElementId, ProductionStep>
    ? true
    : false
>
export type BroadProductionRecord = Assert<
  Record<number, number> extends Options<'resourcesSend'>['steps'] ? false : true
>
export type InvalidChoices = Assert<
  11 extends ProductionStep
    ? false
    : 0 extends FleetSpeed
      ? false
      : 999 extends ResourceId
        ? false
        : 901 extends SupplyResourceId
          ? false
          : number extends FleetSpeed
            ? false
            : true
>

type UnreportedPlanetMethod =
  | 'information'
  | 'informationSendFleet'
  | 'informationDestroyMissiles'
  | 'fleetAjax'
  | 'fleetStep1CheckTarget'
  | 'phalanx'
  | 'overviewRename'
  | 'overviewDelete'
  | 'resourcesSend'

type PlanetReplyMethods = Exclude<
  {
    [K in BusinessMethod]: Options<K> extends PlanetReference | { origin: PlanetReference }
      ? K
      : never
  }[BusinessMethod],
  WorkflowMethod | UnreportedPlanetMethod
>
type PlanetReplyFields = {
  [K in PlanetReplyMethods]: Awaited<ReturnType<API[K]>> extends { data: infer Data }
    ? Data extends { planetId: number | null }
      ? true
      : false
    : false
}[PlanetReplyMethods]
export type PlanetReplies = Assert<PlanetReplyFields>

type WithoutPlanetInput = {
  [
    K in Exclude<BusinessMethod, RawMethod | PlanetMethod | OriginMethod>
  ]: Options<K> extends undefined
    ? true
    : 'planetId' extends keyof NonNullable<Options<K>>
      ? false
      : 'origin' extends keyof NonNullable<Options<K>>
        ? false
        : true
}[Exclude<BusinessMethod, RawMethod | PlanetMethod | OriginMethod>]
export type UnrelatedInputs = Assert<WithoutPlanetInput>

type WithoutPlanetOutput = {
  [K in Exclude<BusinessMethod, RawMethod | PlanetReplyMethods | WorkflowMethod>]: Awaited<
    ReturnType<API[K]>
  > extends { data: infer Data }
    ? Data extends unknown
      ? 'planetId' extends keyof Data
        ? false
        : true
      : never
    : true
}[Exclude<BusinessMethod, RawMethod | PlanetReplyMethods | WorkflowMethod>]
export type UnrelatedOutputs = Assert<WithoutPlanetOutput>

export type BusinessMethodsExist = Assert<BusinessMethod extends never ? false : true>

export type PreferencesRequireAccountForm = Assert<
  sdk.VacationSettingsPage extends Options<'settingsSend'>['form'] ? false : true
>
export type AccountChangesRequireAccountForm = Assert<
  {
    [
      K in 'settingsEmail' | 'settingsPassword' | 'settingsUsername'
    ]: sdk.VacationSettingsPage extends Options<K>['form'] ? false : true
  }['settingsEmail' | 'settingsPassword' | 'settingsUsername']
>
export type VacationAndDeletionAcceptEitherForm = Assert<
  {
    [
      K in 'settingsVacation' | 'settingsAccountDeletion'
    ]: sdk.SettingsPage extends Options<K>['form'] ? true : false
  }['settingsVacation' | 'settingsAccountDeletion']
>
export type PreferencesRequireCompleteValues = Assert<
  Omit<sdk.AccountSettingsPage, 'probeCount'> extends Options<'settingsSend'>['form'] ? false : true
>
export type AllianceSettingsRequireCompleteValues = Assert<
  Omit<
    sdk.AllianceAdminOverviewPage,
    'ownerRankName'
  > extends Options<'updateAllianceSettings'>['form']
    ? false
    : true
>

export type AccountEditNeedsTarget = Assert<
  { section: 'buildings'; values: {}; submit: 'add' } extends Options<'adminAccountEditorSubmit'>
    ? false
    : true
>
export type QuantityEditNeedsAction = Assert<
  { section: 'buildings'; values: { id: number } } extends Options<'adminAccountEditorSubmit'>
    ? false
    : true
>
export type FieldEditHasNoQuantityAction = Assert<
  {
    section: 'personal'
    values: { id: number; vacation: 'no' }
    submit: 'add'
  } extends Options<'adminAccountEditorSubmit'>
    ? false
    : true
>
export type GiveawayNeedsFilters = Assert<
  { elements: ElementInput } extends Options<'adminGiveawayAward'> ? false : true
>
