export function adminNoticeCard(message: string): string {
  return [
    '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
    '<div class="card mb-3">',
    '<h5 class="card-header">fcm_info</h5>',
    '<div class="card-body">',
    `<p class="card-text">${message}</p>`,
    '</div>',
    '</div>',
    '</main>',
  ].join('')
}

const MODULE_HEADER =
  '<thead><tr><th>mod_id</th><th>mod_name</th><th>mod_status</th><th>mod_value</th></tr></thead>'

function moduleRow(module: { id: number; name: string; active: boolean }): string {
  const flip = module.active ? 'deaktiv' : 'aktiv'
  const state = module.active ? 'status_active' : 'status_deactive'
  return [
    '<tr>',
    `<td>${module.id}</td>`,
    `<td>${module.name}</td>`,
    `<td><b>${state}</b></td>`,
    `<td><a href="?page=module&amp;act=${flip}&amp;id=${module.id}">button</a></td>`,
    '</tr>',
  ].join('')
}

export function adminModuleTable(
  modules: readonly { id: number; name: string; active: boolean }[],
): string {
  return [
    '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
    '<div class="card mb-3">',
    '<h5 class="card-header">lm_module</h5>',
    '<div class="card-body">',
    '<table class="table table-dark table-hover">',
    MODULE_HEADER,
    '<tbody>',
    ...modules.map(moduleRow),
    '</tbody>',
    '</table>',
    '</div>',
    '</div>',
    '</main>',
  ].join('')
}

export const RESET_CONTROLS: readonly (readonly [string, string])[] = [
  ['players', 're_reset_player'],
  ['planets', 're_reset_planets'],
  ['moons', 're_reset_moons'],
  ['defenses', 're_defenses'],
  ['ships', 're_ships'],
  ['h_d', 're_reset_hangar'],
  ['edif_p', 're_buildings_pl'],
  ['edif_l', 're_buildings_lu'],
  ['edif', 're_reset_buldings'],
  ['ofis', 're_ofici'],
  ['inves', 're_investigations'],
  ['inves_c', 're_reset_invest'],
  ['dark', 're_resources_dark'],
  ['resources', 're_resources_met_cry'],
  ['notes', 're_reset_notes'],
  ['rw', 're_reset_rw'],
  ['friends', 're_reset_buddies'],
  ['alliances', 're_reset_allys'],
  ['fleets', 're_reset_fleets'],
  ['errors', 're_reset_errors'],
  ['banneds', 're_reset_banned'],
  ['messages', 're_reset_messages'],
  ['statpoints', 're_reset_statpoints'],
  ['resetall', 're_reset_all'],
]

export function adminResetForm(
  controls: readonly (readonly [string, string])[] = RESET_CONTROLS,
): string {
  return [
    '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
    '<div class="card mb-3">',
    '<h5 class="card-header">lm_reset</h5>',
    '<div class="card-body">',
    '<form action="" method="post" onsubmit="return confirm(\'re_reset_universe_confirmation\');">',
    '<table class="table table-dark table-hover">',
    '<tbody>',
    ...controls.map(([name, label]) =>
      [
        '<tr>',
        `<td><label class="form-check-label" for="${name}">${label}</label></td>`,
        `<td><input type="checkbox" name="${name}" id="${name}"></td>`,
        '</tr>',
      ].join(''),
    ),
    '</tbody>',
    '</table>',
    '<input class="btn btn-primary" type="submit" value="button_reset">',
    '</form>',
    '</div>',
    '</div>',
    '</main>',
  ].join('')
}

function selectOptionsMarkup(
  name: string,
  id: string,
  options: readonly (readonly [string, string])[],
): string {
  return [
    `<select class="form-control" id="${id}" name="${name}">`,
    ...options.map(([value, label]) => `<option value="${value}">${label}</option>`),
    '</select>',
  ].join('')
}

