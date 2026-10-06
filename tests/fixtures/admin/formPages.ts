export function adminMessageBody(message: string): string {
  return [
    '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
    '<div class="card mb-3">',
    '<h5 class="card-header">Info</h5>',
    '<div class="card-body">',
    `<p class="card-text">${message}</p>`,
    '</div>',
    '</div>',
    '</main>',
  ].join('')
}

export function accountEditorMenuCard(edit: string, title: string): string {
  return [
    '<div class="col-md-4">',
    '<div class="card mb-4 shadow-sm">',
    `<img src="./styles/resource/images/admin/accounteditor/${edit}.jpg" class="card-img img-thumbnail bg-primary border-primary">`,
    '<div class="card-body">',
    `<h5 class="card-title">${title}</h5>`,
    `<p class="card-text overflow-auto" style="max-width: 1000px; max-height: 150px;">${title}</p>`,
    '<div style="text-align: right">',
    `<a href="?page=AccountEditor&amp;edit=${edit}">`,
    '<button type="button" class="btn btn-primary">Proceed</button>',
    '</a>',
    '</div>',
    '</div>',
    '</div>',
    '</div>',
  ].join('')
}

export const ACCOUNT_EDITOR_MENU_BODY: string = [
  '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
  '<div class="album">',
  '<div class="row">',
  accountEditorMenuCard('buildings', 'Buildings'),
  accountEditorMenuCard('ships', 'Ships'),
  accountEditorMenuCard('defenses', 'Defenses'),
  accountEditorMenuCard('researchs', 'Research'),
  accountEditorMenuCard('officiers', 'Officers'),
  accountEditorMenuCard('resources', 'Resources'),
  accountEditorMenuCard('planets', 'Planets'),
  accountEditorMenuCard('alliances', 'Alliances'),
  accountEditorMenuCard('personal', 'Account'),
  '</div>',
  '</div>',
  '</main>',
].join('')

export const ACCOUNT_EDITOR_MENU_WITH_FOREIGN_CARD_BODY: string = [
  '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
  '<div class="album">',
  '<div class="row">',
  accountEditorMenuCard('ships', 'Ships'),
  accountEditorMenuCard('moon', 'Moons (a section this server has no card for)'),
  '</div>',
  '</div>',
  '</main>',
].join('')

export function accountEditorCatalogueRow(id: number, column: string, name: string): string {
  return [
    '<tr>',
    `<td><label for="${id}">${id}</label></td>`,
    `<td><label for="${id}">${name}</label></td>`,
    `<td><input name="${column}" value="0" type="text" class="form-control" id="${id}"></td>`,
    '</tr>',
  ].join('')
}

const ACCOUNT_EDITOR_ID_ROW = [
  '<table class="table table-dark table-hover">',
  '<thead>',
  '<tr>',
  '<th><label for="id">Planet or moon id</label></th>',
  '<th><input name="id" value="0" type="text" class="form-control" id="id"></th>',
  '</tr>',
  '</thead>',
  '</table>',
].join('')

const ACCOUNT_EDITOR_SUBMIT_CONTROLS = [
  '<input class="btn btn-primary" type="reset" value="Reset">',
  '<input class="btn btn-primary" type="submit" value="Add" name="add">',
  '<input class="btn btn-primary" type="submit" value="Delete" name="delete">',
].join('')

export const ACCOUNT_EDITOR_SHIPS_BODY: string = [
  '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
  '<div class="card mb-3">',
  '<h5 class="card-header">Account editor</h5>',
  '<div class="card-body">',
  '<form action="" method="post">',
  ACCOUNT_EDITOR_ID_ROW,
  '<table class="table table-dark table-hover">',
  '<thead>',
  '<tr><th>ID</th><th>Name</th><th>Level</th></tr>',
  '</thead>',
  '<tbody>',
  accountEditorCatalogueRow(202, 'small_ship_cargo', 'Small Cargo'),
  accountEditorCatalogueRow(210, 'spy_sonde', 'Espionage Probe'),
  '</tbody>',
  '</table>',
  ACCOUNT_EDITOR_SUBMIT_CONTROLS,
  '</form>',
  '</div>',
  '</div>',
  '</main>',
].join('')

