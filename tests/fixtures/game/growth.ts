export function timedEntry(id: number, level: string, countdown: boolean): string {
  return `
    <div class="build_box" id="ofic_${id}">
      <div class="head"><span class="gov6">${level}</span></div>
      <div class="time_build_mini">1.000</div>
      ${countdown ? `<span id="time_${id}"></span>` : ''}
      <input type="hidden" name="id" value="${id}">
      <button type="submit">Buy</button>
    </div>
  `
}

export function cataloguePageBody(content: string, planetId: number, header: string): string {
  return (
    `<span class="active_urlpalnet" url="cp=${planetId}"></span>${header}` +
    '<div id="page"><div id="content">' +
    content +
    '</div></div>'
  )
}

export function arsenalEntryBody(elementId = 2001): string {
  return `
    <div class="build_box" id="ars_${elementId}">
      <div class="head">Admiral<font class="gov6">(Level 1.500/20.000)</font></div>
      <div class="image_mini"><img alt="Admiral" src="dpath/gebaeude/${elementId}.gif"></div>
      <div class="time_build_mini">1.000</div>
    </div>
  `
}

export const officerCatalogueBody = `
    <div class="build_box" id="ofic_601">
      <div class="head"><span class="gov6">(Level 1/20)</span></div>
      <div class="image_mini"><img src="gebaeude/bonus/Attack.gif" alt="Admiral"></div>
      <div class="time_build_mini"><span id="price601">1.000</span></div>
      <form action="game.php?page=officier" method="post" class="build_form">
      <input type="hidden" name="id" value="601">
      <input type="number" name="amount" max="10">
      <div class="prices_mini"><font>+10% Fleet speed<br></font><font>Shipyard 5<br></font></div>
      <button type="submit">Buy</button>
      </form>
    </div>
    <div class="build_box" id="ofic_602">
      <div class="head">General <span class="gov6">(Level 3)</span></div>
      <div class="time_build_mini">2.000</div>
      <form action="game.php?page=officier" method="post" class="build_form">
      <input type="hidden" name="id" value="602">
      <button type="submit">Buy</button>
      </form>
    </div>
  `

export function timedCatalogueBody(): string {
  return `${timedEntry(601, '(Level 1/20)', true)}${timedEntry(602, '(Level 2/20)', false)}
    <script>GetOfficerTime(601, 120);</script>
  `
}

export const officerEntryWithoutTimerBody = `
    <div class="build_box" id="ofic_601">
      <div class="head"><span class="gov6">(Level 1/20)</span></div>
      <div class="time_build_mini">1.000</div>
      <span id="time_601"></span>
      <input type="hidden" name="id" value="601">
    </div>
    <script>GetOfficerTime(602, 120);</script>
  `

export const contentContainerWithoutPage = '<div id="content"></div>'

export const detailsCatalogueBody = `
    <div id="build_elements" class="ars_elements gov2">
      <div id="ofic_1001" class="build_box">
        <div class="head">
          Supercharger
          <font class="gov6">(Level 3)</font>
        </div>
        <div class="content_box">
          <div class="image_mini">
            <img src="./styles/theme/nsc/gebaeude/1001.gif" alt="Supercharger" />
          </div>
          <div class="prices_mini">
            <font color="#096">+17.32% attack<br></font>
          </div>
        </div>
      </div>
    </div>
    <div id="build_elements" class="officier_elements gov2">
      <div id="ofic_1001" class="build_box">
        <div class="head">
          Supercharger
          <font class="gov6">(Level 3)</font>
        </div>
        <div class="content_box">
          <div class="image_mini">
            <img src="./styles/theme/nsc/gebaeude/1001.gif" alt="Supercharger" />
          </div>
          <div class="prices_mini">
            <font color="#096">
              Energy tech 5<br>
            </font>
          </div>
          <div class="clear"></div>
          <form action="game.php?page=details" method="post" class="build_form">
            <div class="time_build">Dark Matter: <b><span id="price1001" style="color:lime">100</span></b></div>
            <div class="clear"></div>
            <div class="btn_build_border">
              <form action="game.php?page=details" method="post" class="build_form">
                <div class="clear"></div>
                <input name="id" value="1001" type="hidden">
                <div class="btn_build_border btn_build_border_left dm_btn_build_border_left">
                  <label class="max_btn_ship">Level up</label>
                  <div class="div_text count_ships_dots">
                    <input id="amount1001" class="text" onchange="Price921('1001', 100);" name="amount" max="255" min="1" value="1" type="number">
                  </div>
                </div>
                <div class="btn_build_border btn_build_border_right dm_btn_build_border_right">
                  <button class="btn_build gubernators_form_submit" type="submit">Buy</button>
                </div>
              </form>
            </div>
          </form>
        </div>
      </div>
    </div>
  `

