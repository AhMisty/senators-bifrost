/**
 * Endpoint path and fixed route parameters; omitted mode uses the server default show.
 *
 * 接口路径及路由固定参数；未指定 mode 时由服务端使用 show。
 */
export type PageRoute = {
  readonly path: 'game.php' | 'admin.php' | 'index.php' | 'json.php'
  readonly page?: string

  readonly mode?: string

  readonly query?: Readonly<Record<string, string>>
}

const game = (
  page: string,
  mode?: string,
  query?: Readonly<Record<string, string>>,
): PageRoute => ({
  path: 'game.php',
  page,
  ...(mode === undefined ? {} : { mode }),
  ...(query === undefined ? {} : { query }),
})

const admin = (page: string, mode?: string): PageRoute => ({
  path: 'admin.php',
  page,
  ...(mode === undefined ? {} : { mode }),
})

const publicPage = (page: string, mode?: string): PageRoute => ({
  path: 'index.php',
  page,
  ...(mode === undefined ? {} : { mode }),
})

const allianceAdmin = (action: string): PageRoute => game('alliance', 'admin', { action })

/**
 * Only index.php selects a universe through uni.
 *
 * 仅 index.php 通过 uni 选择宇宙。
 */
export function carriesUniverse(route: PageRoute): boolean {
  return route.path === 'index.php'
}

/**
 * List route-owned parameter names to remove conflicting caller fields.
 *
 * 返回路由控制的参数名，用于清除调用方冲突字段。
 */
export function ownedParameters(route: PageRoute, planetId: number | undefined): string[] {
  return [
    'page',
    'mode',
    ...Object.keys(route.query ?? {}),
    ...(planetId === undefined ? [] : ['cp']),
    ...(carriesUniverse(route) ? ['uni'] : []),
  ]
}

class GameRoutes {
  readonly achievements: PageRoute = game('achievements')
  readonly allianceApply: PageRoute = game('alliance', 'apply')
  readonly allianceCancelApply: PageRoute = game('alliance', 'cancelApply')
  readonly alliance: PageRoute = game('alliance')
  readonly allianceCircular: PageRoute = game('alliance', 'circular')
  readonly allianceClose: PageRoute = game('alliance', 'close')
  readonly allianceCreate: PageRoute = game('alliance', 'create')
  readonly allianceDevelopment: PageRoute = game('alliance', 'development')
  readonly allianceInfo: PageRoute = game('alliance', 'info')
  readonly allianceIssue: PageRoute = game('alliance', 'issue')
  readonly allianceMemberList: PageRoute = game('alliance', 'memberList')
  readonly allianceDeposit: PageRoute = game('alliance', 'put')
  readonly allianceDepositSend: PageRoute = game('alliance', 'putsend')
  readonly allianceStorage: PageRoute = game('alliance', 'storage')
  readonly allianceWithdrawal: PageRoute = game('alliance', 'vlyat')
  readonly allianceWithdrawalSend: PageRoute = game('alliance', 'vlyatsend')
  readonly allianceAdminClose: PageRoute = allianceAdmin('close')
  readonly allianceAdminDetailApply: PageRoute = allianceAdmin('detailApply')
  readonly allianceAdminDiplomacy: PageRoute = allianceAdmin('diplomacy')
  readonly allianceAdminDiplomacyAccept: PageRoute = allianceAdmin('diplomacyAccept')
  readonly allianceAdminDiplomacyCreate: PageRoute = allianceAdmin('diplomacyCreate')
  readonly allianceAdminDiplomacyCreateProcessor: PageRoute = allianceAdmin(
    'diplomacyCreateProcessor',
  )
  readonly allianceAdminDiplomacyDelete: PageRoute = allianceAdmin('diplomacyDelete')

  readonly allianceAdminIssueSend: PageRoute = allianceAdmin('issue_send')

