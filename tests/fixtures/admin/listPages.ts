export function adminMessage(message: string): string {
  return [
    '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
    '    <div class="card mb-3">',
    '        <h5 class="card-header">Information</h5>',
    '        <div class="card-body">',
    `            <p class="card-text">${message}</p>`,
    '        </div>',
    '    </div>',
    '</main>',
  ].join('')
}

const BAN_CARD = `
        <div class="card mb-3">
            <h5 class="card-header">Ban</h5>
            <div class="card-body">
                <table class="table table-dark table-hover">
                    <thead>
                        <tr>
                            <th colspan="2">Change the ban on this account</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><label for="ban_name">Username</label></td>
                            <td><input name="ban_name" type="text" value="Cheater" class="form-control" id="ban_name"></td>
                        </tr>
                        <tr>
                            <td><label for="why">Reason</label></td>
                            <td>
                                <textarea id="why" class="form-control" name="why" maxlength="50" onkeyup="$('#result2').val(50 - parseInt($(this).val().length));">Cheating <tr><th>Ban ends</th><th height=25 colspan=2>01.02.2027 12:00:00</th></tr></textarea>
                            </td>
                        </tr>
                        <tr>
                            <td><label for="result2">Characters left</label></td>
                            <td><input class="form-control" id="result2" value="50" size="2" class="character"></td>
                        </tr>
                    </tbody>
                    <thead>
                        <tr>
                            <th colspan="2">Change the ban's end</th> <td class="c" width="18px"><img src="./styles/resource/images/admin/i.gif" class="tooltip" data-tooltip-content="The time left on the standing ban is added."></td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><label class="form-check-label" for="permanent">Permanent</label></td>
                            <td><input name="permanent" type="checkbox" class="form-check-input" id="permanent"></td>
                        </tr>
                        <tr>
                            <td><label for="days">Days</label></td>
                            <td><input name="days" type="text" value="0" class="form-control" id="days"></td>
                        </tr>
                        <tr>
                            <td><label for="hour">Hours</label></td>
                            <td><input name="hour" type="text" value="0" class="form-control" id="hour"></td>
                        </tr>
                        <tr>
                            <td><label for="mins">Minutes</label></td>
                            <td><input name="mins" type="text" value="0" class="form-control" id="mins"></td>
                        </tr>
                        <tr>
                            <td><label for="secs">Seconds</label></td>
                            <td><input name="secs" type="text" value="0" class="form-control" id="secs"></td>
                        </tr>
                    </tbody>
                    <thead>
                        <tr>
                            <th colspan="2">Vacation mode</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><label class="form-check-label" for="vacation">Put into vacation mode</label></td>
                            <td><input name="vacat" type="checkbox" class="form-check-input" id="vacation"></td>
                        </tr>
                    </tbody>
                </table>
                <input class="btn btn-primary" type="submit" value="Submit" name="bannow">
            </div>
        </div>
`

const BAN_VACATION_CARD = BAN_CARD.replace(
  '<input name="vacat" type="checkbox" class="form-check-input" id="vacation">',
  '<input name="vacat" type="checkbox" checked = "checked" class="form-check-input" id="vacation">',
)

const BAN_LISTS = `
    <div class="album">
        <div class="row">
            <div class="col-md-6">
                <div class="card mb-4 shadow-sm">
                    <h5 class="card-header">Ban an account</h5>
                    <div class="card-body">
                        <form action="" method="POST" name="users">
                            <select class="form-control mb-3" name="ban_name" size="10">
                                <option value="Cheater">Cheater&nbsp;&nbsp;(ID:&nbsp;7)Suspended</option>
                                <option value="Yaro">Yaro&nbsp;&nbsp;(ID:&nbsp;1)</option>
                            </select>
                            <script TYPE="text/javascript">
                                var UserList = new filterlist(document.getElementsByName('ban_name')[0]);
                            </script>
                            <div class="btn-group mb-3" role="group">
                                <a href="?page=ban">
                                    <button type="button" class="btn btn-secondary">Username</button>
                                </a>
                                <a href="?page=ban&amp;order=id">
                                    <button type="button" class="btn btn-secondary">ID</button>
                                </a>
                                <a href="?page=ban&amp;view=bana">
                                    <button type="button" class="btn btn-secondary">Suspended</button>
                                </a>
                            </div>
                            <input class="form-control mb-3" name="regexp" onKeyUp="UserList.set(this.value)">
                            <input class="btn btn-primary" type="submit" value="Ban" name="panel">
                        </form>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card mb-4 shadow-sm">
                    <h5 class="card-header">Lift a ban</h5>
                    <div class="card-body">
                        <form action="" method="POST" name="userban">
                            <select class="form-control mb-3" name="unban_name" size="10">
                                <option value="Cheater">Cheater&nbsp;&nbsp;(ID:&nbsp;7)</option>
                            </select>
                            <div class="btn-group mb-3" role="group">
                                <a href="?page=ban">
                                    <button type="button" class="btn btn-secondary">Username</button>
                                </a>
                                <a href="?page=ban&amp;order2=id">
                                    <button type="button" class="btn btn-secondary">ID</button>
                                </a>
                            </div>
                            <input class="form-control mb-3" name="regexp" onKeyUp="UsersBan.set(this.value)">
                            <input class="btn btn-primary" value="Lift" type="submit">
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
`