export const ACCOUNT_EDITOR_ALLIANCE_BODY: string = [
  '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
  '<div class="card mb-3">',
  '<h5 class="card-header">Account editor</h5>',
  '<div class="card-body">',
  '<form action="" method="post">',
  '<table class="table table-dark table-hover">',
  '<thead>',
  '<tr>',
  '<th><label for="id">Alliance id</label></th>',
  '<th><input name="id" type="text" class="form-control" id="id"></th>',
  '</tr>',
  '</thead>',
  '<tbody>',
  '<tr><td><label for="changeleader">New leader</label></td>',
  '<td><input name="changeleader" type="text" class="form-control" id="changeleader"></td></tr>',
  '<tr><td><label for="name">Name</label></td>',
  '<td><input name="name" type="text" class="form-control" id="name"></td></tr>',
  '<tr><td><label for="tag">Tag</label></td>',
  '<td><input name="tag" type="text" class="form-control" id="tag"></td></tr>',
  '<tr><td><label for="delete_u">Delete member</label></td>',
  '<td><input name="delete_u" type="text" class="form-control" id="delete_u"></td></tr>',
  '<tr><td><label class="form-check-label" for="delete">Delete</label></td>',
  '<td><input name="delete" type="checkbox" class="form-check-input" id="delete"></td></tr>',
  '<tr><td><label for="externo">External text</label></td>',
  '<td><textarea name="externo" type="text" class="form-control" id="externo">Founded 2025</textarea></td></tr>',
  '<tr><td><label for="interno">Internal text</label></td>',
  '<td><textarea name="interno" type="text" class="form-control" id="interno"></textarea></td></tr>',
  '<tr><td><label for="solicitud">Application text</label></td>',
  '<td><textarea name="solicitud" type="text" class="form-control" id="solicitud"></textarea></td></tr>',
  '</tbody>',
  '</table>',
  '<input class="btn btn-primary" type="submit" value="Submit">',
  '</form>',
  '</div>',
  '</div>',
  '</main>',
].join('')

export const ACCOUNT_EDITOR_PERSONAL_BODY: string = [
  '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
  '<div class="card mb-3">',
  '<h5 class="card-header">Account editor</h5>',
  '<div class="card-body">',
  '<form action="" method="post">',
  '<table class="table table-dark table-hover">',
  '<thead>',
  '<tr>',
  '<th><label for="id">Account id</label></th>',
  '<th><input name="id" type="text" class="form-control" id="id"></th>',
  '</tr>',
  '</thead>',
  '<tbody>',
  '<tr><td><label for="username">Name</label></td>',
  '<td><input name="username" type="text" class="form-control" id="username"></td></tr>',
  '<tr><td><label for="password">Password</label></td>',
  '<td><input name="password" type="text" class="form-control" id="password"></td></tr>',
  '<tr><td><label for="email">Email</label></td>',
  '<td><input name="email" type="text" class="form-control" id="email"></td></tr>',
  '<tr><td><label for="email_2">Email change</label></td>',
  '<td><input name="email_2" type="text" class="form-control" id="email_2"></td></tr>',
  '<tr><td><label for="vacat">Vacation mode</label></td>',
  '<td><select name="vacation" class="form-control" id="vacat">',
  '<option value="">Select</option>',
  '<option value="yes">Yes</option>',
  '<option value="no">No</option>',
  '</select></td></tr>',
  '<tr><td><label for="d">Days</label></td>',
  '<td><input name="d" type="text" class="form-control" id="d"></td></tr>',
  '<tr><td><label for="h">Hours</label></td>',
  '<td><input name="h" type="text" class="form-control" id="h"></td></tr>',
  '<tr><td><label for="m">Minutes</label></td>',
  '<td><input name="m" type="text" class="form-control" id="m"></td></tr>',
  '<tr><td><label for="s">Seconds</label></td>',
  '<td><input name="s" type="text" class="form-control" id="s"></td></tr>',
  '</tbody>',
  '</table>',
  '<input class="btn btn-primary" type="submit" value="Submit">',
  '</form>',
  '</div>',
  '</div>',
  '</main>',
].join('')

export const DUMP_TABLE_SELECTOR: string =
  '<select multiple="multiple" class="form-control" size="10" name="dbtables[]" id="dbtables">' +
  '<option value="uni_banned">uni_banned</option>' +
  '<option value="uni_planets">uni_planets</option>' +
  '<option value="uni_users">uni_users</option>' +
  '</select>'

export const DUMP_BODY: string = [
  '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
  '<div class="card mb-3">',
  '<h5 class="card-header">Backup</h5>',
  '<div class="card-body">',
  '<form action="admin.php?page=dump" method="post">',
  '<input type="hidden" name="action" value="dump">',
  '<div class="form-group">',
  '<input type="checkbox" id="selectAll">',
  '<label for="selectAll">Select all tables</label>',
  DUMP_TABLE_SELECTOR,
  '</div>',
  '<button type="submit" class="btn btn-primary">Submit</button>',
  '</form>',
  '</div>',
  '</div>',
  '</main>',
].join('')

export const INFORMATION_ENVIRONMENT_BLOCK: string = [
  '<p class="card-text">',
  'Web server Apache (fpm-fcgi)<br>',
  'JSON loaded<br>',
  'Error log error.log (0)<br>',
  '</p>',
].join('')

