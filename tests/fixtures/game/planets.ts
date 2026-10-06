export const planetManagementBody = `
    <div class="build_box">
      <div class="head">Increase fields <span>163 (+5)</span> <span id="open_btn_fields">+</span></div>
      <div id="box_fields">
        <form action="game.php?page=planet&amp;mode=field" method="POST">
          <input id="type_fields" value="1" type="hidden">
          <input id="power_fields" value="2" type="hidden">
          <input id="purchased_fields" value="5" type="hidden">
          <input id="filds" name="filds" max="99" min="0" value="0" type="number">
        </form>
      </div>
    </div>
    <div class="build_box">
      <div class="head">Increase diameter <span>8660 (+200)</span></div>
      <div id="box_diameters">
        <form action="game.php?page=planet&amp;mode=diameter" method="POST">
          <input id="type_diameters" value="921" type="hidden">
          <input id="power_diameters" value="0.5" type="hidden">
          <input id="purchased_diameters" value="200" type="hidden">
          <input id="diameters" name="diameters" max="500" value="0" type="number">
        </form>
      </div>
    </div>
    <div class="build_box">
      <div class="head">
        Relocate
        <span style="color:#F33">(cooldown 2h)</span>
        <span id="open_btn_teleport" class="prem_open_btn">+</span>
      </div>
      <div id="box_teleport">
        <form action="game.php?page=planet&amp;mode=coord" method="POST">
          <input id="galaxyt" name="galaxyt" value="3">
          <input id="systemt" name="systemt" value="4">
          <input id="planetst" name="planetst" value="5">
        </form>
      </div>
    </div>
  `

export const planetManagementWithoutRelocationBody = `
    <div class="build_box">
      <div class="head">Increase fields <span>163</span></div>
      <div id="box_fields">
        <input id="type_fields" value="1" type="hidden">
        <input id="power_fields" value="2" type="hidden">
        <input id="purchased_fields" value="0" type="hidden">
        <input name="filds" max="99" value="0" type="number">
      </div>
    </div>
    <div class="build_box">
      <div class="head">Increase diameter <span>8660</span></div>
      <div id="box_diameters">
        <input id="type_diameters" value="921" type="hidden">
        <input id="power_diameters" value="0.5" type="hidden">
        <input id="purchased_diameters" value="0" type="hidden">
        <input name="diameters" max="500" value="0" type="number">
      </div>
    </div>
  `

export const fieldsBlockWithoutTotalBody = `
    <div class="build_box">
      <div class="head">Increase fields <span>unlimited</span></div>
      <div id="box_fields">
        <input id="type_fields" value="1" type="hidden">
        <input id="power_fields" value="2" type="hidden">
        <input id="purchased_fields" value="0" type="hidden">
        <input name="filds" max="99" value="0" type="number">
      </div>
    </div>
  `

export const affordableMoonOffer = `
    <div class="build_band2 ticket_bottom_band">
      <span>Price</span>
      <form action="game.php?page=createMoon" method="post">
        <input type="hidden" name="mode" value="buy">
        <input class="bottom_band_submit" value="100.000 Deuterium" type="submit">
      </form>
    </div>
  `

export const unaffordableMoonOffer = `
    <div class="build_band2 ticket_bottom_band">
      <span>Price</span>
      <span>100.000 Deuterium</span>
    </div>
  `

export function iconSection(ids: number[], wrapper: string | null): string {
  const band = '<div class="imper_block_th"></div>'
  const rows = ids
    .map(
      (id) =>
        `<div class="imper_block_td"><img height="18" width="18" src="styles/theme/nsc/gebaeude/${id}.gif"></div>`,
    )
    .join('')
  return wrapper === null ? `${band}${rows}` : `<div class="${wrapper}">${band}${rows}</div>`
}

export function cells(values: string[]): string {
  return values.map((value) => `<div class="imper_block_td">${value}</div>`).join('')
}