  /**
   * The server action is spelled mangeApply.
   *
   * 服务端 action 拼写为 mangeApply。
   */
  readonly allianceAdminManageApply: PageRoute = allianceAdmin('mangeApply')
  readonly allianceAdminMembers: PageRoute = allianceAdmin('members')
  readonly allianceAdminMembersKick: PageRoute = allianceAdmin('membersKick')
  readonly allianceAdminOverview: PageRoute = allianceAdmin('overview')
  readonly allianceAdminPermissions: PageRoute = allianceAdmin('permissions')
  readonly allianceAdminPermissionsSend: PageRoute = allianceAdmin('permissionsSend')
  readonly allianceAdminRank: PageRoute = allianceAdmin('rank')
  readonly allianceAdminSendAnswerToApply: PageRoute = allianceAdmin('sendAnswerToApply')
  readonly allianceAdminTransfer: PageRoute = allianceAdmin('transfer')
  readonly arsenal: PageRoute = game('arsenal')
  readonly artifact: PageRoute = game('artifact')
  readonly auction: PageRoute = game('auction')
  readonly banList: PageRoute = game('banList')
  readonly band: PageRoute = game('band')
  readonly battleHall: PageRoute = game('battleHall')
  readonly battleSimulator: PageRoute = game('battleSimulator')
  readonly battleSimulatorSend: PageRoute = game('battleSimulator', 'send')
  readonly blueprints: PageRoute = game('blueprints')
  readonly board: PageRoute = game('board')
  readonly ancientContainerShop: PageRoute = game('bon')
  readonly claimDailyBonus: PageRoute = game('bonus')
  readonly buddyList: PageRoute = game('buddyList')
  readonly buddyListAccept: PageRoute = game('buddyList', 'accept')
  readonly buddyListDelete: PageRoute = game('buddyList', 'delete')
  readonly buddyListRequest: PageRoute = game('buddyList', 'request')
  readonly buddyListSend: PageRoute = game('buddyList', 'send')
  readonly buildings: PageRoute = game('buildings')
  readonly buyBuild: PageRoute = game('buyBuild')
  readonly buyBuildSend: PageRoute = game('buyBuild', 'send')
  readonly buyDefense: PageRoute = game('buyDefense')
  readonly buyDefenseSend: PageRoute = game('buyDefense', 'send')
  readonly buyFleet: PageRoute = game('buyFleet')
  readonly buyFleetSend: PageRoute = game('buyFleet', 'send')
  readonly buyTech: PageRoute = game('buyTech')
  readonly buyTechSend: PageRoute = game('buyTech', 'send')
  readonly chat: PageRoute = game('chat')