export const INFORMATION_INSTALLATION_BLOCK: string = [
  '<p class="card-text">',
  'Game version 1.8.0<br>',
  'Address http://uni.example.com/<br>',
  '</p>',
].join('')

export const INFORMATION_BODY: string =
  '<div class="card-body">' +
  INFORMATION_ENVIRONMENT_BLOCK +
  INFORMATION_INSTALLATION_BLOCK +
  '</div>'

export const FLYING_FLEET_MISSION_ANCHOR: string = [
  '<a href="#" class="tooltip" ',
  'data-tooltip-content="<table><tr><td>Metal</td><td>1.000</td></tr></table>">',
  'Transport<br>12<br>Raiders&nbsp;(R)',
  '</a>',
].join('')

export const FORM_FIELDS_DISABLED_ROW: string =
  '<tr>' +
  '<td><label for="210">210</label></td>' +
  '<td><label for="210">Espionage Probe</label></td>' +
  '<td><input name="spy_sonde" value="0" type="text" class="form-control" id="210" disabled></td>' +
  '</tr>'

export const FORM_FIELDS_CHOSEN_TABLES: string = DUMP_TABLE_SELECTOR.replace(
  '<option value="uni_planets">',
  '<option value="uni_planets" selected>',
).replace('<option value="uni_users">', '<option value="uni_users" selected>')

export const RIGHTS_USER_SELECTOR: string = [
  '<select class="form-control mb-3" name="id_1" size="10">',
  '<option value="7">Nova&nbsp;&nbsp;(Administrator)</option>',
  '<option value="9">Vega&nbsp;&nbsp;(Moderator)</option>',
  '</select>',
].join('')

const RIGHTS_FILTER_BUTTONS = [
  '<div class="btn-group mb-3" role="group">',
  '<a href="?page=rights&amp;key=rights&amp;sid=abc&amp;get=adm">',
  '<button type="button" class="btn btn-secondary">Administrators</button>',
  '</a>',
  '<a href="?page=rights&amp;key=rights&amp;sid=abc&amp;get=ope">',
  '<button type="button" class="btn btn-secondary">Operators</button>',
  '</a>',
  '<a href="?page=rights&amp;key=rights&amp;sid=abc&amp;get=mod">',
  '<button type="button" class="btn btn-secondary">Moderators</button>',
  '</a>',
  '<a href="?page=rights&amp;key=rights&amp;sid=abc&amp;get=pla">',
  '<button type="button" class="btn btn-secondary">Players</button>',
  '</a>',
  '<a href="?page=rights&amp;key=rights&amp;sid=abc">',
  '<button type="button" class="btn btn-secondary">All</button>',
  '</a>',
  '</div>',
].join('')

const RIGHTS_FILTER_CONTROLS = [
  '<input class="form-control mb-3" NAME="regexp" onKeyUp="UserList.set(this.value)">',
  '<input class="btn btn-primary" type="button" onClick="UserList.set(this.form.regexp.value)" value="Filter">',
  '<input class="btn btn-primary" type="button" onClick="UserList.reset();this.form.regexp.value=\'\'" value="Deselect">',
  '<input class="btn btn-primary" type="submit" value="Proceed">',
].join('')

export const RIGHTS_SELECTOR_BODY: string = [
  '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
  '<div class="card mb-3">',
  '<h5 class="card-header">Rights</h5>',
  '<div class="card-body">',
  '<form action="" method="post" name="users">',
  RIGHTS_USER_SELECTOR,
  '<script type="text/javascript">',
  "var UserList = new filterlist(document.getElementsByName('id_1')[0]);",
  '</script>',
  RIGHTS_FILTER_BUTTONS,
  RIGHTS_FILTER_CONTROLS,
  '</form>',
  '</div>',
  '</div>',
  '</main>',
].join('')

export const RIGHTS_USERS_BODY: string = [
  '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
  '<div class="card mb-3">',
  '<h5 class="card-header">Rights</h5>',
  '<div class="card-body">',
  '<form action="" method="post" name="users">',
  RIGHTS_USER_SELECTOR,
  '<script type="text/javascript">',
  "var UserList = new filterlist(document.getElementsByName('id_1')[0]);",
  '</script>',
  RIGHTS_FILTER_BUTTONS,
  '<div class="form-group">',
  '<label for="1">Account id</label>',
  '<input class="form-control" name="id_2" type="text" id="1">',
  '</div>',
  '<div class="form-group">',
  '<label for="2">Level</label>',
  '<select class="form-control" id="2" name="authlevel">',
  '<option value="0">Player</option>',
  '<option value="1">Moderator</option>',
  '<option value="2">Operator</option>',
  '<option value="3">Administrator</option>',
  '</select>',
  '</div>',
  RIGHTS_FILTER_CONTROLS,
  '</form>',
  '</div>',
  '</div>',
  '</main>',
].join('')