export function labelSection(name: string, ids: number[], wrapper: string | null): string {
  const band = `<div class="imper_block_th">${name}</div>`
  const rows = ids.map((id) => `<div class="imper_block_td">${id}</div>`).join('')
  return wrapper === null ? `${band}${rows}` : `<div class="${wrapper}">${band}${rows}</div>`
}

export function planetColumn(
  id: number,
  name: string,
  coordinate: string,
  moon: boolean,
  sections: string[][],
  fields: string,
): string {
  const [stock, production, build, fleet, defense] = sections
  return `
    <td class="imper_f ${moon ? 'imper_moon' : 'imper_planet'}">
      <div class="imper_block_vertical">
        <div class="imper_block_image" style="background-image:url(planeten/small/s_x.jpg);">
          <div class="gradient_block_image"></div>
          <div class="imper_block_info_text"><a href="game.php?page=overview&amp;cp=${id}">${name}</a></div>
          <div class="imper_block_info_text"><a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">${coordinate}</a></div>
          <div class="imper_block_info_text">${fields}</div>
          <a class="ico_rows_planet imper_go_planet" href="game.php?page=overview&amp;cp=${id}"></a>
        </div>
        <div class="imper_block_th"></div>${cells(stock ?? [])}
        <div class="imper_block_th"></div>${cells(production ?? [])}
        <div class="u000"><div class="imper_block_th"></div>${cells(build ?? [])}</div>
        <div class="u200"><div class="imper_block_th"></div>${cells(fleet ?? [])}</div>
        <div class="u400"><div class="imper_block_th"></div>${cells(defense ?? [])}</div>
      </div>
    </td>
  `
}

export const STOCK_IDS: number[] = [901, 902, 903, 911, 912, 913, 914, 915, 916]
export const PRODUCTION_IDS: number[] = [901, 902, 903]

export function sigmaColumn(): string {
  return `
    <td class="imper_f"><div class="imper_block_vertical" id="sigma">
      <div class="imper_block_image"><div class="gradient_block_image">&#931;</div></div>
      <div class="imper_block_th"></div>${cells(STOCK_IDS.map(() => '1'))}
      <div class="imper_block_th"></div>${cells(PRODUCTION_IDS.map(() => '1'))}
      <div class="u000"><div class="imper_block_th"></div>${cells(['1'])}</div>
      <div class="u200"><div class="imper_block_th"></div>${cells(['1'])}</div>
      <div class="u400"><div class="imper_block_th"></div>${cells(['1'])}</div>
    </div></td>
  `
}

export function iconColumn(): string {
  return `
    <div style="width: 20px;float: left;">
      <div class="imper_block_image"><div class="imper_block_info_text"></div></div>
      ${iconSection(STOCK_IDS, null)}
      ${iconSection(PRODUCTION_IDS, null)}
      ${iconSection([31], 'u000')}
      ${iconSection([202], 'u200')}
      ${iconSection([401], 'u400')}
    </div>
  `
}

export function labelColumn(): string {
  return `
    <div class="imper_left_part">
      <div class="imper_block_image"><div class="imper_block_info_text"></div></div>
      ${labelSection('Resources', STOCK_IDS, null)}
      ${labelSection('Resources per hour', PRODUCTION_IDS, null)}
      ${labelSection('Buildings', [31], 'u000')}
      ${labelSection('Ships', [202], 'u200')}
      ${labelSection('Planetary Defense', [401], 'u400')}
    </div>
  `
}

export const labelDefenseBandOpen = `<div class="u400"><div class="imper_block_th">Planetary Defense</div>`

export const labelDefenseBandWithoutHeader = '<div class="u400">'

export function labelColumnMissingDefenseBand(): string {
  return labelColumn().replace(labelDefenseBandOpen, labelDefenseBandWithoutHeader)
}