function banPage(card: string): string {
  return [
    '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
    '    <form action="" method="post" name="countt">',
    card,
    '    </form>',
    BAN_LISTS,
    '</main>',
  ].join('')
}

export const BAN_BODY: string = banPage(BAN_CARD)

export const BAN_VACATION_BODY: string = banPage(BAN_VACATION_CARD)

export const BAN_LIST_ONLY_BODY: string = banPage('')

export const BAN_LISTS_ONLY_BODY: string = [
  '<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">',
  BAN_LISTS,
  '</main>',
].join('')

function activeRow(
  id: number,
  name: string,
  email: string,
  ip: string,
  activation: string,
): string {
  return `
                    <tr>
                        <td>${id}</td>
                        <td>${name}</td>
                        <td><nobr>01.02.2026 10:00:00</nobr></td>
                        <td>${email}</td>
                        <td>${ip}</td>
                        <td><a href="#" onclick="${activation}">Activate</a></td>
                        <td><a href="?page=active&amp;action=delete&id=${id}" onclick="return confirm('Remove ${name}?');"><img border="0" src="./styles/resource/images/alliance/CLOSE.png" width="16" height="16"></a></td>
                    </tr>`
}

function activeSummary(sentence: string): string {
  return `
                    <tr>
                        <td colspan="8">${sentence}</td>
                    </tr>`
}

function activePage(rows: string, summary: string): string {
  return `
<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">
    <div class="card mb-3">
        <h5 class="card-header">Unconfirmed registrations</h5>
        <div class="card-body">
            <table class="table table-dark table-hover">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Date</th>
                        <th>Email</th>
                        <th>IP</th>
                        <th>Status</th>
                        <th>Delete</th>
                    </tr>
                </thead>
                <tbody>${rows}${summary}
                </tbody>
            </table>
        </div>
    </div>
</main>
`
}

export const ACTIVE_BODY: string = activePage(
  activeRow(17, 'Newcomer', 'newcomer@example.com', '10.0.0.7', "return activeUser(17,'k3y-17');") +
    activeRow(18, 'Recruit', 'recruit@example.com', '10.0.0.8', "return activeUser(18,'k3y-18');"),
  activeSummary('3 accounts are not activated'),
)

export const ACTIVE_NO_TOTAL_BODY: string = activePage(
  activeRow(18, 'Recruit', 'recruit@example.com', '10.0.0.8', "return activeUser(18,'k3y-18');"),
  activeSummary('1 of 2 accounts are not activated'),
)

export const ACTIVE_WITHOUT_SUMMARY_BODY: string = activePage(
  activeRow(18, 'Recruit', 'recruit@example.com', '10.0.0.8', "return activeUser(18,'k3y-18');"),
  '',
)

export const ACTIVE_WITHOUT_ACTIVATION_BODY: string = activePage(
  activeRow(19, 'Stranger', 'stranger@example.com', '10.0.0.9', 'return false;'),
  activeSummary('1 account is not activated'),
)

export const ACTIVE_WITH_EMPTY_KEY_BODY: string = activePage(
  activeRow(20, 'Nameless', 'nameless@example.com', '10.0.0.10', "return activeUser(20,'');"),
  activeSummary('1 account is not activated'),
)