function rightsRow(page: string, granted: boolean): string {
  return [
    '<tr>',
    `<td>${page}</td>`,
    '<td>Yes ',
    `<input class="yes" name="rights[${page}]" type="radio"${granted ? ' checked="checked"' : ''} value="1">`,
    ' No ',
    `<input class="no" name="rights[${page}]" type="radio"${granted ? '' : ' checked="checked"'} value="0">`,
    '</td>',
    '</tr>',
  ].join('')
}

export const RIGHTS_GRANTS_BODY: string = [
  '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
  '<div class="card mb-3">',
  '<h5 class="card-header">Rights</h5>',
  '<div class="card-body">',
  '<form action="" method="post">',
  '<input name="action" type="hidden" value="send">',
  '<input name="id_1" type="hidden" value="7">',
  '<table class="table table-dark table-hover">',
  '<thead>',
  '<tr>',
  '<th>Nova</th>',
  "<th><a href=\"javascript:;\" onclick=\"$('.yes').attr('checked', 'checked');\">Yes</a> " +
    "<a href=\"javascript:;\" onclick=\"$('.no').attr('checked', 'checked');\">No</a></th>",
  '</tr>',
  '</thead>',
  '<tbody>',
  rightsRow('ShowAccountEditorPage.class', true),
  rightsRow('ShowBanPage.class', false),
  '</tbody>',
  '</table>',
  '<input class="btn btn-primary" type="submit" value="Submit">',
  '</form>',
  '</div>',
  '</div>',
  '</main>',
].join('')

export const RIGHTS_MENU_BODY: string = [
  '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
  '<div class="album">',
  '<div class="row">',
  '<div class="col-md-6">',
  '<div class="card mb-4 shadow-sm">',
  '<img src="./styles/resource/images/admin/rights/rights.jpg" class="card-img img-thumbnail bg-primary border-primary">',
  '<div class="card-body">',
  '<h5 class="card-title">Rights</h5>',
  '<p class="card-text overflow-auto" style="max-width: 1000px; max-height: 150px;">Rights</p>',
  '<div style="text-align: right">',
  '<a href="?page=rights&key=rights">',
  '<button type="button" class="btn btn-primary">Proceed</button>',
  '</a>',
  '</div>',
  '</div>',
  '</div>',
  '</div>',
  '<div class="col-md-6">',
  '<div class="card mb-4 shadow-sm">',
  '<img src="./styles/resource/images/admin/rights/users.jpg" class="card-img img-thumbnail bg-primary border-primary">',
  '<div class="card-body">',
  '<h5 class="card-title">Users</h5>',
  '<p class="card-text overflow-auto" style="max-width: 1000px; max-height: 150px;">Users</p>',
  '<div style="text-align: right">',
  '<a href="?page=rights&key=users">',
  '<button type="button" class="btn btn-primary">Proceed</button>',
  '</a>',
  '</div>',
  '</div>',
  '</div>',
  '</div>',
  '</div>',
  '</div>',
  '</main>',
].join('')

export function configUniSettingRow(name: string, value: string): string {
  return [
    '<tr>',
    `<td><label for="${name}">${name} (${name})</label></td>`,
    `<td><input name="${name}" value="${value}" type="text" class="form-control" id="${name}"></td>`,
    '</tr>',
  ].join('')
}

function configUniTab(section: string, label: string): string {
  return [
    '<li class="nav-item" role="presentation">',
    `<a class="nav-link" id="pills-${section}-tab" data-toggle="pill" href="#pills-${section}" role="tab" aria-controls="pills-${section}" aria-selected="false">${label}</a>`,
    '</li>',
  ].join('')
}

function configUniPane(section: string, rows: string): string {
  return [
    `<div class="tab-pane fade show" id="pills-${section}" role="tabpanel" aria-labelledby="pills-${section}-tab">`,
    '<table class="table table-dark table-hover">',
    '<thead>',
    '<tr><th>Parameter</th><th>Value</th></tr>',
    '</thead>',
    '<tbody>',
    rows,
    '</tbody>',
    '</table>',
    '<input class="btn btn-primary" type="submit" value="Submit">',
    '</div>',
  ].join('')
}