export const officerFlatBonusBody = `
    <div class="build_box" id="ofic_611">
      <div class="head">
        <a href="#" onclick="return Dialog.info(611)">Commander</a>
        <font class="gov6">(Level 1/3)</font>
      </div>
      <div class="content_box">
        <div class="image_mini">
          <a href="#" onclick="return Dialog.info(611)"><img src="./styles/theme/nsc/gebaeude/611.gif" alt="Commander" /></a>
        </div>
        <div class="prices_mini">
          <font color="#096">+3 fleet slots<br></font>
        </div>
        <div class="clear"></div>
        <form action="game.php?page=officier" method="post" class="build_form" id="Gov">
          <div class="time_build_mini">
            Dark Matter:
            <b><span id="price611" style="color:lime">1.000</span></b>
          </div>
          <div class="clear"></div>
          <div class="btn_build_border">
            <form action="game.php?page=officier" method="post" class="build_form">
              <div class="clear"></div>
              <input name="id" value="611" type="hidden">
              <div class="div_text count_ships_dots">
                <input id="amount611" class="text" onchange="Price921('611', 1000);" name="amount" max="3" min="1" value="1" type="number">
              </div>
              <button class="btn_build gubernators_form_submit" type="submit">Buy</button>
            </form>
          </div>
        </form>
      </div>
    </div>
  `

export const mismatchedPriceHandlerBody = `
    <div id="build_elements" class="officier_elements gov2">
      <div id="ofic_601" class="build_box">
        <div class="head">
          Admiral
          <font class="gov6">(Level 3/20)</font>
        </div>
        <div class="time_build_mini">1.000</div>
        <input id="amount601" class="text" onchange="Price901('602', 1000);" name="amount" max="20" min="1" value="1" type="number">
        <input name="id" value="601" type="hidden">
        <button type="submit">Buy</button>
      </div>
    </div>
  `

export const duplicateCostBody = `
    <div id="build_elements" class="officier_elements gov2">
      <div id="ofic_601" class="build_box">
        <div class="head">
          Admiral
          <font class="gov6">(Level 3/20)</font>
        </div>
        <div class="time_build_mini">1.000</div>
        <input id="amount601" class="text" onchange="refresh(this);" name="amount" max="20" min="1" value="1" type="number">
        <input id="amount601a" class="text" onchange="Price901('601', 1000);" name="amount" max="20" min="1" value="1" type="number">
        <input id="amount601b" class="text" onchange="Price902('601', 500);" name="amount" max="20" min="1" value="1" type="number">
        <input id="amount601c" class="text" onchange="Price901('601', 900);" name="amount" max="20" min="1" value="1" type="number">
        <input name="id" value="601" type="hidden">
        <button type="submit">Buy</button>
      </div>
    </div>
  `

export const raceChoiceCatalogueBody = `
    <div class="gray_flettab" style="padding-right:0;color:#6ccdce;">
      <strong>Fighter</strong>
      <a href="game.php?page=overview" class="tornaindietroa">Overview</a>
    </div>
    <div id="build_elements" class="race_elements">
      <div id="ofic_101" class="build_box">
        <div class="head">
          <a style="color:#6ccdce;"><strong>Fighter</strong></a>
        </div>
        <div class="content_box">
          <img style="float:right;margin-bottom:5px" src="./styles/theme/nsc/gebaeude/race/101.png" />
          <div class="prices_mini" style="margin-left: 7px;margin-bottom: 5px;">
            <font style="color:#6ccdce;"><strong>Bonus</strong></font><br>
            <font color="#6ccdce">+10% Fleet speed<br></font>
          </div>
          <div class="clear"></div>
          <div class="btn_build_border" style="height:29px;width:101%;">
            <form action="game.php?page=race" method="post" class="build_form">
              <input type="hidden" name="id" value="101">
              <button type="submit" class="btn_build">Choose Metal <span style="color:lime">1.000</span> Crystal <span style="color:red">500</span></button>
            </form>
          </div>
        </div>
      </div>
      <div id="ofic_102" class="build_box">
        <div class="head">
          <a style="color:#6ccdce;"><strong>Scout</strong></a>
        </div>
        <div class="content_box">
          <div class="prices_mini" style="margin-left: 7px;margin-bottom: 5px;">
            <font style="color:#6ccdce;"><strong>Bonus</strong></font><br>
            <font color="#6ccdce">+5% Ship speed<br></font>
          </div>
          <div class="clear"></div>
          <div class="btn_build_border" style="height:29px;width:101%;">
            <span class="btn_build red">Choose Metal <span style="color:lime">2.000</span></span>
          </div>
        </div>
      </div>
      <div class="clear"></div>
    </div>
  `