function multiIpGroup(ip: string, accounts: string[]): string {
  return `
                    <tbody>
                        <tr>
                            <td rowspan="${accounts.length}">${ip}</td>
                            ${accounts.join('</tr><tr>')}
                        </tr>
                    </tbody>`
}

function multiIpAccount(
  id: number,
  name: string,
  email: string,
  action: 'known' | 'unknown',
): string {
  return `<td>${id}</td>
                            <td>${name}</td>
                            <td>${email}</td>
                            <td>01.02.2026 10:00:00</td>
                            <td>01.02.2026 11:00:00</td>
                            <td><a href="admin.php?page=multiip&amp;action=${action}&amp;id=${id}"><img src="styles/resource/images/true.png"></a></td>`
}

function multiIpPage(bodies: string): string {
  return `
<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">
    <div class="card mb-3">
        <h5 class="card-header">Shared addresses</h5>
        <div class="card-body">
            <table class="table table-dark">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Owner</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Registered</th>
                        <th>Last seen</th>
                        <th>Known</th>
                    </tr>
                </thead>${bodies}
            </table>
        </div>
    </div>
</main>
`
}

export const MULTI_IP_BODY: string = multiIpPage(
  multiIpGroup('10.0.0.1', [
    multiIpAccount(1, 'Yaro', 'yaro@example.com', 'known'),
    multiIpAccount(2, 'Cheater', 'cheater@example.com', 'unknown'),
  ]) + multiIpGroup('10.0.0.2', [multiIpAccount(3, 'Solo', 'solo@example.com', 'known')]),
)

export const MULTI_IP_EMPTY_BODY: string = multiIpPage('')

function fleetRow(fields: {
  id: number
  mission: string
  ships: string
  resources: string
  origin: string
  originPlanet: string
  arrival: string
  target: string
  targetPlanet: string
  hold: string
  lock: 0 | 1 | 2
  shipCount: string
  countCell?: string
}): string {
  const countCell =
    fields.countCell ??
    `<a href="#" data-tooltip-content="<table style='width:200px'>${fields.ships}</table>" class="tooltip">${fields.shipCount}&nbsp;(D)</a>`
  return `
                    <tr>
                        <td>${fields.id}</td>
                        <td><a href="#" data-tooltip-content="<table style='width:200px'>${fields.resources}</table>" class="tooltip">${fields.mission}&nbsp;(R)</a></td>
                        <td>01.02.2026 10:00:00</td>
                        <td>${countCell}</td>
                        <td>${fields.origin}</td>
                        <td>${fields.originPlanet}</td>
                        <td><span style="color:lime;">${fields.arrival}</span></td>
                        <td>${fields.target}</td>
                        <td>${fields.targetPlanet}</td>
                        <td>01.02.2026 14:00:00</td>
                        <td>${fields.hold}</td>
                        <td><a href="admin.php?page=FlyingFleet&amp;id=${fields.id}&amp;lock=${fields.lock}" style="color:lime">Lock</a></td>
                    </tr>`
}

function tooltipLine(name: string, count: string): string {
  return `<tr><td style='width:50%'>${name}</td><td style='width:50%'>${count}</td></tr>`
}

function flyingFleetPage(rows: string): string {
  return `
<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">
    <div class="card mb-3">
        <h5 class="card-header">Fleets in flight</h5>
        <div class="card-body">
            <table class="table table-dark table-hover">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Mission</th>
                        <th>Start</th>
                        <th>Ships</th>
                        <th>From</th>
                        <th>Start planet</th>
                        <th>Arrival</th>
                        <th>Target</th>
                        <th>Target planet</th>
                        <th>End</th>
                        <th>Hold</th>
                        <th>Lock</th>
                    </tr>
                </thead>
                <tbody>${rows}
                </tbody>
            </table>
        </div>
    </div>
</main>
`
}