export function empireMatrixBody(): string {
  return `
    ${iconColumn()}
    ${labelColumn()}
    <div class="imper_right_part" id="ipper_planets">
      <table class="imper_table">
        <tr>
          ${sigmaColumn()}
          ${planetColumn(
            1000,
            'Homeworld',
            '[1:2:3]',
            false,
            [
              ['999', '500', '100', '1.234', '100', '200', '300', '400', '500'],
              ['600', '300', '60'],
              ['5'],
              ['10'],
              ['20'],
            ],
            '12 / 163',
          )}
          ${planetColumn(
            1001,
            'Nova',
            '[1:2:4]',
            true,
            [['0', '0', '0', '0', '0', '0', '0', '0', '0'], ['0', '0', '0'], ['0'], ['0'], ['2']],
            '0 / 1',
          )}
        </tr>
      </table>
    </div>
  `
}

export function empireDuplicateElementBody(): string {
  return `
    <div style="width: 20px;float: left;">
      <div class="imper_block_image"><div class="imper_block_info_text"></div></div>
      ${iconSection(STOCK_IDS, null)}
      ${iconSection(PRODUCTION_IDS, null)}
      ${iconSection([31, 31], 'u000')}
      ${iconSection([202], 'u200')}
      ${iconSection([401], 'u400')}
    </div>
    ${labelColumn()}
    <div class="imper_right_part" id="ipper_planets">
      <table class="imper_table">
        <tr>
          ${sigmaColumn()}
          ${planetColumn(
            1000,
            'Homeworld',
            '[1:2:3]',
            false,
            [
              ['999', '500', '100', '1.234', '100', '200', '300', '400', '500'],
              ['600', '300', '60'],
              ['5', '6'],
              ['10'],
              ['20'],
            ],
            '12 / 163',
          )}
        </tr>
      </table>
    </div>
  `
}

export function empireWithoutPlanetColumnBody(): string {
  return `
    ${iconColumn()}
    ${labelColumn()}
    <div id="ipper_planets"><table class="imper_table"><tr>${sigmaColumn()}</tr></table></div>
  `
}

export function empireWithoutFieldCountBody(): string {
  return `
    ${iconColumn()}
    ${labelColumn()}
    <div class="imper_right_part" id="ipper_planets">
      <table class="imper_table"><tr>
        ${sigmaColumn()}
        ${planetColumn(
          1000,
          'Homeworld',
          '[1:2:3]',
          false,
          [['1', '1', '1', '1', '1', '1', '1', '1', '1'], ['1', '1', '1'], ['1'], ['1'], ['1']],
          'some fields',
        )}
      </tr></table>
    </div>
  `
}

export function empireShortColumnBody(): string {
  return `
    ${iconColumn()}
    ${labelColumn()}
    <div class="imper_right_part" id="ipper_planets">
      <table class="imper_table"><tr>
        ${sigmaColumn()}
        ${planetColumn(
          1000,
          'Homeworld',
          '[1:2:3]',
          false,
          [['1', '1', '1', '1', '1', '1', '1', '1', '1'], ['1', '1', '1'], ['1'], ['1']],
          '12 / 163',
        )}
      </tr></table>
    </div>
  `
}

export const defenseSectionBandOpen = '<div class="u400"><div class="imper_block_th"></div>'

export const defenseSectionBandWithoutHeader = '<div class="u400">'

export function iconColumnMissingDefenseBand(): string {
  return iconColumn().replace(defenseSectionBandOpen, defenseSectionBandWithoutHeader)
}

export function empireMisalignedColumnBody(): string {
  return `
    ${iconColumn()}
    ${labelColumn()}
    <div class="imper_right_part" id="ipper_planets">
      <table class="imper_table"><tr>
        ${sigmaColumn()}
        ${planetColumn(
          1000,
          'Homeworld',
          '[1:2:3]',
          false,
          [['1', '1', '1'], ['600'], ['5'], ['10'], ['20']],
          '12 / 163',
        )}
      </tr></table>
    </div>
  `
}
