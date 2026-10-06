<div align="center">
  <h1>Bifrost</h1>
  <img src="https://raw.githubusercontent.com/AhMisty/senators-bifrost/main/assets/logo.svg" alt="Bifrost" width="30%" />

[![npm version](https://img.shields.io/npm/v/@senators/bifrost.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://github.com/AhMisty/senators-bifrost/blob/main/LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/@senators/bifrost.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost)

<span style="color: #999">English</span> | [中文](https://github.com/AhMisty/senators-bifrost/blob/main/docs/zh-CN/README.md)
</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/AhMisty/senators-bifrost/main/assets/editor-demo.svg" alt="Animated TypeScript editor with completions for the first request" width="1200" />
</p>

## ✨ Work with the protocol as it is

Bifrost is an ESM and TypeScript client for the HTTP protocol of the New-Star server. It exposes the pages and actions reached through `game.php`, `admin.php`, `index.php` and `json.php`, along with the player's banner image, the battle-report redirect and the browser cron-job scripts.

- **Page-shaped results.** Page calls decode rendered documents and return the original HTTP response beside their data.
- **Explicit outcomes.** Confirmed server failures raise `ServerError` with the response; ambiguous messages remain receipts and unreadable expected documents are parse errors.
- **Direct requests and optional workflows.** Each page function represents one business request. Higher-level helpers compose multi-step flows while exposing each step's answer.
- **Caller-owned transport.** Inject `fetch` to set deadlines, cancellation, proxies or response limits. Automatic authentication is opt-in; the library schedules no background work.

## ⚡ Your first query

Install it with `npm install @senators/bifrost`; the library needs Node.js 26 or later at runtime. Supply the game installation directory as `baseUrl`, ending in `/` — a base address that does not name a directory is refused.

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

| `Session` option                      | Meaning                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `baseUrl`                             | Installation directory used to resolve request addresses.                      |
| `universe`                            | Default login universe, sent to the public script as `uni`.                    |
| `username?`, `password?`, `language?` | Defaults for `login`; credentials remain in memory.                            |
| `autoLogin?`                          | Defaults to `false`; `true` requires constructor username and password.        |
| `sessionToken?`                       | Existing `2Moons` cookie, if already authenticated.                            |
| `fetch?`                              | Custom transport, called without a receiver and with manual redirect handling. |
| `forwardedIp?`                        | Value sent to this installation in `X-Forwarded-For`.                          |

`Session.login` and `publicLogin` accept username, password, language and universe overrides. TypeScript requires credentials missing from the constructor.

A login is confirmed when the response sets a session cookie and redirects to this installation’s `game.php`. `publicVerify` and `publicExternalAuth` use the same rule.

With `autoLogin: true`, an authenticated request without a token logs in first. An `index.php?code=3` redirect within this installation triggers login with the configured credentials and one retry of that request.

Concurrent requests share an in-flight login or reuse the renewed session. Network, HTTP and other business errors do not trigger login.

The constructor sends no requests. Assigning `sessionToken` does not change login credentials. Callers coordinate tokens, accounts, universes and in-flight operations.

Workflows do not rebuild session state; steps using an earlier token may be rejected after login. Successful logout clears the token; `autoLogin` controls subsequent authentication.

### TLS certificates

Bifrost uses Node.js `fetch` by default and has no `rejectUnauthorized` or `ignoreSSL` option. For a trusted test server with an invalid certificate, put this in the application's entry point before the first HTTPS request:

```ts
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
```

This changes TLS verification process-wide, affecting other sessions and HTTPS clients that use Node.js defaults. Use it temporarily in a trusted test environment; do not put it inside a shared library.

For normal use, provide a valid server certificate. For a private CA, set `NODE_EXTRA_CA_CERTS` to its PEM file before starting Node.js; assigning it through `process.env` after startup has no effect. See [Node.js TLS environment variables](https://nodejs.org/download/release/v26.7.0/docs/api/cli.html#node_tls_reject_unauthorizedvalue).

### New-Star calculations

The pure functions in [src/rules](https://github.com/AhMisty/senators-bifrost/tree/main/src/rules) execute New-Star formulas without requests or business-input validation. `calculateProducerFlow` implements the default element grid; `ProducerElementId` restricts its supported producers at compile time.

| Area              | Functions                                                                           |
| ----------------- | ----------------------------------------------------------------------------------- |
| Price             | `calculateLevelPrice`                                                               |
| Construction time | `calculateConstructionSeconds`                                                      |
| Production        | `calculateProducerFlow`, `calculatePlanetProduction`, `calculateResourceProduction` |
| Supply            | `calculateSupplyBalance`                                                            |
| Ships             | `calculateShipSpeed`, `calculateShipConsumption`                                    |
| Flight            | `calculateFleetDistance`, `calculateFleetDuration`, `calculateFleetFuel`            |
| Missiles          | `calculateMissileDuration`                                                          |

Supply universe configuration, base costs and aggregate account bonuses. `calculatePlanetProduction` requires current `stocks` and the configured `productionSupplyId`; `basicIncome` must match the body.

For server quotes, read the `quotes` field returned by `buildings` and `research`. The `ships` and `flightPreview` fields of `fleetStep1` describe available ships and flight parameters; `fleetStep2.fuel` quotes fuel for the prepared destination.

Rule functions do not fetch administrator settings or infer account modifiers. Calculate a scenario only when its required inputs are known.

`calculatePlanetProduction` reproduces the server's production cache rebuild. Compare it with page output after submitting production settings to rebuild that cache; cached hourly output does not necessarily refresh when stocks or configuration change.

Supply `producers` in server catalogue order, including level-zero facilities.

Calculation functions use `SupplyBalance` (`total`, `consumption`), keeping demand independent of gross supply as the server does. Page observations use `ResourceSupply` (`total`, `available`); their abbreviated values cannot provide exact consumption by subtraction.

## 🧩 Pages, actions and options

The root entry exports all supported APIs. Import `/game` for ordinary game pages and workflows, `/rules` for pure calculations, `/public` for login and registration pages, or `/admin` for administration.

Client names describe their purpose; [src/protocol/routes.ts](https://github.com/AhMisty/senators-bifrost/blob/main/src/protocol/routes.ts) maps them to the server's `page`, `mode` and fixed query spellings. Readers such as `buildings` decode a document. Actions such as `buildingsUpgrade` send the corresponding form fields and return the server's answer.

Business methods accept named parameters and construct only the corresponding server fields. Administrative edit fields are limited to the current server schema; public pages select language with `language`. `Session.request`, `get/post` and protocol route entry points retain generic URL and payload support; `PageOptions` belongs to these low-level requests.

Finite choices use shared literal types: `FleetSpeed` is 1–10, `ProductionStep` is 0–10, and resource and producer IDs describe the supported sets. Readers decode external values into these types once. Numeric element selections use `ReadonlyMap` throughout; named options remain objects. Production and trading submissions construct only their declared fields.

Callers supply finite amounts, coordinates, multipliers and database IDs valid for the operation. These open numeric values have no per-method runtime validation. Snapshot concurrency is checked once by the scheduler; response structure and the server-selected origin are checked from existing responses.

Planet-dependent methods require `planetId` or `origin.planetId`, encoded as `cp`; this includes account operations that depend on the selected planet, such as `settingsVacation`. Methods without a planet dependency omit this context.

Directed operations use `target` or `targets`; gathering sends from `targets` to the selected planet. Body types 1, 2 and 3 mean planet, debris and moon.

New-Star retains its active planet when `cp` does not identify an owned planet. Planet-page results include the observed `planetId`; their receipts use `null` when unreported. Fixed JSON and popup results omit this field, including jump-gate dispatch and missile dismantling.

`parseContext(parsePage(result.response))` and `inspection` read current-planet and header data from existing responses. `dispatchFleet` verifies the origin in both draft and destination documents before continuing. These checks add no requests.

### 🏗️ Build and produce

| Area              | Reading and actions                                                                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buildings         | `buildings`, `buildingsUpgrade`, `buildingsCancel`, `buildingsRemove`, `buildingsDowngrade`, `buildingsFinish`                                                                                                              |
| Research          | `research`, `researchUpgrade`, `researchCancel`, `researchRemove`, `researchFinish`                                                                                                                                         |
| Shipyard          | `shipyard`, `shipyardDefense`, `shipyardProduce`, `shipyardCancel`                                                                                                                                                          |
| Direct purchases  | `buyBuild` / `buyBuildSend`, `buyDefense` / `buyDefenseSend`, `buyFleet` / `buyFleetSend`, `buyTech` / `buyTechSend`                                                                                                        |
| Economy           | `resources`, `resourcesSend`, `resourcesAllPlanets`, `market`, `marketCreateLot`, `marketBuyLot`, `marketCancelLot`, `trader`, `traderTrade`, `traderSend`                                                                  |
| Logistics         | `delivery` / `deliverySend`, `reduceFleet` / `reduceFleetGather`, `reduceResources` / `reduceResourcesGather`, `containers` / `containersOpen`                                                                              |
| Growth catalogues | `officer`, `government`, `ancientContainerShop`, `premium`, `blueprints`, `artifact`, `development`, `details`, `minerals`, `auction`, `fair`, `band`, `race`, `ethics`, `party`, `ideologies` and their purchase functions |

Growth documents use a client-facing `kind`, such as `officer` or `government`; `controlKind` tells whether an entry raises a level, extends time, spends a quantity, waits for a cooldown or chooses one option. Prices may depend on the planet addressed by the request.

`resourcesAllPlanets` sets production to step 10 when enabled and step 0 when disabled across the account's planets.

### 🚀 Fleets and navigation

| Area                   | Functions                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Dispatch               | `fleetStep1`, `fleetStep1CheckTarget`, `fleetStep2`, `fleetStep3`, `fleetAjax`                                                |
| Draft tools            | `fleetStep1SaveShortcuts`, `fleetStep1DeleteShortcuts`, `fleetStep1` with `presetName`                                        |
| Active fleets          | `fleetTable`, `fleetTableRecall`, `fleetTableOpenACS`, `fleetTableRenameACS`, `fleetTableInviteACS`, `fleetTableDeletePreset` |
| Navigation             | `galaxy`, `phalanx`, `fleetMissile`, `findDebris`                                                                             |
| Reports and simulation | `battleHall`, `battleReport`, `publicBattleReport`, `battleSimulator`, `battleSimulatorSend`                                  |

The three dispatch steps form one server-side draft. Step 1 issues a token, step 2 prepares its destination and step 3 consumes the token even when it refuses the mission. Use a value from step 1's `speedOptions`: 10 means 100% speed. The caller can perform the steps individually:

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

`galaxy` can charge deuterium for browsing another system, and `phalanx` charges for a scan. A `GET` to those pages is therefore an operation with a cost.

### 🌍 Planet, account and universe

| Area                   | Functions                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Planet state           | `overview`, `planet`, `control`                                                                                           |
| Planet changes         | `overviewRename`, `overviewDelete`, `planetCoord`, `planetField`, `planetDiameter`, `planetGenerateName`, `createMoonBuy` |
| Account views          | `settings`, `achievements`, `bonusSummary`, `records`, `statistics`, `techtree`, `arsenal`, `store`                       |
| Daily reward           | `claimDailyBonus` requests and reads the reward receipt                                                                   |
| Search and information | `search`, `searchResult`, `searchAutocomplete`, `information`, `playerCard`, `questions`                                  |
| Polling                | `notifications` (`json.php`), `scan` (`game.php` plain text)                                                              |

`shipyard` and `shipyardDefense` expose `quotes` with costs, time per unit and maximum buildable quantities.

`overview` decodes planet details, construction cards and fleet events. `control` reads the empire matrix across the account's planets and moons. Each observation retains its own response time.

`settings` returns a document distinguished by `onVacation`. Preference, email, password and username changes require the ordinary account document; vacation and account-deletion operations accept either state.

Changes preserve the document's other preferences. Every submission explicitly chooses `accountDeletionEnabled`: `true` starts the deletion period at submission time, while `false` cancels it. `settingsAccountDeletion` takes the same choice as `enabled`. The rendered `accountDeletionChecked` field cannot establish the stored schedule because New-Star overwrites the timestamp while rendering navigation.

A username or password change ends the current game session; call `login` with the updated credentials afterward.

### 🤝 Alliance, social and messages

| Area                 | Functions                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alliance             | `alliance`, `allianceInfo`, `allianceMemberList`, `allianceStorage`, `allianceDeposit`, `allianceWithdrawal`, and the alliance administration functions             |
| Alliance actions     | `createAlliance`, `submitAllianceApplication`, `depositAllianceResources`, `withdrawAllianceResources`, `distributeAllianceResources`, `transferAllianceLeadership` |
| Messages             | `messages`, `messagesView`, `messagesWrite`, `messagesSend`, `messagesAction`                                                                                       |
| Contacts and support | `buddyList`, `buddyListRequest`, `buddyListSend`, `buddyListAccept`, `buddyListDelete`, `ticket`, `ticketCreate`, `ticketView`, `ticketSend`, `chat`                |

`messagesWrite` arms the server-side token for a recipient; `messagesSend` submits the message afterward. `sendMessage` handles both steps and serializes its calls per `Session` so they do not overwrite each other's token.

`messagesView` marks the returned incoming messages as read. `messagesAction` with `deleteunmarked` deletes all unselected received messages, including archived messages; `category` only controls the returned page.

`updateAllianceSettings` applies a patch to the complete document returned by `allianceAdminOverview`. Its `textKind` selects the edited text section; `eventMissions` replaces the selected mission list. Unchanged settings are preserved.

### 🛠️ Administration and public pages

`adminLogin` establishes administrative access within the game session. The `admin*` functions cover universe configuration, permissions, account editing, support, scheduled jobs and other administrative pages.

The `public*` functions cover `index.php` pages for registration, account recovery, verification, news, rules, the ban list and the battle hall. `publicBattleReport` decodes a published report rendered by `game.php` and requires a valid game session.

`publicLogin`, `publicVerify`, `publicVerifyJson` and `publicExternalAuth` send no existing cookie. `publicVerifyJson` only activates an account and returns JSON; the other three can confirm and adopt a new token.

`playerBanner` returns image bytes, `combatReport` reports the redirect from `CombatReport.php`, and `requestCronjob` requests the browser cron-job script. A returned transparent GIF alone does not prove a job executed.

`adminUniverseSettingsSave` applies a `patch` to a complete `form`; `form.settings[key]` contains the value and section.

Quick-editor records expose complete `values` for the default player, planet or moon schema. `adminQuickEditorSave` uses the record's editor and ID. For planets and moons, the server rounds numeric values and clears inapplicable buildings.

Player saves require explicit `multi` and `authorizationAttack` choices because the server rewrites these flags even when their controls are hidden. An optional `password` changes the password.

`adminRefreshStatistics` rebuilds statistics for every universe in the installation.

`adminAccountEditorSubmit` requires explicit `vacation` for personal edits and `changeleader` for alliance edits because the server rewrites these values on every submission. Enabling vacation also requires its days, hours, minutes and seconds.

`adminSendMessagesSend` broadcasts within the current universe, optionally filtered by language; `channel` selects game messages (`0`), email (`1`) or both (`2`).

## 🧭 Workflows and snapshots

Workflows compose page functions and retain each step's response. Action workflows propagate errors; snapshots retain per-item failures. The Session authentication policy applies to both.

| Helper             | Requests and stopping point                                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dispatchFleet`    | Opens a draft, prepares the destination and submits it. `stage` identifies the last request reached; inspect `dispatch.data` to determine whether the final submission succeeded. |
| `sendMessage`      | Opens the compose form to arm the server token, then sends to its returned recipient. Stops at `stage: 'compose'` if no compose form arrives.                                     |
| `sendBuddyRequest` | Reads the request popup, then submits to its returned player. Stops at `stage: 'request'` if no popup arrives.                                                                    |
| `snapshotPlanet`   | Read six core pages: overview, buildings, shipyard, resources, planet and debris search. Select extensions through `additional`.                                                  |
| `snapshotAccount`  | Read the empire matrix, notifications and research, then each listed planet and moon. Use `additional` for account extensions and `additionalByPlanet` for planet extensions.     |

```ts
import { sendMessage } from '@senators/bifrost'

const result = await sendMessage(session, { recipientId: 4242, text: 'Hello' })

if (result.stage === 'send') console.log(result.send.data)
else console.log(result.compose.data)
```

Only snapshots require `concurrency`: `1` runs sequentially, larger safe integers cap in-flight requests, and `null` removes the limit. The budget covers one snapshot. Fleet, message and buddy workflows follow protocol order without a concurrency option.

Snapshots retain each outcome: `fulfilled` contains an `Observed` value, `rejected` contains an error, and `skipped` identifies a request that was not started. A `fulfilled` receipt still requires inspecting `value.data` to determine its meaning.

Ordinary failures preserve other observations. Authentication errors redirecting to the login endpoint stop queued requests while retaining in-flight results.

Account core pages are read once. Research levels and queues belong to the account; quotes use the snapshot's `planetId`. Use `additionalByPlanet` to request quotes for other planets. If `control` does not return its document, `planets` is empty.

Planets are processed in order. Snapshots are not atomic: each response records its own `observedAtMs`, the local Unix millisecond timestamp when its body finished loading. Default snapshots do not claim daily rewards, browse the galaxy or scan with a phalanx.

Each `additional` entry contains `name` and `read`; its callback calls a page reader with explicit business parameters. Planet callbacks also receive `{ planetId }`. Each entry occupies one concurrency slot, so callbacks should perform one independent read.

Extensions share the `SnapshotPage` result type, which exposes only `data.kind` at compile time. Inspect or decode the retained `response` when other extension fields are needed.

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

## 🧾 Results you can inspect

Page calls return `{ data, response }`, where `data` is the decoded document or another server receipt. Page readers decode HTML; single-request actions and `readAck` can return a `page` receipt.

| `kind`     | Payload           | Meaning                                                 |
| ---------- | ----------------- | ------------------------------------------------------- |
| `message`  | `message: string` | Message block rendered by the server.                   |
| `redirect` | `target: URL`     | Redirect target, returned without following it.         |
| `json`     | `value`           | JSON payload with numeric literals preserved as text.   |
| `page`     | —                 | HTML without a message block; available from `readAck`. |
| `text`     | `text: string`    | Plain-text response.                                    |
| `empty`    | —                 | Empty response body.                                    |

HTTP 4xx/5xx, PHP fatal-error fragments, `error: true`, authentication codes and endpoint-specific failure signals raise `ServerError(code: 'server')` with the response and available `serverCode`. Ordinary messages are not classified as success or failure from their wording.

Unreadable responses, including numeric fields, raise `OperationError(code: 'parse')`. Installation boundaries and snapshot concurrency use `ValidationError(code: 'validation')`. Network errors propagate unchanged.

`get` and `post` return text `HttpResponse` objects. Relative addresses resolve against `baseUrl`; absolute addresses must remain within that installation. `Session.request` permits external addresses only with `withCookie: false`. `Session.requestBytes` returns undecoded bytes in a `BinaryResponse`.

`parsePage`, `readReply`, `readAck`, `inspectPage` and `parseSpyReport` read existing responses without making requests. `combatants` reads the sides and winner of one battle-hall row from an already decoded page.

### 🔢 Numbers and rendered precision

Game quantities are plain `number` values. Metal, crystal and deuterium tickers expose unformatted stock and production; supply balances and producer rows are abbreviated display values. Decoding cannot restore precision absent from the response.

`adminUniverse` returns `data.universes`; each entry's `gameSpeedFactor` and `fleetSpeedFactor` are rounded display multipliers. For calculations, read the original strings from `adminUniverseSettings` at `data.settings.game_speed.value` and `data.settings.fleet_speed.value`.

| Reader         | Input                                                                          |
| -------------- | ------------------------------------------------------------------------------ |
| `displayed`    | Grouped decimal with the server's dot grouping and comma decimal separator.    |
| `abbreviated`  | A display suffix such as `K`, `M`, `B`, `T`, `Q`, `Q+`, `S`, `S+`, `O` or `N`. |
| `readDecimal`  | Finite decimal value.                                                          |
| `readAmount`   | Nonnegative value, including fractions.                                        |
| `readQuantity` | Nonnegative whole quantity; large values may be approximate.                   |
| `readInteger`  | Safe whole number used as an id, key or index.                                 |

### New-Star server limitations

The current server handlers have the following limitations. Bifrost preserves their responses; a receipt alone cannot confirm that business state changed.

| Area                       | Server behavior                                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Research queues            | Cancellation, removal and instant completion can leave later queue levels or times inconsistent.                                                                                                            |
| Messages and notes         | Single-message deletion, single-message archiving and note updates omit ownership checks. Single-message archiving interpolates its input into SQL.                                                         |
| `detailsUpgrade`           | Resource deduction runs before price calculation, so a level increase can be free.                                                                                                                          |
| Universe management        | New universes have an empty default language; the universe list can overcount planets when several inactive accounts match.                                                                                 |
| Fleet shortcuts            | Names are stored and rendered without HTML escaping.                                                                                                                                                        |
| Administrator message list | Pagination advances by 50 rows but selects 49; an end date without a start date is ignored.                                                                                                                 |
| Existing bans              | Updates use a nonexistent database field, preventing extensions and reason changes.                                                                                                                         |
| External authentication    | Facebook redirection deletes the anonymous session and loses handshake state. OpenID accesses the external identity address before checking its disabled state. Registration refers to a missing directory. |
| `adminCreateMoon`          | The creation function replaces the submitted name with the default moon name.                                                                                                                               |

## 🛠️ Development

Tests and compile-time API contracts live in `tests/`.

Published packages include `out/` and `src/`; npm also includes `package.json`, README and LICENSE. The library sources support source maps and declaration maps. Additional guides and images are linked from GitHub.

Runtime dependencies remain external in JavaScript and declarations. Packaging checks reject bundled dependency sources and undeclared external imports.

Use Node.js 26 or later. Direct runtime and development dependencies use `^` compatible version ranges; lockfiles are ignored by git.

| Command                   | Purpose                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `node --run check`        | Run lint with fixes, format files, then run tests.               |
| `node --run build:only`   | Generate ESM, declarations and their maps.                       |
| `node --run test:package` | Check built exports, imports and source maps against the source. |
| `node --run build`        | Run all three stages in order.                                   |

Tests run directly from TypeScript and require full line, branch and function coverage over `src/`.

## 📜 License

Licensed under the [MIT License](https://github.com/AhMisty/senators-bifrost/blob/main/LICENSE).

## 🤝 Contributing

Issues and pull requests are welcome. Keep code, types, examples and both language guides aligned with the protocol the repository implements.

---

<div align="center">
  <p>Built with <a href="https://github.com/rolldown/rolldown">Rolldown</a> | © 2026 AhMisty</p>
</div>