export function adminSendMessagesForm(
  channels: readonly (readonly [string, string])[],
  languages: readonly (readonly [string, string])[],
): string {
  return [
    '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
    '<div class="card mb-3">',
    '<h5 class="card-header">lm_sendmessages</h5>',
    '<div class="card-body">',
    '<form name="message" id="message" action="admin.php?page=sendMessages&action=send&ajax=1">',
    `<div class="form-group"><label for="1">ma_mode</label>${selectOptionsMarkup('key', '1', channels)}</div>`,
    `<div class="form-group"><label for="2">cu_lang</label>${selectOptionsMarkup('globalmessagelang', '2', languages)}</div>`,
    '<div class="form-group"><label for="subject">ma_mode</label>',
    '<input value="ma_none" name="subject" size="40" maxlength="40" type="text" class="form-control" id="subject"></div>',
    '<div class="form-group"><label for="text">ma_message</label>',
    '<textarea name="text" id="text" cols="40" rows="10" class="form-control"></textarea></div>',
    '<button type="button" onclick="check();" class="btn btn-primary">button_submit</button>',
    '</form>',
    '</div>',
    '</div>',
    '</main>',
  ].join('')
}

type MessageListRow = {
  id: number

  kind?: string
  time: string
  sender: string
  receiver: string
  subject: string

  deleted?: boolean
  text: string
}

export function adminMessageList(body: {
  selectedType: string

  categories: readonly (readonly [string, string])[]

  type: number

  side?: number

  pageCount?: number
  rows: readonly MessageListRow[]
}): string {
  const wide = body.type === 100
  const columns = wide ? 6 : 5
  const pagination = [
    'mg_page: ',
    ...(body.pageCount === undefined
      ? []
      : Array.from({ length: body.pageCount }, (_value, index) => index + 1).map(
          (site) => `<a href="#" onclick="gotoPage(${site});return false;">[${site}]</a>`,
        )),
  ].join('')
  const row = (entry: MessageListRow): string =>
    [
      `<tr data-messageID="${entry.id}">`,
      `<td><a href="#" class="toggle">${entry.id}</a></td>`,
      ...(wide ? [`<td><a href="#" class="toggle">${entry.kind ?? ''}</a></td>`] : []),
      `<td><a href="#" class="toggle">${entry.time}</a></td>`,
      `<td><a href="#" class="toggle">${entry.sender}</a></td>`,
      `<td><a href="#" class="toggle">${entry.receiver}</a></td>`,
      `<td><a href="#" class="toggle">${entry.subject}${
        entry.deleted === true
          ? '&nbsp;<img src="./styles/resource/images/admin/i.gif" width="16" height="16" alt="" class="tooltip" data-tooltip-content="ml_deleted">'
          : ''
      }</a></td>`,
      '</tr>',
      `<tr id="contentID${entry.id}" style="display:none;">`,
      `<td class="left" colspan="${columns}" style="padding:5px 8px;">${entry.text}</td>`,
      '</tr>',
    ].join('')
  return [
    '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
    '<div class="card mb-3">',
    '<h5 class="card-header">lm_messagelist</h5>',
    '<div class="card-body">',
    '<form action="admin.php?page=messageList" method="post" id="form">',
    ...(body.side === undefined
      ? []
      : [`<input type="hidden" name="side" value="${body.side}" id="side">`]),
    '<table class="table table-dark table-hover">',
    '<thead>',
    '<tr><th><label for="type">ml_type</label></th><th>',
    '<select name="type" class="form-control" id="type">',
    ...body.categories.map(
      ([value, label]) =>
        `<option value="${value}"${value === body.selectedType ? ' selected="selected"' : ''}>${label}</option>`,
    ),
    '</select></th>',
    '<th>ml_date_range</th>',
    '<th><input placeholder="dd" value="" type="text" id="dateStartDay" name="dateStart[day]" class="form-control">',
    '<input placeholder="mm" value="" type="text" id="dateStartMonth" name="dateStart[month]" class="form-control">',
    '<input placeholder="yyyy" value="" type="text" id="dateStartYear" name="dateStart[year]" class="form-control"></th>',
    '<th><input placeholder="dd" value="" type="text" id="dateEndDay" name="dateEnd[day]" class="form-control">',
    '<input placeholder="mm" value="" type="text" id="dateEndMonth" name="dateEnd[month]" class="form-control">',
    '<input placeholder="yyyy" value="" type="text" id="dateEndYear" name="dateEnd[year]" class="form-control"></th></tr>',
    '<tr><th><label for="sender">ml_sender</label></th>',
    '<th><input type="text" id="sender" name="sender" value="" class="form-control"></th>',
    '<th><label for="receiver">ml_receiver</label></th>',
    '<th colspan="2"><input type="text" id="receiver" name="receiver" value="" class="form-control"></th></tr>',
    '</thead>',
    '</table>',
    '<input class="btn btn-primary mb-3" type="submit" value="button_proceed">',
    '<table class="table table-dark table-hover">',
    '<thead>',
    `<tr><th class="right" colspan="${columns}">${pagination}</th></tr>`,
    `<tr><th>input_id</th>${wide ? '<th>ml_type</th>' : ''}<th>ml_date</th><th>ml_sender</th><th>ml_receiver</th><th>ml_subject</th></tr>`,
    '</thead>',
    '<tbody>',
    ...body.rows.map(row),
    '</tbody>',
    '</table>',
    '</form>',
    '</div>',
    '</div>',
    '</main>',
  ].join('')
}

