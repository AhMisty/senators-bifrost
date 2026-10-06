<div align="center">
  <h1>Bifrost</h1>
  <img src="https://raw.githubusercontent.com/AhMisty/senators-bifrost/main/assets/logo.svg" alt="Bifrost" width="30%" />

[![npm version](https://img.shields.io/npm/v/@senators/bifrost.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://github.com/AhMisty/senators-bifrost/blob/main/LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/@senators/bifrost.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost)

[English](https://github.com/AhMisty/senators-bifrost/blob/main/README.md) | <span style="color: #999">中文</span>
</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/AhMisty/senators-bifrost/main/assets/editor-demo.svg" alt="展示首个请求及代码补全的 TypeScript 编辑器动画" width="1200" />
</p>

## ✨ 按协议本身工作

Bifrost 是 New-Star 服务端 HTTP 协议的 ESM 与 TypeScript 客户端，提供 `game.php`、`admin.php`、`index.php`、`json.php` 可访问的页面和操作，也支持玩家横幅、战报重定向和浏览器定时任务脚本。

- **按页面返回。** 页面调用解析端点实际渲染的文档，将解析数据与原始 HTTP 响应一并返回。
- **明确区分结果。** 明确失败抛出携带响应的 `ServerError`；无法判定的消息保留为回执，文档无法解析时抛出解析错误。
- **直接请求与可选工作流。** 单页函数对应一次业务请求；组合辅助方法处理多步流程，并暴露每一步的结果。
- **调用方控制传输。** 可注入 `fetch` 管理超时、取消、代理和响应大小。自动认证由调用方开启，本库不启动后台任务。

## ⚡ 发起第一个查询

用 `npm install @senators/bifrost` 安装；本库运行时需要 Node.js 26 或更高版本。`baseUrl` 应指向游戏安装目录并以 `/` 结尾——不以目录结尾的基址会被拒绝。

```ts
import { Session, buildings } from '@senators/bifrost/game'

const session = new Session({
  baseUrl: 'https://your-server.example/game/',
  universe: 1,
  username: 'pilot',
  password: 'secret',
})

const login = await session.login()
if (login.data.kind !== 'login') throw new Error('Login was not confirmed')

const result = await buildings(session, { planetId: 101 })
if (result.data.kind === 'buildings') {
  console.log(result.data.levels.get(1), result.data.fields.free)
} else {
  console.log(result.data)
}
```

| `Session` 选项                        | 含义                                                   |
| ------------------------------------- | ------------------------------------------------------ |
| `baseUrl`                             | 请求地址所基于的安装目录。                             |
| `universe`                            | 默认登录宇宙，在公开脚本中以 `uni` 发送。              |
| `username?`、`password?`、`language?` | `login` 的默认值；凭据仅保存在内存中。                 |
| `autoLogin?`                          | 默认 `false`；`true` 要求构造时提供用户名和密码。      |
| `sessionToken?`                       | 已登录时持有的 `2Moons` Cookie。                       |
| `fetch?`                              | 自定义传输函数；以无接收者方式调用，并手动处理重定向。 |
| `forwardedIp?`                        | 发往当前安装目录的 `X-Forwarded-For` 值。              |

`Session.login` 与 `publicLogin` 可覆盖用户名、密码、语言和宇宙。TypeScript 要求提供构造时缺少的凭据。

响应设置会话 Cookie 并重定向到本安装目录的 `game.php` 时，登录才确认成功。`publicVerify`、`publicExternalAuth` 采用相同规则。

设置 `autoLogin: true` 后，缺少 token 的认证请求会先登录；同一安装目录返回 `index.php?code=3` 时，使用已配置凭据登录并重试本次请求一次。

并发请求共享在途登录，或复用已经更新的会话。网络、HTTP 和其他业务错误不会触发自动登录。

构造函数不发送请求。`sessionToken` 可直接替换，不会改动登录凭据。调用方负责协调 token、账号、宇宙及进行中的操作。

工作流不会自动重建会话状态；依赖前序令牌的步骤在重登后可能被服务端拒绝。注销成功后清空 token；后续请求是否自动登录由 `autoLogin` 决定。

### TLS 证书

Bifrost 默认使用 Node.js `fetch`，不提供 `rejectUnauthorized` 或 `ignoreSSL` 选项。受信任测试服务器的证书无效时，可在应用入口、首次 HTTPS 请求前设置：

```ts
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
```

这会改变整个 Node.js 进程的 TLS 校验策略，影响使用 Node.js 默认设置的其他会话和 HTTPS 客户端。仅在受信任测试环境中临时使用，不应写入共享库内部。

常规使用应配置有效的服务端证书。私有 CA 可在启动 Node.js 前将 `NODE_EXTRA_CA_CERTS` 设为其 PEM 文件路径；启动后通过 `process.env` 赋值无效。详见 [Node.js TLS 环境变量](https://nodejs.org/download/release/v26.7.0/docs/api/cli.html#node_tls_reject_unauthorizedvalue)。

### New-Star 计算函数

[src/rules](https://github.com/AhMisty/senators-bifrost/tree/main/src/rules) 中的纯函数直接执行 New-Star 公式，不发送请求，也不校验业务输入。`calculateProducerFlow` 实现默认元素生产公式，由 `ProducerElementId` 在编译期限定支持的生产者。

| 领域     | 函数                                                                                |
| -------- | ----------------------------------------------------------------------------------- |
| 造价     | `calculateLevelPrice`                                                               |
| 建造时间 | `calculateConstructionSeconds`                                                      |
| 生产     | `calculateProducerFlow`、`calculatePlanetProduction`、`calculateResourceProduction` |
| 产能平衡 | `calculateSupplyBalance`                                                            |
| 舰船     | `calculateShipSpeed`、`calculateShipConsumption`                                    |
| 航行     | `calculateFleetDistance`、`calculateFleetDuration`、`calculateFleetFuel`            |
| 导弹     | `calculateMissileDuration`                                                          |

调用方提供宇宙配置、基础价和账号汇总加成。`calculatePlanetProduction` 必须提供当前库存 `stocks` 和配置中的产能限制资源 `productionSupplyId`；`basicIncome` 应对应所计算的天体。

服务端报价可从 `buildings`、`research` 返回的 `quotes` 字段读取。`fleetStep1` 的 `ships`、`flightPreview` 描述可用舰船与航行参数；`fleetStep2.fuel` 提供目标设置完成后的耗油报价。

规则函数不会自动读取管理端配置，也不推断账号加成。应在所需输入明确时计算对应场景。

`calculatePlanetProduction` 对应服务端重建生产缓存时的公式。与页面对账前应提交生产设置以刷新缓存；缓存的小时产量不一定随库存或配置变化重新计算。

`producers` 按服务端目录顺序提供，包含零级设施。

计算函数使用 `SupplyBalance`（`total`、`consumption`），与服务端一样独立保留总供给和消耗。页面观测使用 `ResourceSupply`（`total`、`available`）；缩写后的显示值不能通过相减还原精确消耗。

## 🧩 页面、操作与选项

根入口导出本库支持的全部 API；普通游戏页面与工作流从 `/game` 导入，纯计算从 `/rules` 导入，登录注册页面从 `/public` 导入，管理端从 `/admin` 导入。

客户端名称表达业务含义；[src/protocol/routes.ts](https://github.com/AhMisty/senators-bifrost/blob/main/src/protocol/routes.ts) 映射服务端的 `page`、`mode` 和固定查询字段。`buildings` 等函数解析文档，`buildingsUpgrade` 等操作发送对应表单字段并返回服务端应答。

业务方法只接收固定的具名参数，并且只构造对应的服务端字段。管理端的编辑字段按当前服务端限定，公开页通过 `language` 选择语言。`Session.request`、`get/post` 和协议路由入口保留通用 URL 与载荷能力；其中 `PageOptions` 仅属于低层请求。

有限选项使用共享字面量类型：`FleetSpeed` 为 1～10，`ProductionStep` 为 0～10，资源与生产元素 ID 也限定为支持的集合。读取器在外部数据进入时将其解码为这些类型。按数字 ID 索引的元素选择统一使用 `ReadonlyMap`，具名选项保持普通对象。生产和交易提交仅构造声明字段。

数量、坐标、倍率和数据库实体 ID 等开放数值由调用方保证有限且符合操作语义，各业务方法不重复做运行时数值校验。快照并发预算由调度器检查一次；响应结构与服务端选择的起点通过已有响应判断。

依赖星球的方法必传 `planetId` 或 `origin.planetId`，并编码为 `cp`；这也包括 `settingsVacation` 等依赖当前星球的账号操作。不依赖星球的方法省略该上下文。

定向操作用 `target` 或 `targets` 指定目标；集结操作由 `targets` 指定的星球向请求星球发送。天体类型 1、2、3 分别表示星球、残骸、月球。

当 `cp` 不是账号拥有的星球时，New-Star 会沿用当前星球。星球页面结果包含实际观察到的 `planetId`，此类方法的回执未提供星球信息时为 `null`。固定 JSON 和弹窗结果省略该字段，包括跃迁和拆除导弹。

`parseContext(parsePage(result.response))` 和 `inspection` 从已有响应读取当前星球与页头数据。`dispatchFleet` 在继续操作前检查草稿和目标确认文档中的起点。这些检查不增加请求。

### 🏗️ 建造与生产

| 范围     | 读取与操作                                                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 建筑     | `buildings`、`buildingsUpgrade`、`buildingsCancel`、`buildingsRemove`、`buildingsDowngrade`、`buildingsFinish`                                                                                                |
| 研究     | `research`、`researchUpgrade`、`researchCancel`、`researchRemove`、`researchFinish`                                                                                                                           |
| 船坞     | `shipyard`、`shipyardDefense`、`shipyardProduce`、`shipyardCancel`                                                                                                                                            |
| 直接购买 | `buyBuild` / `buyBuildSend`、`buyDefense` / `buyDefenseSend`、`buyFleet` / `buyFleetSend`、`buyTech` / `buyTechSend`                                                                                          |
| 经济     | `resources`、`resourcesSend`、`resourcesAllPlanets`、`market`、`marketCreateLot`、`marketBuyLot`、`marketCancelLot`、`trader`、`traderTrade`、`traderSend`                                                    |
| 后勤     | `delivery` / `deliverySend`、`reduceFleet` / `reduceFleetGather`、`reduceResources` / `reduceResourcesGather`、`containers` / `containersOpen`                                                                |
| 成长目录 | `officer`、`government`、`ancientContainerShop`、`premium`、`blueprints`、`artifact`、`development`、`details`、`minerals`、`auction`、`fair`、`band`、`race`、`ethics`、`party`、`ideologies` 及各自购买函数 |

成长目录文档使用 `officer`、`government` 等客户端名称作为 `kind`；`controlKind` 表示升级等级、延长时间、消耗数量、等待冷却或选择一项。价格可能取决于请求所指的星球。

`resourcesAllPlanets` 将账号各星球的生产档位设为开启时的 10 或关闭时的 0。

### 🚀 舰队与导航

| 范围       | 函数                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 派遣       | `fleetStep1`、`fleetStep1CheckTarget`、`fleetStep2`、`fleetStep3`、`fleetAjax`                                                |
| 草稿工具   | `fleetStep1SaveShortcuts`、`fleetStep1DeleteShortcuts`、`fleetStep1` 的 `presetName`                                          |
| 飞行舰队   | `fleetTable`、`fleetTableRecall`、`fleetTableOpenACS`、`fleetTableRenameACS`、`fleetTableInviteACS`、`fleetTableDeletePreset` |
| 导航       | `galaxy`、`phalanx`、`fleetMissile`、`findDebris`                                                                             |
| 战报与模拟 | `battleHall`、`battleReport`、`publicBattleReport`、`battleSimulator`、`battleSimulatorSend`                                  |

派遣的三个步骤操作同一份服务端草稿：第一步签发令牌，第二步设置目标，第三步消耗令牌，即使任务被拒绝也是如此。速度取第一步 `speedOptions` 的值，其中 10 表示 100% 速度。调用方可以逐步操作：

```ts
import { FleetMission, fleetStep1, fleetStep2, fleetStep3 } from '@senators/bifrost'

const draft = await fleetStep1(session, { origin: { planetId: 101 }, ships: new Map([[202, 10]]) })
if (draft.data.kind !== 'fleetStep1') throw new Error('No draft')

const prepared = await fleetStep2(session, {
  origin: { planetId: 101 },
  token: draft.data.token,
  target: { galaxy: 1, system: 2, planet: 3, type: 1 },
  speed: 10,
})
if (prepared.data.kind !== 'fleetStep2') throw new Error('Destination refused')

const sent = await fleetStep3(session, {
  origin: { planetId: 101 },
  token: prepared.data.token,
  mission: FleetMission.Transport,
  cargo: { metal: 1000 },
})
console.log(sent.data)
```

`galaxy` 浏览其他星系可能扣除氘，`phalanx` 扫描也会收费。因此这些 `GET` 请求有实际成本。

### 🌍 星球、账号与宇宙

| 范围       | 函数                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| 星球状态   | `overview`、`planet`、`control`                                                                                           |
| 星球操作   | `overviewRename`、`overviewDelete`、`planetCoord`、`planetField`、`planetDiameter`、`planetGenerateName`、`createMoonBuy` |
| 账号页面   | `settings`、`achievements`、`bonusSummary`、`records`、`statistics`、`techtree`、`arsenal`、`store`                       |
| 每日奖励   | `claimDailyBonus` 发起领取并读取奖励回执                                                                                  |
| 搜索与信息 | `search`、`searchResult`、`searchAutocomplete`、`information`、`playerCard`、`questions`                                  |
| 轮询       | `notifications`（`json.php`）、`scan`（`game.php` 纯文本）                                                                |

`shipyard` 和 `shipyardDefense` 的 `quotes` 提供成本、单件时长和最大可造数量。

`overview` 解析星球详情、建造卡片和舰队事件；`control` 读取账号的星球与月球矩阵。每次观测保留各自响应的时间。

`settings` 返回以 `onVacation` 区分的文档。偏好、邮箱、密码与用户名修改需要普通账号文档；休假和账号删除操作接受任一状态。

修改会保留文档中的其他偏好。每次提交都明确选择 `accountDeletionEnabled`：`true` 从本次提交时刻开始计算删除期限，`false` 取消删除。`settingsAccountDeletion` 通过 `enabled` 提供相同选择。New-Star 在渲染导航时覆盖删除时间戳，因此 `accountDeletionChecked` 不能确认实际存储的删除计划。

修改用户名或密码会结束当前游戏会话，之后需用更新后的凭证调用 `login`。

### 🤝 联盟、社交与消息

| 范围         | 函数                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 联盟         | `alliance`、`allianceInfo`、`allianceMemberList`、`allianceStorage`、`allianceDeposit`、`allianceWithdrawal` 及联盟管理函数                                         |
| 联盟操作     | `createAlliance`、`submitAllianceApplication`、`depositAllianceResources`、`withdrawAllianceResources`、`distributeAllianceResources`、`transferAllianceLeadership` |
| 消息         | `messages`、`messagesView`、`messagesWrite`、`messagesSend`、`messagesAction`                                                                                       |
| 联系人与支持 | `buddyList`、`buddyListRequest`、`buddyListSend`、`buddyListAccept`、`buddyListDelete`、`ticket`、`ticketCreate`、`ticketView`、`ticketSend`、`chat`                |

`messagesWrite` 先在服务端为收件人建立发信令牌，然后才能调用 `messagesSend`。`sendMessage` 组合这两步，并将同一 `Session` 上的调用串行执行，避免相互覆盖令牌。

`messagesView` 将返回的收件消息标为已读。`messagesAction` 的 `deleteunmarked` 会删除全部未选中的收件消息，包含归档消息；`category` 只控制返回页面。

`updateAllianceSettings` 在 `allianceAdminOverview` 返回的完整文档上应用补丁。`textKind` 选择编辑的文本区域，`eventMissions` 替换所选任务列表，其余设置保持不变。

### 🛠️ 管理与公开页面

`adminLogin` 在游戏会话内建立后台访问权限。`admin*` 函数覆盖宇宙配置、权限、账号编辑、支持、定时任务及其他管理页面。

`public*` 函数覆盖 `index.php` 的注册、找回密码、验证、新闻、规则、封禁名单及战斗大厅。`publicBattleReport` 解码 `game.php` 渲染的已发布战报，需要有效游戏会话。

`publicLogin`、`publicVerify`、`publicVerifyJson`、`publicExternalAuth` 均不发送已有 Cookie。`publicVerifyJson` 仅激活账号并返回 JSON；另外三个入口可确认并接管新 token。

`playerBanner` 返回图片字节，`combatReport` 返回 `CombatReport.php` 的重定向，`requestCronjob` 请求浏览器定时任务脚本。仅凭透明 GIF 响应不能确认任务已执行。

`adminUniverseSettingsSave` 在完整 `form` 上应用 `patch`；`form.settings[key]` 包含值和分组。

快捷编辑记录通过 `values` 提供默认玩家、星球或月球模型的完整字段，`adminQuickEditorSave` 使用记录自身的编辑器和 ID。天体编辑会由服务端对数值取整，并清零不适用的建筑。

保存玩家时必须显式指定 `multi` 和 `authorizationAttack`，因为服务端会重写这些标记，即使页面未显示控件。可选 `password` 用于修改密码。

`adminRefreshStatistics` 会重建整个安装实例中所有宇宙的统计数据。

`adminAccountEditorSubmit` 编辑个人资料时必须显式指定 `vacation`，编辑联盟时必须指定 `changeleader`，因为服务端每次提交都会重写这些值。开启休假还需提供天、时、分、秒。

`adminSendMessagesSend` 向当前宇宙广播，可按语言筛选；`channel` 选择游戏消息（`0`）、邮件（`1`）或两者（`2`）。

## 🧭 组合流程与快照

组合流程调用页面函数并保留每一步的响应。操作流程外抛错误，快照逐项保留错误；两者均适用 Session 的认证策略。

| 辅助方法           | 请求与停止位置                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `dispatchFleet`    | 建立草稿、设置目标并提交。`stage` 表示到达的最后一步；应检查 `dispatch.data` 判断最终提交结果。                        |
| `sendMessage`      | 打开写信页以建立服务端令牌，再向表单返回的收件人发送。未得到写信页时停在 `stage: 'compose'`。                          |
| `sendBuddyRequest` | 读取申请弹窗，再向弹窗返回的玩家提交申请。未得到弹窗时停在 `stage: 'request'`。                                        |
| `snapshotPlanet`   | 读取概况、建筑、造船、资源、星球与残骸搜索六个核心页面；`additional` 显式选择扩展读取。                                |
| `snapshotAccount`  | 读取帝国矩阵、通知和研究，再按矩阵顺序读取各星球、月球；`additional` 选择账号扩展，`additionalByPlanet` 选择星球扩展。 |

```ts
import { sendMessage } from '@senators/bifrost'

const result = await sendMessage(session, { recipientId: 4242, text: 'Hello' })

if (result.stage === 'send') console.log(result.send.data)
else console.log(result.compose.data)
```

仅快照要求 `concurrency`：`1` 串行，更大的安全整数限制在途请求数，`null` 不设上限。预算作用于一次快照；舰队、消息和好友流程按协议顺序执行，无并发参数。

快照逐项保留结果：`fulfilled` 携带 `Observed` 值，`rejected` 携带错误，`skipped` 表示请求尚未执行。`fulfilled` 仍需检查 `value.data` 判断回执含义。

普通单项失败不丢弃其他观测；重定向到登录入口的认证错误会停止排队请求，并保留在途结果。

账号核心页面各读取一次。研究等级和队列属于账号，报价以快照指定的 `planetId` 为参照；其他星球的研究报价可通过 `additionalByPlanet` 选择。`control` 未返回目标文档时，`planets` 为空。

星球按顺序处理。快照不是原子操作：每个响应的 `observedAtMs` 分别记录正文读取完成时的本地 Unix 毫秒时间戳。默认快照不领取每日奖励，也不请求星系浏览或月球扫描。

`additional` 中的每项包含 `name` 和 `read`，回调调用页面读取方法并提供业务参数；星球扩展回调还接收 `{ planetId }`。每项占用一个并发名额，因此回调应执行一次独立读取。

扩展统一返回 `SnapshotPage`，其编译期类型仅公开 `data.kind`。需要其他扩展字段时，可检查或解码保留的 `response`。

```ts
import { allianceApply, snapshotAccount } from '@senators/bifrost'

const snapshot = await snapshotAccount(session, {
  concurrency: 6,
  planetId: 101,

  additional: [
    {
      name: 'alliance-application',
      read: (session) => allianceApply(session, { allianceId: 13 }),
    },
  ],
})

console.log(snapshot.planets.map(({ planetId }) => planetId))
```

## 🧾 可检查的结果

页面函数返回 `{ data, response }`：`data` 是已解析文档或服务端给出的其他回执。HTML 由页面读取器解码；单请求操作和 `readAck` 可以返回 `page` 回执。

| `kind`     | 数据              | 含义                                     |
| ---------- | ----------------- | ---------------------------------------- |
| `message`  | `message: string` | 服务端渲染的消息块。                     |
| `redirect` | `target: URL`     | 未跟随的重定向目标。                     |
| `json`     | `value`           | 解析后的 JSON，数字字面量保留为文本。    |
| `page`     | —                 | 没有消息块的 HTML，可从 `readAck` 得到。 |
| `text`     | `text: string`    | 纯文本。                                 |
| `empty`    | —                 | 空正文。                                 |

HTTP 4xx/5xx、PHP 致命错误片段、`error: true`、认证失败码及端点明确的失败标识抛出 `ServerError(code: 'server')`，保留原始响应和可用的 `serverCode`。普通消息不按文案猜测成功与否。

响应及其数值字段解析失败抛出 `OperationError(code: 'parse')`；安装目录边界与快照并发检查使用 `ValidationError(code: 'validation')`。网络异常原样抛出。

`get` 和 `post` 返回文本正文的 `HttpResponse`。相对地址依据 `baseUrl` 解析；绝对地址必须仍在该安装目录内。`Session.request` 仅在 `withCookie: false` 时允许请求外部地址。`Session.requestBytes` 返回正文为未解码字节的 `BinaryResponse`。

`parsePage`、`readReply`、`readAck`、`inspectPage`、`parseSpyReport` 读取已有响应，不发送请求。`combatants` 从已解码页面中读取战斗大厅某一行的双方与胜者。

### 🔢 数字与显示精度

游戏数量使用普通 `number`。金属、晶体、氘的计时脚本提供未格式化的库存与产量；供给余额和设施产量明细则是缩写后的显示值。解析无法恢复响应中不存在的精度。

`adminUniverse` 返回 `data.universes`，各条目的 `gameSpeedFactor`、`fleetSpeedFactor` 是取整后的显示倍率。计算时应从 `adminUniverseSettings` 的 `data.settings.game_speed.value` 和 `data.settings.fleet_speed.value` 读取原始配置字符串。

| 读取函数       | 输入                                                                     |
| -------------- | ------------------------------------------------------------------------ |
| `displayed`    | 服务端以点分组、以逗号分隔小数的显示值。                                 |
| `abbreviated`  | 带 `K`、`M`、`B`、`T`、`Q`、`Q+`、`S`、`S+`、`O` 或 `N` 等后缀的显示值。 |
| `readDecimal`  | 有限小数。                                                               |
| `readAmount`   | 可含小数的非负数。                                                       |
| `readQuantity` | 非负整数数量；较大的值可能只是近似值。                                   |
| `readInteger`  | 作为 ID、键或索引的安全整数。                                            |

### New-Star 服务端限制

当前服务端处理器存在以下限制。本库保留其响应；仅凭回执不能确认业务状态已更新。

| 范围              | 服务端行为                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| 研究队列          | 取消、移除及立即完成研究可能使后续队列等级或时间不一致。                                                     |
| 消息与笔记        | 单条消息删除、单条归档与笔记更新缺少所有权校验；单条归档还将输入直接拼入 SQL。                               |
| `detailsUpgrade`  | 扣除资源先于价格计算，可能免费增加等级。                                                                     |
| 宇宙管理          | 新宇宙默认语言为空；宇宙列表在匹配多个不活跃账号时可能重复计算天体数量。                                     |
| 快捷航线          | 名称未经 HTML 转义就被存储和渲染。                                                                           |
| 管理消息列表      | 每页偏移 50 条但只读取 49 条；单独设置结束日期无效。                                                         |
| 已有封禁          | 更新使用不存在的数据库字段，无法延期或修改理由。                                                             |
| 外部认证          | Facebook 外跳会删除未登录会话，丢失握手状态；OpenID 在检查禁用状态前访问外部身份地址；注册引用的目录不存在。 |
| `adminCreateMoon` | 创建函数将提交的名称覆盖为默认月球名称。                                                                     |

## 🛠️ 开发

测试与编译期 API 契约放在 `tests/`。

npm 包包含 `out/` 和 `src/`，以及 npm 自动包含的 `package.json`、README 和 LICENSE。本库源码用于源码映射和声明映射。额外指南与图片通过 GitHub 链接提供。

运行时依赖在 JavaScript 和声明文件中均保留外部引用。打包检查禁止内嵌依赖源码或引用未声明的外部依赖。

使用 Node.js 26 或更高版本。直接声明的运行时和开发依赖均使用 `^` 兼容版本范围，lockfile 由 git 忽略。

| 命令                      | 用途                                         |
| ------------------------- | -------------------------------------------- |
| `node --run check`        | 执行 lint 并修复、格式化文件，再运行测试。   |
| `node --run build:only`   | 生成 ESM、声明文件及映射。                   |
| `node --run test:package` | 对照源码检查构建产物的导出、导入和源码映射。 |
| `node --run build`        | 按顺序执行上述三个阶段。                     |

测试直接运行 TypeScript，要求 `src/` 的行、分支和函数全覆盖。

## 📜 许可证

采用 [MIT 许可证](https://github.com/AhMisty/senators-bifrost/blob/main/LICENSE)。

## 🤝 贡献

欢迎提交问题和拉取请求。代码、类型、示例与两种语言的指南都应与仓库实际实现的协议一致。

---

<div align="center">
  <p>使用 <a href="https://github.com/rolldown/rolldown">Rolldown</a> 构建 | © 2026 AhMisty</p>
</div>