export const FLYING_FLEET_BODY: string = flyingFleetPage(
  fleetRow({
    id: 42,
    mission: 'Transport<br>7<br>Nova',
    ships: tooltipLine('Small Cargo', '10') + tooltipLine('Light Fighter', '5'),
    resources: tooltipLine('Metal', '1.000') + tooltipLine('Crystal', '500'),
    origin: 'Yaro (ID:&nbsp;1)',
    originPlanet: 'Homeworld&nbsp;[1:2:3] (ID:&nbsp;1000)',
    arrival: '01.02.2026 12:00:00',
    target: 'Cheater (ID:&nbsp;7)',
    targetPlanet: 'Colony&nbsp;[1:2:4]  (ID:&nbsp;1001)',
    hold: '01.02.2026 13:00:00 (2&nbsp;h)',
    lock: 0,
    shipCount: '1.234',
  }) +
    fleetRow({
      id: 43,
      mission: 'Recycling',
      ships: tooltipLine('Recycler', '3'),
      resources: tooltipLine('Deuterium', '12'),
      origin: 'Yaro (ID:&nbsp;1)',
      originPlanet: 'Homeworld&nbsp;[1:2:3] (ID:&nbsp;1000)',
      arrival: '01.02.2026 12:30:00',
      target: '',
      targetPlanet: 'Colony&nbsp;[1:2:4]  (ID:&nbsp;1001)',
      hold: '01.02.2026 13:30:00 (2&nbsp;h)',
      lock: 1,
      shipCount: '3',
    }) +
    fleetRow({
      id: 44,
      mission: 'Station',
      ships: tooltipLine('Solar Satellite', '1'),
      resources: tooltipLine('Metal', '0'),
      origin: 'Yaro (ID:&nbsp;1)',
      originPlanet: 'Homeworld&nbsp;[1:2:3] (ID:&nbsp;1000)',
      arrival: '01.02.2026 13:00:00',
      target: '',
      targetPlanet: 'Colony&nbsp;[1:2:4]',
      hold: '-',
      lock: 2,
      shipCount: '1',
    }) +
    fleetRow({
      id: 45,
      mission: 'Transport',
      ships: '',
      resources: tooltipLine('Metal', '0'),
      origin: 'Yaro (ID:&nbsp;1)',
      originPlanet: 'Homeworld&nbsp;[1:2:3] (ID:&nbsp;1000)',
      arrival: '01.02.2026 13:30:00',
      target: '',
      targetPlanet: 'Colony&nbsp;[1:2:4]',
      hold: '-',
      lock: 1,
      shipCount: '0',
      countCell: '0&nbsp;(D)',
    }),
)

export const FLYING_FLEET_EMPTY_BODY: string = flyingFleetPage(`
                    <tr>
                        <td colspan="12">No fleets are in flight</td>
                    </tr>`)

function cronjobRow(fields: {
  id: number
  name: string
  min: string
  hours: string
  dom: string
  month: string
  dow: string
  className: string
  nextRun: string
  enable: 0 | 1
  lock: 'lock' | 'unlock'
}): string {
  const state = fields.enable === 0 ? ['color:lime', 'Yes'] : ['color:red', 'No']
  const held = fields.lock === 'unlock' ? ['color:red', 'Yes'] : ['color:lime', 'No']
  return `
                    <tr>
                        <td>${fields.id}</td>
                        <td>${fields.name}</td>
                        <td>${fields.min}</td>
                        <td>${fields.hours}</td>
                        <td>${fields.dom}</td>
                        <td>${fields.month}</td>
                        <td>${fields.dow}</td>
                        <td>${fields.className}</td>
                        <td>${fields.nextRun}</td>
                        <td><a href="admin.php?page=cronjob&amp;action=enable&amp;id=${fields.id}&amp;enable=${fields.enable}" style="${state[0]}">${state[1]}</a></td>
                        <td><a href="admin.php?page=cronjob&amp;id=${fields.id}&amp;action=${fields.lock}" style="${held[0]}">${held[1]}</a></td>
                        <td><a href="admin.php?page=cronjob&amp;action=detail&amp;id=${fields.id}"><img src="./styles/resource/images/admin/GO.png"></a></td>
                        <td><a href="admin.php?page=cronjob&amp;action=delete&amp;id=${fields.id}"><img src="./styles/resource/images/false.png" width="16" height="16"></a></td>
                    </tr>`
}

const CRONJOB_FOOTER = `
        <div class="card-footer text-center">
            <p class="card-text"><a href="admin.php?page=cronjob&amp;action=detail">New job</a></p>
        </div>`