export const ADMIN_LOG_MENU_BODY: string = [
  '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
  '<div class="album"><div class="row">',
  ...[
    ['planet', 'log_planet'],
    ['player', 'log_player'],
    ['settings', 'log_settings'],
    ['present', 'log_present'],
  ].map(([type, title]) =>
    [
      '<div class="col-md-6"><div class="card mb-4 shadow-sm">',
      '<div class="card-body">',
      `<h5 class="card-title">${title}</h5>`,
      `<p class="card-text overflow-auto">${title}_text</p>`,
      `<div style="text-align: right"><a href="?page=log&amp;type=${type}">`,
      '<button type="button" class="btn btn-primary">button_proceed</button></a></div>',
      '</div></div></div>',
    ].join(''),
  ),

  '<div class="col-md-6"><div class="card mb-4 shadow-sm"><div class="card-body">',
  '<h5 class="card-title">log_unknown</h5>',
  '<a href="?page=log&amp;type=unknown"><button type="button">button_proceed</button></a>',
  '</div></div></div>',
  '<div class="col-md-6"><div class="card mb-4 shadow-sm"><div class="card-body">',
  '<h5 class="card-title">log_untyped</h5>',
  '<a href="?page=log"><button type="button">button_proceed</button></a>',
  '</div></div></div>',
  '<div class="col-md-6"><div class="card mb-4 shadow-sm"><div class="card-body">',
  '<h5 class="card-title">log_plain</h5>',
  '</div></div></div>',
  '</div></div>',
  '</main>',
].join('')

type LogListRow = {
  id: number
  admin: string
  universe: string
  target: string
  atText: string
}

export function adminLogList(rows: readonly LogListRow[]): string {
  return [
    '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
    '<div class="card mb-3">',
    '<h5 class="card-header">lm_log</h5>',
    '<div class="card-body">',
    '<table class="table table-dark table-hover mb-3">',
    '<thead><tr><th>input_id</th><th>log_admin</th><th>log_universe</th><th>log_target</th>',
    '<th>log_time</th><th>log_log</th></tr></thead>',
    '<tbody>',
    ...rows.map((entry) =>
      [
        '<tr>',
        `<td>${entry.id}</td>`,
        `<td>${entry.admin}</td>`,
        `<td>${entry.universe}</td>`,
        `<td>${entry.target}</td>`,
        `<td>${entry.atText}</td>`,
        `<td><a href='?page=log&type=detail&id=${entry.id}'>button_view</a></td>`,
        '</tr>',
      ].join(''),
    ),
    '</tbody>',
    '</table>',
    '</div>',
    '</div>',
    '</main>',
  ].join('')
}

export function adminLogDetail(body: {
  admin: string
  universe: string
  atText: string
  changes: readonly { element: string; before: string; after: string }[]
}): string {
  return [
    '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
    '<div class="card mb-3">',
    '<h5 class="card-header">lm_log</h5>',
    '<div class="card-body">',
    '<table class="table table-dark table-hover mb-3">',
    '<thead><tr><th>log_admin</th><th>log_universe</th><th>log_time</th></tr></thead>',
    `<tbody><tr><td>${body.admin}</td><td>${body.universe}</td><td>${body.atText}</td></tr></tbody>`,
    '</table>',
    '<table class="table table-dark table-hover">',
    '<thead><tr><th>log_element</th><th>log_old</th><th>log_new</th></tr></thead>',
    '<tbody>',
    ...body.changes.map(
      (change) =>
        `<tr><td>${change.element}</td><td>${change.before}</td><td>${change.after}</td></tr>`,
    ),
    '</tbody>',
    '</table>',
    '</div>',
    '</div>',
    '</main>',
  ].join('')
}

