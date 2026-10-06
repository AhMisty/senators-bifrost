export const ACTIVE_PLANET = (planetId: number): string =>
  `<span class="active_urlpalnet" url="cp=${planetId}"></span>`

export const PLAIN_RESOURCE_HEADER = `
    <div id="res_nav">
      <div class="stock_text"><span id="current_metal" data-real="1000">1.000</span>/100000</div>
      <div class="stock_text"><span id="current_crystal" data-real="500">500</span>/100000</div>
      <div class="stock_text"><span id="current_deuterium" data-real="100">100</span>/100000</div>
      <div class="stock_text"><span id="current_energy">500</span>/ 1234</div>
    </div>
  `

export const GAME_FRAME = `
    <div class="usernameow" onclick="Dialog.Playercard(4242)">AhMisty</div>
    <div id="planet_select">
      <div class="active_panet">
        <div class="name_palnet">Homeworld</div>
        <div class="coordinates_palnet">[1:2:3]</div>
      </div>
    </div>
    <select id="lstPlaneta">
      <option value="?page=overview&amp;cp=1000">Homeworld [1:2:3]</option>
      <option value="?page=overview&amp;cp=1001">Nova (Moon) [1:2:4]</option>
    </select>
    <script>var auth = "3";var ServerTimezoneOffset = "-3600";</script>
    <div id="list_palnet">
      <div class="palnet_row">
        <span url="cp=1000">
          <div class="name_palnet">Homeworld</div>
          <div class="coordinates_palnet">[1:2:3]</div>
          <img src="./img/planet.gif">
          <div class="ico_build">
            <img src="./img/activity_build.png" data-tooltip-content="<img src='./img/gebaeude/31.gif'><span>Robotics Factory</span>">
            <img src="./img/activity_tech.png" data-tooltip-content="<img src='./img/gebaeude/113.gif'><span>Energy Tech</span>">
            <img src="./img/activity_ship.png" data-tooltip-content="<img src='./img/gebaeude/202.gif'><span>Small Cargo</span>">
          </div>
        </span>
        <span url="cp=1001"><img src="./img/moon.gif"></span>
        <div class="fleet_indicators">
          <img id="1000m1" src="./img/indicator.png" data-tooltip-content="Attack" style="display: none">
          <img id="1000m6" src="./img/indicator.png" data-tooltip-content="Espionage">
          <img id="1000m10" src="./img/indicator.png" data-tooltip-content="Missiles">
          <img id="1000m12" src="./img/indicator.png" data-tooltip-content="Capture">
          <img id="1000m5" src="./img/indicator.png" data-tooltip-content="Unknown">
          <img id="1001m6" src="./img/indicator.png" data-tooltip-content="Moon espionage">
          <img id="1001m9" src="./img/indicator.png" data-tooltip-content="Moon destruction">
          <img id="1001m10" src="./img/indicator.png" data-tooltip-content="Moon missiles">
          <img id="not-an-indicator" src="./img/indicator.png" data-tooltip-content="Nope">
        </div>
      </div>
      <div class="palnet_row">
        <span url="cp=1000"><img src="./img/planet.gif"></span>
      </div>
      <div class="palnet_row"><span url="cp=1002"><img src="./img/moon.gif"></span></div>
      <div class="palnet_row"><span url="cp=">Nothing</span></div>
    </div>
    <div id="left_menu"><a href="./a.php">A</a></div>
  `