function cronjobPage(rows: string, footer: string): string {
  return `
<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">
    <div class="card mb-3">
        <h5 class="card-header">Scheduled jobs</h5>
        <div class="card-body">
            <table class="table table-dark table-hover">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Minutes</th>
                        <th>Hours</th>
                        <th>Day of month</th>
                        <th>Month</th>
                        <th>Day of week</th>
                        <th>Class</th>
                        <th>Next run</th>
                        <th>Active</th>
                        <th>Lock</th>
                        <th>Edit</th>
                        <th>Delete</th>
                    </tr>
                </thead>
                <tbody>${rows}
                </tbody>
            </table>
        </div>
        ${footer}
    </div>
</main>
`
}

export const CRONJOB_BODY: string = cronjobPage(
  cronjobRow({
    id: 3,
    name: 'Weekly cleanup',
    min: '*/10',
    hours: '*',
    dom: '*',
    month: '*',
    dow: '*',
    className: 'CleanupCronjob',
    nextRun: '01.02.2026 03:00:00',
    enable: 0,
    lock: 'unlock',
  }) +
    cronjobRow({
      id: 4,
      name: 'Nightly update',
      min: '30',
      hours: '*/2',
      dom: '1',
      month: 'Jan Feb',
      dow: 'Mon Tue',
      className: 'UpdateCronjob',
      nextRun: '-',
      enable: 1,
      lock: 'lock',
    }),
  CRONJOB_FOOTER,
)

export const CRONJOB_EMPTY_BODY: string = cronjobPage('', CRONJOB_FOOTER)

export const CRONJOB_WITHOUT_CREATE_BODY: string = cronjobPage('', '')

export const CRONJOB_ROW_WITHOUT_CREATE_BODY: string = cronjobPage(
  cronjobRow({
    id: 5,
    name: 'Nightly update',
    min: '30',
    hours: '*/2',
    dom: '1',
    month: '*',
    dow: '*',
    className: 'UpdateCronjob',
    nextRun: '-',
    enable: 1,
    lock: 'lock',
  }),
  '',
)

function cronjobFieldRow(
  name: string,
  label: string,
  column: string,
  options: [string, string, boolean][],
  all: boolean,
): string {
  const rendered = options
    .map(
      ([value, text, selected]) =>
        `<option value="${value}"${selected ? ' selected' : ''}>${text}</option>`,
    )
    .join('')
  return `
                        <tr>
                            <td><label for="${name}[]">${label}</label></td>
                            <td><select name="${name}[]" multiple="multiple" class="form-control" id="${name}[]">${rendered}</select></td>
                        </tr>
                        <tr>
                            <td colspan='2'>
                                <input class="form-check-label" name="${column}_all" id="${column}_all" type="checkbox" value="1" ${all ? 'checked' : ''}>
                                <label class="form-check-label" for="${column}_all">Select all</label>
                            </td>
                        </tr>`
}

function cronjobErrors(errors: string[]): string {
  if (errors.length === 0) return ''
  return `
    <div class="card mb-3">
        <h5 class="card-header">Scheduled jobs</h5>
        <div class="card-body">
            ${errors.map((error) => `${error}<br>`).join('\n            ')}
        </div>
    </div>`
}

function cronjobDetailPage(options: {
  errors: string[]
  id: string
  name: string
  minAll?: boolean
  minSelected?: string[]
  classOptions: [string, string][]
  classSelected: string
}): string {
  const selected = new Set(options.minSelected ?? [])
  const minutes: [string, string, boolean][] = [
    ['0', '0', selected.has('0')],
    ['10', '10', selected.has('10')],
    ['30', '30', selected.has('30')],
  ]
  const hours: [string, string, boolean][] = [
    ['0', '0', false],
    ['3', '3', true],
  ]
  const classes = options.classOptions
    .map(
      ([value, text]) =>
        `<option value="${value}"${value === options.classSelected ? ' selected' : ''}>${text}</option>`,
    )
    .join('')
  return `
<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">
    ${cronjobErrors(options.errors)}
    <div class="card mb-3">
        <h5 class="card-header">${options.id === 'add' ? 'New job' : `Job ${options.id}`}</h5>
        <div class="card-body">
            <form method="POST" action="">
            <input type="hidden" name="action" value="edit">
            <input type="hidden" name="id" value="${options.id}">
                <table class="table table-dark table-hover">
                    <thead>
                        <tr>
                            <th>Parameter</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><label for="name">Name</label></td>
                            <td><input type="text" name="name" value="${options.name}" class="form-control" id="name"></td>
                        </tr>
                        ${cronjobFieldRow('min', 'Minutes', 'min', minutes, options.minAll ?? false)}
                        ${cronjobFieldRow('hours', 'Hours', 'hours', hours, false)}
                        ${cronjobFieldRow('dom', 'Day of month', 'dom', [['1', '1', true]], false)}
                        ${cronjobFieldRow('month', 'Month', 'month', [['1', 'Jan', false]], true)}
                        ${cronjobFieldRow('dow', 'Day of week', 'dow', [['0', 'Mon', true]], false)}
                        <tr>
                            <td><label for="class">Class</label></td>
                            <td><select name="class" class="form-control" id="class">${classes}</select></td>
                        </tr>
                    </tbody>
                </table>
                <input class="btn btn-primary" type="submit" value="Proceed">
            </form>
        </div>
    </div>
</main>
`
}