export const ADMIN_CREATE_MENU_BODY: string = [
  '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
  '<div class="album"><div class="row">',
  ...[
    ['user', 'cr_header_user'],
    ['planet', 'cr_header_planet'],
    ['moon', 'cr_header_moon'],
  ].map(([kind, title]) =>
    [
      '<div class="col-md-4"><div class="card mb-4 shadow-sm">',
      '<div class="card-body">',
      `<h5 class="card-title">${title}</h5>`,
      `<p class="card-text overflow-auto">${title}_text</p>`,
      `<div style="text-align: right"><a href="?page=create&amp;class=${kind}">`,
      '<button type="button" class="btn btn-primary">button_proceed</button></a></div>',
      '</div></div></div>',
    ].join(''),
  ),

  '<div class="col-md-4"><div class="card mb-4 shadow-sm"><div class="card-body">',
  '<h5 class="card-title">cr_header_unknown</h5>',
  '<a href="?page=create&amp;class=unknown"><button type="button">button_proceed</button></a>',
  '</div></div></div>',
  '<div class="col-md-4"><div class="card mb-4 shadow-sm"><div class="card-body">',
  '<h5 class="card-title">cr_header_unclassed</h5>',
  '<a href="?page=create"><button type="button">button_proceed</button></a>',
  '</div></div></div>',
  '</div></div>',
  '</main>',
].join('')

type CreateField = { label: string; control: string }

function createForm(fields: readonly CreateField[]): string {
  return [
    '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
    '<div class="card mb-3">',
    '<h5 class="card-header">lm_create</h5>',
    '<div class="card-body">',
    '<form action="" method="post">',
    ...fields.map(
      (field) => `<div class="form-group"><label>${field.label}</label>${field.control}</div>`,
    ),
    '<input class="btn btn-primary" type="submit" value="button_add">',
    '</form>',
    '</div>',
    '</div>',
    '</main>',
  ].join('')
}

const COORDINATE_GROUP = [
  '<div class="input-group">',
  '<input type="text" name="galaxy" class="form-control" id="coord">',
  '<input type="text" name="system" class="form-control">',
  '<input type="text" name="planet" class="form-control">',
  '</div>',
].join('')

export const ADMIN_CREATE_USER_BODY: string = createForm([
  { label: 'cr_new_name', control: '<input type="text" name="name" class="form-control">' },
  {
    label: 'cr_new_pass_1',
    control: '<input type="password" name="password" class="form-control">',
  },
  {
    label: 'cr_new_pass_2',
    control: '<input type="password" name="password2" class="form-control">',
  },
  { label: 'cr_new_email_1', control: '<input type="text" name="email" class="form-control">' },
  { label: 'cr_new_email_2', control: '<input type="text" name="email2" class="form-control">' },
  {
    label: 'cr_new_range',
    control:
      '<select name="authlevel" class="form-control"><option value="1">1</option><option value="3">3</option></select>',
  },
  {
    label: 'cr_new_lang',
    control:
      '<select name="lang" class="form-control"><option value="en">English</option><option value="de">German</option></select>',
  },
  { label: 'cr_new_coord', control: COORDINATE_GROUP },
])

export const ADMIN_CREATE_PLANET_BODY: string = createForm([
  { label: 'hidden', control: '<input type="hidden" name="class" value="agregar">' },
  { label: 'input_id_user', control: '<input name="id" type="text" class="form-control" id="id">' },
  { label: 'cr_new_coord', control: COORDINATE_GROUP },
  { label: 'cr_name_planet', control: '<input name="name" type="text" class="form-control">' },
  { label: 'cr_fields_max', control: '<input name="field_max" type="text" class="form-control">' },
])

export const ADMIN_CREATE_MOON_BODY: string = createForm([
  { label: 'hidden', control: '<input type="hidden" name="class" value="agregar">' },
  {
    label: 'input_id_planet',
    control: '<input type="text" name="add_moon" class="form-control" id="add_moon">',
  },
  {
    label: 'cr_moon_name',
    control: '<input type="text" value="cr_mo_moon" name="name" class="form-control" id="name">',
  },
  {
    label: 'cr_diameter',
    control: '<input type="text" name="diameter" class="form-control" id="diameter">',
  },
  {
    label: 'cr_moon_random',
    control:
      '<input type="checkbox" checked="checked" name="diameter_check" class="form-check-input" id="diameter_check">',
  },
  { label: 'cr_fields_max', control: '<input type="text" name="field_max" class="form-control">' },
])

type TicketRow = {
  id: number
  ownerName: string
  subject: string

  replies: string
  openedAtText: string
  status: 'open' | 'answered' | 'closed'
}