const CONFIG_UNI_FIELDS: Readonly<Record<string, readonly string[]>> = {
  server: ['game_name', 'ttf_file', 'timezone'],
  user: [
    'del_oldstuff',
    'del_user_manually',
    'del_user_automatic',
    'sendmail_inactive',
    'del_user_sendmail',
  ],
  recapthca: ['capaktiv', 'cappublic', 'capprivate'],
  smtp: [
    'mail_active',
    'mail_use',
    'smtp_sendmail',
    'smail_path',
    'smtp_host',
    'smtp_ssl',
    'smtp_port',
    'smtp_user',
    'smtp_pass',
  ],
  messages: ['message_delete_behavior', 'message_delete_days'],
  analytics: ['ga_active', 'ga_key'],
  chat: [
    'chat_channelname',
    'chat_botname',
    'chat_nickchange',
    'chat_logmessage',
    'chat_allowmes',
    'chat_allowchan',
    'chat_closed',
  ],
  teamspeak: [
    'ts_modon',
    'ts_version',
    'ts_server',
    'ts_tcpport',
    'ts_udpport',
    'ts_login',
    'ts_password',
    'ts_timeout',
    'ts_cron_interval',
  ],
  universe: [
    'uni_name',
    'lang',
    'game_speed',
    'fleet_speed',
    'resource_multiplier',
    'storage_multiplier',
    'halt_speed',
    'energySpeed',
    'forum_url',
    'game_disable',
    'close_reason',
  ],
  queqe: ['max_elements_build', 'max_elements_tech', 'max_elements_ships', 'max_fleet_per_build'],
  referral: ['ref_active', 'ref_bonus', 'ref_minpoints', 'ref_max_referals'],
  colonization: ['min_player_planets', 'planets_tech', 'planets_officier', 'planets_per_tech'],
  start: [
    'metal_start',
    'crystal_start',
    'deuterium_start',
    'darkmatter_start',
    'initial_fields',
    'metal_basic_income',
    'crystal_basic_income',
    'deuterium_basic_income',
  ],
  other: [
    'min_build_time',
    'reg_closed',
    'user_valid',
    'adm_attack',
    'debug',
    'Fleet_Cdr',
    'Defs_Cdr',
    'max_galaxy',
    'max_system',
    'max_planets',
    'planet_factor',
    'max_overflow',
    'moon_factor',
    'moon_chance',
    'deuterium_cost_galaxy',
    'cost_trader',
    'factor_university',
    'max_fleets_per_acs',
    'silo_factor',
    'vmode_min_time',
    'gate_wait_time',
    'debris_moon',
    'noobprotection',
    'noobprotectiontime',
    'noobprotectionmulti',
    'max_dm_missions',
    'alliance_create_min_points',
  ],
  merchant: ['trade_allowed_ships', 'trade_charge'],
  news: ['OverviewNewsFrame', 'OverviewNewsText'],
  stat: ['stat_settings', 'stat', 'stat_level'],
  facebook: ['fb_on', 'fb_apikey', 'fb_skey'],
  contacts: ['disclamerAddress', 'disclamerPhone', 'disclamerMail', 'disclamerNotice'],
}

export const CONFIG_UNI_VALUES: Readonly<Record<string, string>> = {
  game_name: 'Nova',
  timezone: 'UTC',
  uni_name: 'Nova 1',
  game_speed: '2',
}

export const CONFIG_UNI_BODY: string = [
  '<main role="main"><form action="" method="post">',
  '<input type="hidden" name="opt_save" value="1">',
  '<div class="card"><div class="card-body">',
  '<ul class="nav nav-pills" id="pills-tab">',
  ...Object.keys(CONFIG_UNI_FIELDS).map((section) => configUniTab(section, section)),
  '</ul><div class="tab-content" id="pills-tabContent">',
  ...Object.entries(CONFIG_UNI_FIELDS).map(([section, fields]) =>
    configUniPane(
      section,
      fields.map((name) => configUniSettingRow(name, CONFIG_UNI_VALUES[name] ?? '')).join(''),
    ),
  ),
  '</div></div></div></form></main>',
].join('')

export const QUICK_EDITOR_PLAYER_VALUES: Readonly<Record<string, string>> = {
  spy_tech: '1',
  computer_tech: '2',
  military_tech: '3',
  defence_tech: '4',
  shield_tech: '5',
  energy_tech: '6',
  hyperspace_tech: '3',
  combustion_tech: '8',
  impulse_motor_tech: '9',
  hyperspace_motor_tech: '10',
  laser_tech: '11',
  ionic_tech: '12',
  buster_tech: '13',
  intergalactic_tech: '14',
  expedition_tech: '15',
  metal_proc_tech: '16',
  crystal_proc_tech: '17',
  deuterium_proc_tech: '18',
  graviton_tech: '19',
  rpg_geologue: '1',
  rpg_amiral: '21',
  rpg_ingenieur: '22',
  rpg_technocrate: '23',
  rpg_constructeur: '24',
  rpg_scientifique: '25',
  rpg_stockeur: '26',
  rpg_defenseur: '27',
  rpg_bunker: '28',
  rpg_espion: '29',
  rpg_commandant: '30',
  rpg_destructeur: '31',
  rpg_general: '32',
  rpg_raideur: '33',
  rpg_empereur: '34',
  name: 'Nova',
  darkmatter: '500',
}