export const CRONJOB_DETAIL_BODY: string = cronjobDetailPage({
  errors: [],
  id: '3',
  name: 'Weekly cleanup',
  minSelected: ['10'],
  classOptions: [
    ['CleanupCronjob', 'CleanupCronjob'],
    ['UpdateCronjob', 'UpdateCronjob'],
  ],
  classSelected: 'CleanupCronjob',
})

export const CRONJOB_DETAIL_NEW_BODY: string = cronjobDetailPage({
  errors: [],
  id: 'add',
  name: '',
  minAll: true,
  classOptions: [
    ['CleanupCronjob', 'CleanupCronjob'],
    ['UpdateCronjob', 'UpdateCronjob'],
  ],
  classSelected: '',
})

export const CRONJOB_DETAIL_REFUSED_BODY: string = cronjobDetailPage({
  errors: ['A name is required', 'No minutes were chosen'],
  id: '3',
  name: '',
  classOptions: [['CleanupCronjob', 'CleanupCronjob']],
  classSelected: '',
})

function universeRow(fields: {
  id: number
  name: string
  open: boolean
  deletable: boolean
  counts: [string, string, string]
}): string {
  const speeds = ['1', '1', '1', '1', '1'].map((value) => `<td>${value}</td>`).join('')
  const login = fields.open
    ? '<span style="color:lime;">On</span>'
    : '<span style="color:red;">Off</span>'
  const action = fields.open ? 'closed' : 'open'
  const image = fields.open ? 'closed.png' : 'open.png'
  const remove = fields.deletable
    ? `<a href="?page=universe&amp;action=delete&amp;uniID=${fields.id}&amp;sid=1a2b3c&amp;reload=t" onclick="return confirm('Delete this universe?');" title="Delete"><img src="styles/resource/images/false.png" alt=""></a>`
    : ''
  return `
                    <tr style="height:23px;">
                        <td>${fields.id}</td>
                        <td>${fields.name}</td>
                        ${speeds}
                        <td>${fields.counts[0]}</td>
                        <td>${fields.counts[1]}</td>
                        <td>${fields.counts[2]}</td>
                        <td>${login}</td>
                        <td><a href="?page=universe&amp;action=${action}&amp;uniID=${fields.id}&amp;sid=1a2b3c&amp;reload=t"><img src="styles/resource/images/icons/${image}" alt=""></a>${remove}</td>
                    </tr>`
}

const UNIVERSE_FOOTER = `
        <div class="card-footer text-center">
            <p class="card-text"><a href="?page=universe&action=create&amp;sid=1a2b3c&amp;reload=t">New universe</a></p>
        </div>`

function universePage(rows: string, footer: string): string {
  return `
<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">
    <div class="card mb-3">
        <h5 class="card-header">Universes</h5>
        <div class="card-body">
            <table class="table table-dark table-hover">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th colspan="5" title="Game speed, fleet speed, resource multiplier, halt speed, energy speed">Speeds</th>
                        <th>Players</th>
                        <th>Planets</th>
                        <th>Inactive</th>
                        <th>Logins</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}
                </tbody>
            </table>
        </div>
        ${footer}
    </div>
</main>
`
}

export const UNIVERSE_BODY: string = universePage(
  universeRow({
    id: 1,
    name: 'Root',
    open: true,
    deletable: false,
    counts: ['1.234', '5.678', '12'],
  }) +
    universeRow({
      id: 2,
      name: 'Second',
      open: false,
      deletable: true,
      counts: ['0', '0', '0'],
    }),
  UNIVERSE_FOOTER,
)