export const INSPECTED_CONTENT = `
    <div class="ally_contents">Everything is fine</div>
    <h2>Overview</h2><h3 class="sub">Sub</h3>
    <a href="./notes.php?id=4" title="Notes">Notes</a>
    <a href="#" data-tooltip-content="<span>Tip</span>">Tip</a>
    <a href="javascript:Dialog.Playercard(1)">Card</a>
    <a href="#" onclick="Dialog.Playercard(2)">Card 2</a>
    <a>No address</a>
    <img src="./img/gebaeude/31.gif" alt="Mine" data-tooltip-content="<span>Building</span>">
    <img src="./img/x.png" title="Title">
    <form id="f1" action="game.php?page=settings" method="post" enctype="multipart/form-data">
      <label for="user">User</label><label for="user">again</label>
      <label>Pick <input name="picked" value="p"></label>
      <input id="user" name="user" value="AhMisty" required min="1" max="10" step="2">
      <select name="mode"><option value="1" selected>One</option><option value="2" disabled>Two</option></select>
      <select name="multi" multiple><option value="1" selected>one</option><option value="2">two</option></select>
      <textarea name="notes">hi</textarea>
      <input type="radio" name="side" value="a" checked>
      <input type="radio" name="side" value="b">
      <input type="password" name="secret" placeholder="Secret">
      <input type="text" name="titled" title="Titled">
      <button>Save</button>
      <input type="submit" value="Go">
      <input type="reset">
      <input type="hidden" name="hidden" value="h">
      <fieldset disabled><input name="trapped" value="x"></fieldset>
    </form>
    <form>
      <textarea name="loose">text</textarea>
    </form>
    <input name="outside" value="x" type="text" aria-label="Outside">
    <table id="t1"><caption>Records</caption>
      <tr><th>Name</th><th colspan="2">Value</th></tr>
      <tr><td rowspan="2">A</td><td><a href="./x.php?id=1">one</a></td><td><img src="./img/gebaeude/31.gif" alt="M"></td></tr>
    </table>
    <div id="box_31" class="build_box">
      <span id="tip" data-tooltip-content="<a href='./y.php?id=2'>Inner</a><table><tr><td>cell</td></tr></table>">?</span>
    </div>
    <div id="tip2" data-tooltip-content="plain text">?</div>
    <meta http-equiv="refresh" content="5; url='./game.php?page=overview'">
    <script>var total = 12;</script>
  `

export function inspectedBody(
  options: {
    planetId?: number
    header?: string
    frame?: string
    content?: string
  } = {},
): string {
  const planetId = options.planetId ?? 1000
  return [
    ACTIVE_PLANET(planetId),
    options.header ?? PLAIN_RESOURCE_HEADER,
    '<div id="content"><div id="ally_content">',
    options.frame ?? GAME_FRAME,
    options.content ?? INSPECTED_CONTENT,
    '</div></div>',
  ].join('')
}

export const PLAYERLESS_FRAME = `
    <select id="lstPlaneta"><option value="?page=overview&amp;cp=1000">Homeworld [1:2:3]</option></select>
    <script>var ServerTimezoneOffset = null;</script>
  `

export const PLANET_ROW_WITHOUT_NAME = `
    <div id="list_palnet">
      <div class="palnet_row"><span url="cp=1000"></span></div>
    </div>
  `

export const PLANET_ROWS_WITH_AND_WITHOUT_LINK = `
    <div id="list_palnet">
      <div class="palnet_row">
        <span url="cp=2000">
          <div class="name_palnet">Nova</div>
          <div class="coordinates_palnet">[2:3:4]</div>
          <img src="./img/planet.gif">
          <div class="ico_build">
            <img src="./img/activity_build.png" data-tooltip-content="<img src='./img/gebaeude/31.gif'><span>Robotics Factory</span>">
          </div>
        </span>
      </div>
      <div class="palnet_row">
        <div class="name_palnet">Ghost</div>
        <div class="coordinates_palnet">[9:9:9]</div>
        <img src="./img/moon.gif">
        <div class="ico_build">
          <img src="./img/activity_tech.png" data-tooltip-content="<img src='./img/gebaeude/113.gif'><span>Energy Tech</span>">
        </div>
      </div>
      <div class="palnet_row">
        <span url="cp=">Nothing</span>
        <div class="name_palnet">Nameless</div>
      </div>
    </div>
  `