const QUICK_EDITOR_SHARED_BODY_VALUES: Readonly<Record<string, string>> = {
  robot_factory: '7',
  hangar: '9',
  metal_store: '10',
  crystal_store: '11',
  deuterium_store: '12',
  small_ship_cargo: '4',
  big_ship_cargo: '22',
  light_hunter: '23',
  heavy_hunter: '24',
  crusher: '25',
  battle_ship: '26',
  colonizer: '27',
  recycler: '28',
  spy_sonde: '29',
  bomber_ship: '30',
  solar_satelit: '31',
  destructor: '32',
  dearth_star: '33',
  battleship: '34',
  lune_noir: '35',
  ev_transporter: '36',
  star_crasher: '37',
  giga_recykler: '38',
  dm_ship: '39',
  bs_class_oneil: '40',
  flying_death: '41',
  scrappy: '42',
  M19: '43',
  galleon: '44',
  destroyer: '45',
  frigate: '46',
  black_wanderer: '47',
  M7: '48',
  M32: '49',
  torpedo: '50',
  cog: '51',
  scout: '52',
  fury: '53',
  guardian: '54',
  cutter: '55',
  brigantine: '56',
  raptor: '57',
  aircraft: '58',
  ranger: '59',
  reaver: '60',
  phoenix: '61',
  hawk: '62',
  brig: '63',
  defender: '64',
  dreadnought: '65',
  galleass: '66',
  ketch: '67',
  titan: '68',
  typhoon: '69',
  orion: '70',
  mirage: '71',
  flute: '72',
  knarr: '73',
  avenger: '74',
  hammer: '75',
  poleaxe: '76',
  erehon: '77',
  isis: '78',
  iron: '79',
  corvette: '80',
  thunder: '81',
  hunter: '82',
  leviathan: '83',
  bunyip: '84',
  dragon: '85',
  predator: '86',
  misil_launcher: '20',
  small_laser: '88',
  big_laser: '89',
  gauss_canyon: '90',
  ionic_canyon: '91',
  buster_canyon: '92',
  small_protection_shield: '93',
  big_protection_shield: '94',
  planet_protector: '95',
  graviton_canyon: '96',
  orbital_station: '97',
  lepton_gun: '98',
  proton_gun: '99',
  canyon: '100',
  quantum_gun: '101',
  hydrogen_gun: '102',
  dora_gun: '103',
  photon_cannon: '104',
  particle_emitter: '105',
  slim_mehador: '106',
  iron_mehador: '107',
  grand_mehador: '108',
  landing: '109',
  rocket: '110',
  charybdis: '111',
  uranus: '112',
  achilles: '113',
  phaser: '114',
  armageddon: '115',
  sphinx: '116',
  wyvern: '117',
  icarus: '118',
  griffin: '119',
  squadron: '120',
  neon: '121',
  torpedos: '122',
  palatine: '123',
  installation: '124',
  atlantis: '125',
  orbital_met: '126',
  orbital_cry: '127',
  orbital_det: '128',
  galactic: '129',
  orlan: '130',
  vector: '131',
  agat: '132',
  lightning: '133',
  volcano: '134',
  typhon: '135',
  cerberus: '136',
  grad: '137',
  starfall: '138',
  robot: '139',
  droid: '140',
  flame: '141',
  spotlight: '142',
  kraken: '143',
  hydra: '144',
  panzer: '145',
  cthulhu: '146',
  metal: '1000',
  crystal: '500',
  deuterium: '0',
}

export const QUICK_EDITOR_PLANET_VALUES: Readonly<Record<string, string>> = {
  ...QUICK_EDITOR_SHARED_BODY_VALUES,
  metal_mine: '12',
  crystal_mine: '2',
  deuterium_sintetizer: '3',
  solar_plant: '4',
  university: '5',
  fusion_plant: '6',
  nano_factory: '8',
  laboratory: '13',
  terraformer: '14',
  ally_deposit: '15',
  silo: '16',
  resource_module: '17',
  defensive_module: '18',
  military_module: '19',
  research_module: '20',
  name: 'Homeworld',
  field_max: '200',
}

export const QUICK_EDITOR_MOON_VALUES: Readonly<Record<string, string>> = {
  ...QUICK_EDITOR_SHARED_BODY_VALUES,
  mondbasis: '2',
  phalanx: '7',
  sprungtor: '8',
  name: 'Luna',
  field_max: '12',
}