export const UNIVERSE_WITHOUT_CREATE_BODY: string = universePage(
  universeRow({ id: 1, name: 'Root', open: true, deletable: false, counts: ['1', '1', '0'] }),
  '',
)

export const UNIVERSE_EMPTY_BODY: string = universePage('', UNIVERSE_FOOTER)

function giveawayField(id: number, label: string): string {
  return `
                                <tr>
                                    <td><label for="${id}">${label}</label></td>
                                    <td><input name="element_${id}" value="0" type="text" class="form-control" id="${id}" pattern="[0-9]*"></td>
                                </tr>`
}

function giveawayTab(id: string, title: string, fields: string): string {
  return `
                    <div class="tab-pane fade show" id="pills-${id}" role="tabpanel" aria-labelledby="pills-${id}-tab">
                        <table class="table table-dark table-hover">
                            <thead>
                                <tr>
                                    <th colspan="2">${title}</th>
                                </tr>
                            </thead>
                            <tbody>${fields}
                            </tbody>
                        </table>
                    </div>`
}

const GIVEAWAY_TABS =
  giveawayTab(
    '900',
    'Resources',
    giveawayField(901, 'Metal') + giveawayField(902, 'Crystal') + giveawayField(903, 'Deuterium'),
  ) +
  giveawayTab('0', 'Buildings', giveawayField(1, 'Metal Mine') + giveawayField(2, 'Crystal Mine')) +
  giveawayTab('100', 'Research', giveawayField(106, 'Espionage Technology')) +
  giveawayTab(
    '200',
    'Fleet',
    giveawayField(202, 'Small Cargo') + giveawayField(203, 'Large Cargo'),
  ) +
  giveawayTab('400', 'Defence', giveawayField(401, 'Rocket Launcher')) +
  giveawayTab('600', 'Officers', giveawayField(601, 'Geologist'))

function giveawayFilter(name: string, label: string, checked: boolean): string {
  return `
                <div class="form-group form-check">
                    <input name="${name}" value="1"${checked ? ' checked' : ''} type="checkbox" class="form-check-input" id="${name}">
                    <label class="form-check-label" for="${name}">${label}</label>
                </div>`
}

function giveawayPage(filters: string): string {
  return `
<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">
    <div class="card mb-3">
        <h5 class="card-header">Giveaway</h5>
        <div class="card-body">
            <form method="post">
            <input type="hidden" name="action" value="send">
                <ul class="nav nav-pills mb-3" id="pills-tab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="pills-900-tab" data-toggle="pill" href="#pills-900" role="tab" aria-controls="pills-900" aria-selected="false">Resources</a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="pills-200-tab" data-toggle="pill" href="#pills-200" role="tab" aria-controls="pills-200" aria-selected="false">Fleet</a>
                    </li>
                </ul>${filters}
                <div class="tab-content" id="pills-tabContent">${GIVEAWAY_TABS}
                </div>
                <input class="btn btn-primary" type="submit" value="Add">
            </form>
        </div>
    </div>
</main>
`
}

export const GIVEAWAY_BODY: string = giveawayPage(
  giveawayFilter('planet', 'Planets', true) +
    giveawayFilter('moon', 'Moons', true) +
    giveawayFilter('mainplanet', 'Home planet only', true) +
    giveawayFilter('no_inactive', 'Skip inactive accounts', true),
)

export const GIVEAWAY_UNTICKED_BODY: string = giveawayPage(
  giveawayFilter('planet', 'Planets', false) +
    giveawayFilter('moon', 'Moons', false) +
    giveawayFilter('mainplanet', 'Home planet only', true) +
    giveawayFilter('no_inactive', 'Skip inactive accounts', true),
)

function newsRow(id: number, title: string, author: string): string {
  return `
                    <tr>
                        <td><a href="?page=news&amp;action=edit&amp;id=${id}">${id}</a></td>
                        <td><a href="?page=news&amp;action=edit&amp;id=${id}">${title}</a></td>
                        <td><a href="?page=news&amp;action=edit&amp;id=${id}">01.02.2026 12:00:00</a></td>
                        <td><a href="?page=news&amp;action=edit&amp;id=${id}">${author}</a></td>
                        <td><a href="?page=news&amp;action=delete&amp;id=${id}" onclick="return confirm('Delete ${title}?');"><img border="0" src="./styles/resource/images/alliance/CLOSE.png" width="16" height="16"></a></td>
                    </tr>`
}