export const achievementTooltipBody = `
    <div id="build_elements" class="ars_elements gov2">
      <div id="ofic_601" class="build_box">
        <div class="head">
          <a href="#" onclick="return Dialog.info(601)">Admiral</a>
          <font class="gov6">(Level 3/20)</font>
        </div>
        <div class="content_box">
          <div class="image_mini">
            <a href="#" onclick="return Dialog.info(601)"><img src="./styles/theme/nsc/gebaeude/601.gif" alt="Admiral" /></a>
          </div>
          <div class="prices_mini">
            <font color="#808080">
              Energy tech 5<br>
            </font>
            <span class="achievement4 tooltip" data-tooltip-content="
            <span style='color:#3CF; font-weight:bold;'>Still missing</span> <br>
            Energy tech 2<br>
            <br><span style='color:#F90; font-weight:bold;'>Next upgrade</span><br>
            +10% Fleet speed<br>
            ">?</span>
          </div>
        </div>
      </div>
    </div>
  `

export const achievementTooltipWithoutHeadingBody = `
    <div id="build_elements" class="ars_elements gov2">
      <div id="ofic_601" class="build_box">
        <div class="head">
          <a href="#" onclick="return Dialog.info(601)">Admiral</a>
          <font class="gov6">(Level 3/20)</font>
        </div>
        <div class="content_box">
          <div class="prices_mini">
            <font color="#808080">
              Energy tech 5<br>
            </font>
            <span class="achievement4 tooltip" data-tooltip-content="+10% Fleet speed<br>">?</span>
          </div>
        </div>
      </div>
    </div>
  `

export const bonusSummaryBody = `
    <div class="gray_flettab" style="padding-right:0;">
      Bonuses
      <a href="game.php?page=overview" class="tornaindietroa">Overview</a>
    </div>
    <div class="fleettab8" style="margin-bottom: 0;"></div>
    <table class="tablesorter ally_ranks tabstatistica" style="margin-bottom:5px">
      <tbody>
        <tr class="torneo4">
          <th style="width: 35px;min-width: 35px;">#</th>
          <th style="width: 85px;min-width: 85px;">Percent</th>
          <th style="text-align: center;min-width: 75px;width: 75px;">Units</th>
          <th style="text-align:center;width: 465px;">Name</th>
        </tr>
        <tr class="day0 week0 classificabarra">
          <td class="classstat1" style="text-align: center;width: 35px;max-width: 35px;min-width: 35px;">
            <div class="barracla" style=""></div>
            <div class="info_bonus_img"><img height="18" width="18" src="./styles/theme/nsc/gebaeude/bonus/Attack.gif"></div>
          </td>
          <td class="classstat1" style="text-align: center;width: 65px;max-width: 65px;min-width: 65px;">
            <font color="#096">200%</font>
          </td>
          <td class="classstat1" style="text-align: center;width: 100px;max-width: 100px;min-width: 100px;">
            <font color="#096">2</font>
            <div class="barracla" style="float: left;"></div>
            <div class="barracla" style=""></div>
          </td>
          <td class="classstat10" style="text-align: right;width: 405px;min-width: 405px;">Attack</td>
        </tr>
        <tr class="day0 week0 classificabarra">
          <td class="classstat1" style="text-align: center;width: 35px;max-width: 35px;min-width: 35px;">
            <div class="barracla" style=""></div>
            <div class="info_bonus_img"><img height="18" width="18" src="./styles/theme/nsc/gebaeude/bonus/Sfleet.gif"></div>
          </td>
          <td class="classstat1" style="text-align: center;width: 65px;max-width: 65px;min-width: 65px;">
            <font color="#096">10%</font>
          </td>
          <td class="classstat1" style="text-align: center;width: 100px;max-width: 100px;min-width: 100px;">
            <font color="#096">0</font>
            <div class="barracla" style="float: left;"></div>
            <div class="barracla" style=""></div>
          </td>
          <td class="classstat10" style="text-align: right;width: 405px;min-width: 405px;">Fleet speed</td>
        </tr>
      </tbody>
    </table>
  `

export const bonusSummaryRowWithoutIconBody = `
    <table class="tablesorter ally_ranks tabstatistica">
      <tbody>
        <tr class="day0 week0 classificabarra">
          <td class="classstat1"><div class="barracla"></div></td>
          <td class="classstat1"><font color="#096">10%</font></td>
          <td class="classstat1"><font color="#096">0</font></td>
          <td class="classstat10">Fleet speed</td>
        </tr>
      </tbody>
    </table>
  `

export const storeCatalogueBody = `
    <div id="market" class="locus">
      <div class="habena">
        Store
      </div>
      <div class="market_element img_artifact">
        <a href="game.php?page=artifact">
          <div class="market_title">Artifacts</div>
        </a>
      </div>
      <div class="market_element img_blueprints">
        <a href="game.php?page=blueprints">
          <div class="market_title">Blueprints</div>
        </a>
      </div>
      <div class="market_element img_premium">
        <a href="game.php?page=premium">
          <div class="market_title">Premium</div>
        </a>
      </div>
    </div>
  `