function quickEditorBody(values: Readonly<Record<string, string>>, playerControls = false): string {
  return [
    '<main role="main"><form method="post" id="userform" action="">',
    ...Object.entries(values).map(
      ([name, value]) => '<input name="' + name + '" type="text" value="' + value + '">',
    ),
    ...(playerControls
      ? [
          '<input name="password" type="password" value="">',
          '<select name="multi"><option value="0">No</option><option value="1" selected>Yes</option></select>',
        ]
      : []),
    '<input type="submit" value="Submit"></form></main>',
  ].join('')
}

export const QUICK_EDITOR_PLAYER_BODY: string = quickEditorBody(QUICK_EDITOR_PLAYER_VALUES, true)
export const QUICK_EDITOR_RESTRICTED_PLAYER_BODY: string = quickEditorBody(
  QUICK_EDITOR_PLAYER_VALUES,
)
export const QUICK_EDITOR_PLANET_BODY: string = quickEditorBody(QUICK_EDITOR_PLANET_VALUES)
export const QUICK_EDITOR_MOON_BODY: string = quickEditorBody(QUICK_EDITOR_MOON_VALUES)

export function searchUserRow(id: number, name: string): string {
  return [
    '<tr>',
    `<td>${id}</td>`,
    `<td>${name}</td>`,
    `<td>${name.toLowerCase()}@example.com</td>`,
    '<td>01.01.2026 10:00:00</td>',
    '<td>01.01.2025 10:00:00</td>',
    '<td>10.0.0.1</td>',
    '<td>Administrator</td>',
    '<td><font color=lime>No</font></td>',
    '<td>No</td>',
    `<td><a href="javascript:openEdit('${id}', 'player');" border="0">` +
      `<img title="${name}" src="./styles/resource/images/admin/GO.png"></a></d>`,
    `<td><a href="?page=search&amp;delete=user&amp;user=${id}" border="0" ` +
      `onclick="return confirm('Delete ${name}?');">` +
      '<img src="./styles/resource/images/alliance/CLOSE.png" width="16" height="16" title=' +
      `${name}></a></td>`,
    '</tr>',
  ].join('')
}

export function searchPlanetRow(id: number, name: string): string {
  return [
    '<tr>',
    `<td>${id}</td>`,
    `<td>${name}</td>`,
    '<td>Nova (ID:&nbsp;7)</td>',
    '<td>5 minutes</td>',
    '<td>1</td>',
    '<td>2</td>',
    '<td>3</td>',
    '<td><font color=lime>Yes</font></td>',
    `<td><a href="javascript:openEdit('${id}', 'planet');" border="0">` +
      '<img src="./styles/resource/images/admin/GO.png" title=Edit></a></td>',
    `<td><a href="?page=search&amp;delete=planet&amp;planet=${id}" border="0" ` +
      `onclick="return confirm('Delete ${name}?');">` +
      '<img src="./styles/resource/images/alliance/CLOSE.png" width="16" height="16" title=Delete>' +
      '</a></td>',
    '</tr>',
  ].join('')
}

const SEARCH_PAGES_TABLES =
  '<table class="table table-dark table-hover"></table>' +
  '<table class="table table-dark table-hover"></table>'

export function searchFilter(term: string, error?: string): string {
  return [
    '<div id="seeker">',
    '<table class="table table-dark">',
    '<thead>',
    '<tr>',
    '<th>Search</th><th>Type</th><th>Search in</th><th>Filter</th><th>Limit</th><th>Order</th>',
    '<th>Sort by</th><th></th>',
    '</tr>',
    '</thead>',
    '<tbody>',
    '<tr>',
    `<td><input type="text" name="key_user" value="${term}" class="form-control"></td>`,
    '<td><select name="search" class="form-control">',
    '<option value="users" selected="selected">Users</option>',
    '<option value="planet">Planets</option>',
    '<option value="alliance">Alliances</option>',
    '</select></td>',
    '<td><select name="search_in" class="form-control">',
    '<option value="name" selected="selected">Name</option>',
    '<option value="id">ID</option>',
    '</select></td>',

    '<td><select name="fucki" class="form-control">',
    '<option value="normal" selected="selected">Anywhere</option>',
    '<option value="exacto">Exact</option>',
    '</select></td>',
    '<td><select name="limit" class="form-control">',
    '<option value="25" selected="selected">25</option>',
    '<option value="50">50</option>',
    '</select></td>',
    '<td><select name="key_acc" class="form-control">',
    '<option value="ASC" selected="selected">Ascending</option>',
    '<option value="DESC">Descending</option>',
    '</select></td>',
    '<td><select name="key_order" class="form-control">',
    '<option value="id" selected="selected">ID</option>',
    '<option value="username">Name</option>',
    '</select></td>',
    '<td><input class="btn btn-primary" type="submit" value="Search"></td>',
    '</tr>',
    error === undefined ? '' : `<div class="alert alert-primary" role="alert">${error}</div>`,
    '</tbody>',
    '</table>',
    SEARCH_PAGES_TABLES,
    '</div>',
  ].join('')
}