function newsEditor(options: { key: number; id: number | null }): string {
  const editing = options.id !== null
  return `
            <form method="POST" action="?page=news&amp;action=send&amp;key=${options.key}" class="mb-3">
                ${editing ? `<input name="id" type="hidden" value="${options.id}">` : ''}
                <table class="table table-dark table-hover">
                    <thead>
                        <tr>
                            <th colspan="2">${editing ? 'Edit news' : 'Create news'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><label for="title">Title</label></td>
                            <td><input name="title" type="text" value="${editing ? 'Server restart' : ''}" class="form-control" id="title"></td>
                        </tr>
                        <tr>
                            <td><label for="text">Content</label></td>
                            <td><textarea cols="70" rows="10" name="text" type="text" class="form-control" id="text">${editing ? 'The server restarts tonight.' : ''}</textarea></td>
                        </tr>
                    </tbody>
                </table>
                <button type="submit" name="Submit" class="btn btn-primary">Submit</button>
            </form>`
}

function newsPage(editor: string): string {
  return `
<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">
    <div class="card mb-3">
        <h5 class="card-header">News</h5>
        <div class="card-body">${editor}
            <table class="table table-dark table-hover">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Date</th>
                        <th>From</th>
                        <th>Delete</th>
                    </tr>
                </thead>
                <tbody>${newsRow(4, 'Server restart', 'Yaro') + newsRow(5, 'Double resources', 'Yaro')}
                </tbody>
            </table>
        </div>
        <div class="card-footer text-center">
            <p class="card-text"><a href="?page=news&amp;action=create">Create news</a></p>
        </div>
    </div>
</main>
`
}

export const NEWS_BODY: string = newsPage('')

export const NEWS_EDIT_BODY: string = newsPage(newsEditor({ key: 1, id: 4 }))

export const NEWS_CREATE_BODY: string = newsPage(newsEditor({ key: 2, id: null }))

export const INFORMATION_BODY = `
<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">
    <div class="card mb-3">
        <h5 class="card-header">Information</h5>
        <div class="card-body">
            <p class="card-text">
                Server software Apache/2.4.62 (Unix)
                PHP version 8.2.27 (apache2handler)<br>
                JSON extension enabled<br>
                bcmath extension loaded<br>
                cURL extension loaded<br>
                Safe mode disabled<br>
                Memory limit 256M<br>
                MySQL client 8.0.36<br>
                MySQL server 8.0.36<br>
                Error log /var/log/php_errors.log (1024, enabled)<br>
                Time zone 0 / 0 / 0<br>
                Suhosin extension absent<br>
            </p>
            <p class="card-text">
                Game version 1.8.0 (a1b2c3d)<br>
                Database version 5.7.44<br>
                Game address http://uni.example.com/<br>
                Game path http://uni.example.com/play/index.php<br>
            </p>
        </div>
    </div>
</main>
`

function overviewCard(figures: [string, string][]): string {
  const items = figures
    .map(
      ([label, value]) => `
                        <button type="button" class="list-group-item list-group-item-action">${label}
                            <span class="badge badge-primary badge-pill">${value}</span>
                        </button>`,
    )
    .join('')
  return `
<main role="main" class="col-md-9 ml-sm-auto col-lg-10 px-md-4">
    <div class="album">
        <div class="row">
            <div class="col-md-6">
                <div class="card mb-4 shadow-sm">
                    <h5 class="card-header">Statistics</h5>
                    <div class="list-group overflow-auto" style="max-height: 415px;">${items}
                    </div>
                </div>
            </div>
        </div>
    </div>
</main>
`
}

const OVERVIEW_FIGURES: [string, string][] = [
  ['Backups', '3'],
  ['Accounts', '1234'],
  ['Inactive accounts', '12'],
  ['Accounts online', '7'],
  ['Planets', '5678'],
  ['Open tickets', '0'],
  ['Log rows', '99999'],
  ['Active cronjobs', '4'],
  ['News', '12'],
]

export const OVERVIEW_BODY: string = overviewCard(OVERVIEW_FIGURES)

export const OVERVIEW_EIGHT_FIGURES_BODY: string = overviewCard(OVERVIEW_FIGURES.slice(0, 8))