function ticketRow(entry: TicketRow): string {
  const link = `admin.php?page=support&amp;mode=view&amp;id=${entry.id}`
  const status =
    entry.status === 'answered'
      ? '<span style="color:orange">ti_status_answer</span>'
      : entry.status === 'open'
        ? '<span style="color:green">ti_status_open</span>'
        : '<span style="color:red">ti_status_closed</span>'
  return [
    '<tr>',
    `<td><a href="${link}">#${entry.id}</a></td>`,
    `<td><a href="${link}">${entry.ownerName}</a></td>`,
    `<td><a href="${link}">${entry.subject}</a></td>`,
    `<td>${entry.replies}</td>`,
    `<td>${entry.openedAtText}</td>`,
    `<td>${status}</td>`,
    '</tr>',
  ].join('')
}

export function adminTicketList(tickets: readonly TicketRow[]): string {
  const header =
    '<thead><tr><th>ti_id</th><th>ti_username</th><th>ti_subject</th><th>ti_answers</th>' +
    '<th>ti_date</th><th>ti_status</th></tr></thead>'
  return [
    '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
    '<div class="card mb-3">',
    '<h5 class="card-header">lm_support</h5>',
    '<div class="card-body">',
    '<table class="table table-dark table-hover">',
    header,
    '<tbody>',
    ...tickets.filter((entry) => entry.status !== 'closed').map(ticketRow),
    '</tbody>',
    header,
    '<tbody>',
    ...tickets.filter((entry) => entry.status === 'closed').map(ticketRow),
    '</tbody>',
    '</table>',
    '</div>',
    '</div>',
    '</main>',
  ].join('')
}

type TicketReply = {
  subject: string
  category: string
  message: string

  byline: string
}

export function adminTicketView(body: {
  ticketId?: number
  statusLabel: string
  replies: readonly TicketReply[]
}): string {
  return [
    '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
    '<form action="admin.php?page=support&mode=send" method="post" id="form">',
    ...(body.ticketId === undefined
      ? []
      : [`<input type="hidden" name="id" value="${body.ticketId}">`]),
    '<div class="card mb-3">',
    '<h5 class="card-header"><a href="admin.php?page=support">lm_support</a></h5>',
    '<div class="card-body">',
    ...body.replies.map((reply) =>
      [
        '<div class="media">',
        '<img style="width:64px" src="../styles/resource/images/install/poster.jpg" class="mr-3" alt="...">',
        '<div class="media-body">',
        `<h5 class="mt-0">${reply.subject} ${reply.category}</h5>`,
        reply.message,
        `<p><small class="text-muted">${reply.byline}</small></p>`,
        '</div>',
        '</div>',
      ].join(''),
    ),
    '<div class="form-group"><label for="message">ti_answer</label>',
    '<textarea class="form-control validate[required]" id="message" name="message" row="60" cols="8"></textarea></div>',
    '<div class="form-group form-check">',
    '<input type="checkbox" class="form-check-input" name="change_status" value="1" id="Check">',
    `<label class="form-check-label" for="Check">${body.statusLabel}</label></div>`,
    '<button type="submit" class="btn btn-primary">ti_submit</button>',
    '</div>',
    '</div>',
    '</form>',
    '</main>',
  ].join('')
}

export const ADMIN_LOGOUT_NOTICE_BODY: string = [
  '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
  '<div class="card mb-3">',
  '<h5 class="card-header">lo_title</h5>',
  '<div class="card-body">',
  '<p class="card-text">lo_notify <br><a href="./game.php">lo_continue</a></p>',
  '</div>',
  '</div>',
  '</main>',
].join('')

export const ADMIN_LOGIN_CARD_BODY: string = [
  '<main role="main" class="container p-4">',
  '<div class="card mb-3">',
  '<h5 class="card-header">lm_login</h5>',
  '<div class="card-body">',
  '<form action="" method="POST">',
  '<input type="hidden" name="post" value="1">',
  '<div class="mb-3">',
  '<div class="form-group"><label for="username">ln_username</label>',
  '<input type="text" name="username" value="" class="form-control" id="username"></div>',
  '<div class="form-group"><label for="password">ln_password</label>',
  '<input type="password" name="admin_pw" value="" class="form-control" id="password"></div>',
  '</div>',
  '<button type="submit" name="next" class="btn btn-primary">button_proceed</button>',
  '</form>',
  '</div>',
  '</div>',
  '</main>',
].join('')