export const storeLinkWithoutPageBody = `
    <div id="market" class="locus">
      <div class="market_element img_premium">
        <a href="game.php">
          <div class="market_title">Premium</div>
        </a>
      </div>
    </div>
  `

export const bonusLineWithoutAmountBody = `
    <div class="build_box" id="ofic_601">
      <div class="head"><span class="gov6">(Level 1/20)</span></div>
      <div class="time_build_mini">1.000</div>
      <div class="prices_mini"><font color="#096">+ Fleet slots<br>- Damage<br></font></div>
      <input type="hidden" name="id" value="601">
      <button type="submit">Buy</button>
    </div>
  `

export const elementCardWithoutIdBody = `
    <div class="build_box" id="ofic_">
      <div class="head"><font class="gov6">(Level 0)</font></div>
      <div class="time_build_mini">1.000</div>
    </div>
    <div class="build_box" id="ofic_601">
      <div class="head"><span class="gov6">(Level 1/20)</span></div>
      <div class="time_build_mini">1.000</div>
      <input type="hidden" name="id" value="601">
      <button type="submit">Buy</button>
    </div>
  `

export const detailsCatalogueWithoutPriceBody = `
    <div id="build_elements" class="ars_elements gov2">
      <div id="ofic_1001" class="build_box">
        <div class="head">
          Supercharger
          <font class="gov6">(Level 3)</font>
        </div>
        <div class="content_box">
          <div class="image_mini">
            <img src="./styles/theme/nsc/gebaeude/1001.gif" alt="Supercharger" />
          </div>
          <div class="prices_mini">
            <font color="#096">+17.32% attack<br></font>
          </div>
        </div>
      </div>
    </div>
    <div id="build_elements" class="officier_elements gov2">
      <div id="ofic_1001" class="build_box">
        <div class="head">
          Supercharger
          <font class="gov6">(Level 3)</font>
        </div>
        <div class="content_box">
          <div class="image_mini">
            <img src="./styles/theme/nsc/gebaeude/1001.gif" alt="Supercharger" />
          </div>
          <div class="prices_mini">
            <font color="#096">Energy tech 5<br></font>
          </div>
          <div class="clear"></div>
          <form action="game.php?page=details" method="post" class="build_form">
            <div class="time_build"></div>
            <div class="clear"></div>
            <div class="btn_build_border">
              <input name="id" value="1001" type="hidden">
              <div class="btn_build_border btn_build_border_left dm_btn_build_border_left">
                <label class="max_btn_ship">Level up</label>
                <div class="div_text count_ships_dots"></div>
              </div>
              <div class="btn_build_border btn_build_border_right dm_btn_build_border_right">
                <button class="btn_build gubernators_form_submit" type="submit">Buy</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  `

export const raceChoiceWithoutSelectionBody = `
    <div class="gray_flettab" style="padding-right:0;color:#6ccdce;">
      <strong>Race is missing</strong>
      <a href="game.php?page=overview" class="tornaindietroa">Overview</a>
    </div>
    <div id="build_elements" class="race_elements">
      <div id="ofic_1501" class="build_box">
        <div class="head">
          <a style="color:#6ccdce;"><strong>Photorians</strong></a>
        </div>
        <div class="content_box">
          <img style="float:right;margin-bottom:5px" src="./styles/theme/nsc/gebaeude/race/1501.png" />
          <div class="prices_mini" style="margin-left: 7px;margin-bottom: 5px;">
            <font style="color:#6ccdce;"><strong>Bonus</strong></font><br>
            <font color="#6ccdce">+10% Fleet speed<br></font>
          </div>
          <div class="clear"></div>
          <div class="btn_build_border" style="height:29px;width:101%;">
            <span class="btn_build red">Choose <span style="color:lime">1.000</span></span>
          </div>
        </div>
      </div>
      <div id="ofic_1502" class="build_box">
        <div class="head">
          <a style="color:#6ccdce;"><strong>Sinuria</strong></a>
        </div>
        <div class="content_box">
          <img style="float:right;margin-bottom:5px" src="./styles/theme/nsc/gebaeude/race/1502.png" />
          <div class="prices_mini" style="margin-left: 7px;margin-bottom: 5px;">
            <font style="color:#6ccdce;"><strong>Bonus</strong></font><br>
            <font color="#6ccdce">+5% Ship speed<br></font>
          </div>
          <div class="clear"></div>
          <div class="btn_build_border" style="height:29px;width:101%;">
            <span class="btn_build red">Choose <span style="color:lime">2.000</span></span>
          </div>
        </div>
      </div>
      <div class="clear"></div>
    </div>
  `