  /**
   * The server page is named conteiner.
   *
   * 服务端页面名为 conteiner。
   */
  readonly containers: PageRoute = game('conteiner')
  readonly containersOpen: PageRoute = game('conteiner', 'open')
  readonly control: PageRoute = game('control')
  readonly createMoon: PageRoute = game('createMoon')
  readonly createMoonBuy: PageRoute = game('createMoon', 'buy')
  readonly delivery: PageRoute = game('delivery')
  readonly deliverySend: PageRoute = game('delivery', 'delivery')
  readonly details: PageRoute = game('details')
  readonly development: PageRoute = game('development')
  readonly ethics: PageRoute = game('ethics')
  readonly fair: PageRoute = game('fair')
  readonly findDebris: PageRoute = game('findDebris')
  readonly fleetAjax: PageRoute = game('fleetAjax')
  readonly fleetDealer: PageRoute = game('fleetDealer')
  readonly fleetDealerSend: PageRoute = game('fleetDealer', 'send')
  readonly fleetMissile: PageRoute = game('fleetMissile')
  readonly fleetStep1: PageRoute = game('fleetStep1')
  readonly fleetStep1CheckTarget: PageRoute = game('fleetStep1', 'checkTarget')
  readonly fleetStep1SaveShortcuts: PageRoute = game('fleetStep1', 'saveShortcuts')
  readonly fleetStep2: PageRoute = game('fleetStep2')
  readonly fleetStep3: PageRoute = game('fleetStep3')
  readonly fleetTable: PageRoute = game('fleetTable')
  readonly fleetTableDeleteGroup: PageRoute = game('fleetTable', 'delgroop')
  readonly government: PageRoute = game('formgovernment')
  readonly galaxy: PageRoute = game('galaxy')
  readonly ideologies: PageRoute = game('ideologies')
  readonly bonusSummary: PageRoute = game('infobonus')
  readonly information: PageRoute = game('information')
  readonly informationDestroyMissiles: PageRoute = game('information', 'destroyMissiles')
  readonly informationSendFleet: PageRoute = game('information', 'sendFleet')
  readonly logout: PageRoute = game('logout')
  readonly market: PageRoute = game('market')
  readonly marketCreateLot: PageRoute = game('market', 'add')
  readonly marketCancelLot: PageRoute = game('market', 'cancel_lot')
  readonly marketBuyLot: PageRoute = game('market', 'sell')
  readonly messages: PageRoute = game('messages')
  readonly messagesAction: PageRoute = game('messages', 'action')
  readonly messagesDeleteOne: PageRoute = game('messages', 'delonemsg')
  readonly messagesInArchive: PageRoute = game('messages', 'inarchive')
  readonly messagesSend: PageRoute = game('messages', 'send')
  readonly messagesView: PageRoute = game('messages', 'view')
  readonly messagesWrite: PageRoute = game('messages', 'write')
  readonly minerals: PageRoute = game('minerals')
  readonly notes: PageRoute = game('notes')
  readonly notesDelete: PageRoute = game('notes', 'delete')
  readonly notesDetail: PageRoute = game('notes', 'detail')
  readonly notesInsert: PageRoute = game('notes', 'insert')
  readonly officer: PageRoute = game('officier')
  readonly overview: PageRoute = game('overview')
  readonly overviewDelete: PageRoute = game('overview', 'delete')
  readonly overviewRename: PageRoute = game('overview', 'rename')
  readonly party: PageRoute = game('party')
  readonly phalanx: PageRoute = game('phalanx')
  readonly planet: PageRoute = game('planet')
  readonly planetCoord: PageRoute = game('planet', 'coord')
  readonly planetDiameter: PageRoute = game('planet', 'diameter')
  readonly planetField: PageRoute = game('planet', 'field')
  readonly planetGenerateName: PageRoute = game('planet', 'GenerateName')
  readonly playerCard: PageRoute = game('playerCard')
  readonly premium: PageRoute = game('premium')
  readonly questions: PageRoute = game('questions')
  readonly questionsSingle: PageRoute = game('questions', 'single')
  readonly race: PageRoute = game('race')
  readonly battleReport: PageRoute = game('raport')
  readonly publicBattleReport: PageRoute = game('raport', 'battlehall')
  readonly records: PageRoute = game('records')
  readonly reduceFleet: PageRoute = game('reduceFleet')
  readonly reduceFleetReduce: PageRoute = game('reduceFleet', 'reduce')
  readonly reduceResources: PageRoute = game('reduceResources')
  readonly reduceResourcesReduce: PageRoute = game('reduceResources', 'reduce')
  readonly research: PageRoute = game('research')
  readonly resources: PageRoute = game('resources')
  readonly resourcesAllPlanets: PageRoute = game('resources', 'AllPlanets')
  readonly resourcesSend: PageRoute = game('resources', 'send')

  readonly scan: PageRoute = game('scan', 'Show')
  readonly search: PageRoute = game('search')
  readonly searchAutocomplete: PageRoute = game('search', 'autocomplete')
  readonly searchResult: PageRoute = game('search', 'result')
  readonly settings: PageRoute = game('settings')
  readonly settingsSend: PageRoute = game('settings', 'send')
  readonly shipyard: PageRoute = game('shipyard')
  readonly shipyardDefense: PageRoute = game('shipyard', 'defense')
  readonly statistics: PageRoute = game('statistics')
  readonly store: PageRoute = game('store')
  readonly techtree: PageRoute = game('techtree')
  readonly ticket: PageRoute = game('ticket')
  readonly ticketCreate: PageRoute = game('ticket', 'create')
  readonly ticketSend: PageRoute = game('ticket', 'send')
  readonly ticketView: PageRoute = game('ticket', 'view')
  readonly trader: PageRoute = game('trader')
  readonly traderSend: PageRoute = game('trader', 'send')
  readonly traderTrade: PageRoute = game('trader', 'trade')
}

export const GAME_ROUTES: GameRoutes = new GameRoutes()