export function searchList(rows: string[], total: string): string {
  return [
    '<table class="table table-dark table-hover">',
    '<tr><th>ID</th><th>Name</th><th>Email</th><th>Online</th><th>Registered</th><th>IP</th>',
    '<th>Level</th><th>Banned</th><th>Vacation</th><th>Info</th><th>Delete</th></tr>',
    rows.join(''),
    `<tr><td colspan="20">Matching records: <font color=lime>${total}</font></td></tr>`,
    '</table>',
  ].join('')
}

export const SEARCH_EMPTY_LIST: string = [
  "<br><table border='0px' style='background:url(images/Adm/blank.gif);' width='90%'>",
  "<div class='alert alert-primary' role='alert'>No data found</div>",
  '</table>',
].join('')

export function searchBody(options: { term: string; error?: string; list: string }): string {
  return [
    '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
    '<form action="" method="POST">',
    '<div class="card mb-3">',
    '<h5 class="card-header">Search</h5>',
    '<div class="card-body">',
    searchFilter(options.term, options.error),
    options.list,
    '</div>',
    '</div>',
    '</form>',
    '</main>',
  ].join('')
}

export const SEARCH_RESULTS_BODY: string = searchBody({
  term: 'Nova',
  list: searchList([searchUserRow(7, 'Nova'), searchUserRow(9, 'Vega')], '2'),
})

export const SEARCH_PLANET_RESULTS_BODY: string = searchBody({
  term: 'Homeworld',
  list: searchList([searchPlanetRow(1234, 'Homeworld')], '1'),
})

export const SEARCH_EMPTY_RESULT_BODY: string = searchBody({
  term: 'Nobody',
  list: SEARCH_EMPTY_LIST,
})

export const SEARCH_BLANK_TERM_BODY: string = searchBody({
  term: '',
  list: SEARCH_EMPTY_LIST,
})

export const SEARCH_RESULTS_WITHOUT_CONTROLS_BODY: string = searchBody({
  term: 'Nova',
  list: [
    '<table class="table table-dark table-hover">',
    '<tr><th>ID</th><th>Name</th></tr>',
    '<tr><td>7</td><td>Nova</td></tr>',
    '<tr><td colspan="20">Matching records: <font color=lime>1</font></td></tr>',
    '</table>',
  ].join(''),
})

export const SEARCH_RESULTS_WITH_TRUNCATED_EDIT_BODY: string = searchBody({
  term: 'Nova',
  list: searchList(
    [
      searchUserRow(7, 'Nova').replace(
        "javascript:openEdit('7', 'player');",
        "javascript:openEdit('7');",
      ),
    ],
    '1',
  ),
})

export const SEARCH_RESULTS_WITH_FOREIGN_DELETE_BODY: string = searchBody({
  term: 'Nova',
  list: searchList(
    [searchUserRow(7, 'Nova').replace('delete=user&amp;user=7', 'delete=moon&amp;moon=77')],
    '1',
  ),
})

export const SEARCH_RESULTS_WITH_UNREADABLE_DELETE_BODY: string = searchBody({
  term: 'Nova',
  list: searchList(
    [searchUserRow(7, 'Nova').replace('delete=user&amp;user=7', 'delete=user&amp;user=')],
    '1',
  ),
})

export const SEARCH_RESULTS_WITHOUT_TOTAL_BODY: string = searchBody({
  term: 'Nova',
  list: [
    '<table class="table table-dark table-hover">',
    '<tr><th>ID</th><th>Name</th></tr>',
    '<tr><td>7</td><td>Nova</td></tr>',
    '<tr><td colspan="20">Matching records: some</td></tr>',
    '</table>',
  ].join(''),
})

export function passwordBody(text: string, hash: string): string {
  return [
    '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
    '<div class="card mb-3">',
    '<h5 class="card-header">Password tool</h5>',
    '<div class="card-body">',
    '<p class="card-text">',
    '<form method="post" action="">',
    '<div class="form-group">',
    '<label for="md5q">Text</label>',
    `<input class="form-control" type="text" name="md5q" size="80" value="${text}" id="md5q">`,
    '</div>',
    '<div class="form-group">',
    '<label for="pass">Stored form</label>',
    `<input class="form-control" type="text" name="md5w" size="80" value="${hash}" id="pass">`,
    '</div>',
    '<button class="btn btn-primary btn-lg btn-block" type="submit" value="Encrypt">Encrypt</button>',
    '</form>',
    '</p>',
    '</div>',
    '</div>',
    '</main>',
  ].join('')
}

export const PASSWORD_BLANK_BODY: string = passwordBody('', '')