class AdminRoutes {
  /**
   * The admin password form is served by admin.php without a page parameter.
   *
   * 管理密码表单由未指定 page 的 admin.php 返回。
   */
  readonly adminLogin: PageRoute = { path: 'admin.php' }
  readonly accountEditor: PageRoute = admin('accountEditor')
  readonly active: PageRoute = admin('active')
  readonly ban: PageRoute = admin('ban')
  readonly clearCache: PageRoute = admin('clearCache')
  readonly universeSettings: PageRoute = admin('configUni')
  readonly create: PageRoute = admin('create')
  readonly cronjob: PageRoute = admin('cronjob')
  readonly dump: PageRoute = admin('dump')
  readonly flyingFleet: PageRoute = admin('flyingFleet')
  readonly giveaway: PageRoute = admin('giveaway')
  readonly information: PageRoute = admin('information')
  readonly log: PageRoute = admin('log')
  readonly logDetail: PageRoute = admin('log', 'ShowLogDetail')
  readonly logPlanetsList: PageRoute = admin('log', 'ShowLogPlanetsList')
  readonly logPlayersList: PageRoute = admin('log', 'ShowLogPlayersList')
  readonly logPresent: PageRoute = admin('log', 'ShowLogPresent')
  readonly logSettingsList: PageRoute = admin('log', 'ShowLogSettingsList')
  readonly logout: PageRoute = admin('logout')
  readonly messageList: PageRoute = admin('messageList')
  readonly module: PageRoute = admin('module')
  readonly multiIp: PageRoute = admin('multiIP')
  readonly news: PageRoute = admin('news')
  readonly overview: PageRoute = admin('overview')
  readonly password: PageRoute = admin('password')
  readonly quickEditor: PageRoute = admin('quickEditor')
  readonly reset: PageRoute = admin('reset')
  readonly rights: PageRoute = admin('rights')
  readonly search: PageRoute = admin('search')
  readonly sendMessages: PageRoute = admin('sendMessages')
  readonly refreshStatistics: PageRoute = admin('statUpdate')
  readonly support: PageRoute = admin('support')
  readonly supportSend: PageRoute = admin('support', 'send')
  readonly supportView: PageRoute = admin('support', 'view')
  readonly universe: PageRoute = admin('universe')
}

export const ADMIN_ROUTES: AdminRoutes = new AdminRoutes()

class PublicRoutes {
  readonly banList: PageRoute = publicPage('banList')
  readonly battleHall: PageRoute = publicPage('battleHall')
  readonly board: PageRoute = publicPage('board')

  /**
   * The server page is named disclamer.
   *
   * 服务端页面名为 disclamer。
   */
  readonly disclaimer: PageRoute = publicPage('disclamer')
  readonly externalAuth: PageRoute = publicPage('externalAuth')
  readonly index: PageRoute = publicPage('index')
  readonly login: PageRoute = publicPage('login')
  readonly lostPassword: PageRoute = publicPage('lostPassword')
  readonly lostPasswordNew: PageRoute = publicPage('lostPassword', 'newPassword')
  readonly lostPasswordSend: PageRoute = publicPage('lostPassword', 'send')
  readonly news: PageRoute = publicPage('news')
  readonly register: PageRoute = publicPage('register')
  readonly registerSend: PageRoute = publicPage('register', 'send')
  readonly rules: PageRoute = publicPage('rules')
  readonly screens: PageRoute = publicPage('screens')

  /**
   * The server activation page is named vertify.
   *
   * 服务端激活页面名为 vertify。
   */
  readonly verify: PageRoute = publicPage('vertify')
  readonly verifyJson: PageRoute = publicPage('vertify', 'json')
}

export const PUBLIC_ROUTES: PublicRoutes = new PublicRoutes()

/**
 * Account notification counts and page sound flags.
 *
 * 账号通知计数及页面声音开关。
 */
export const JSON_ROUTE: PageRoute = { path: 'json.php' }

/**
 * Purchase-control behavior for each growth module.
 *
 * 各成长模块购买控件的行为。
 */
export const GROWTH_MODULES = {
  officer: { kind: 'level' },
  premium: { kind: 'timed' },
  blueprints: { kind: 'timed' },
  artifact: { kind: 'timed' },
  development: { kind: 'timed' },
  details: { kind: 'level' },
  minerals: { kind: 'consumable' },
  ancientContainerShop: { kind: 'cooldown' },
  auction: { kind: 'cooldown' },
  fair: { kind: 'cooldown' },
  band: { kind: 'level' },
  race: { kind: 'choice' },
  ethics: { kind: 'choice' },
  government: { kind: 'choice' },
  party: { kind: 'timed' },
  ideologies: { kind: 'level' },
} as const

export const SEARCH_TYPES = {
  playerName: 'playername',
  planetName: 'planetname',
  allianceName: 'allyname',
  allianceTag: 'allytag',
} as const

export type SearchType = keyof typeof SEARCH_TYPES
