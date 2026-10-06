export function catalogueEntry(id: number, parts: string): string {
  return `<div class="build_box" id="ofic_${id}">${parts}</div>`
}

export function entryHead(extra: string, level: string): string {
  return `<div class="head">${extra}<span class="gov6">${level}</span></div>`
}

export function entryPrices(...lines: string[]): string {
  return `<div class="prices_mini"><font>${lines.map((line) => `${line}<br>`).join('')}</font></div>`
}

export function entryRequirement(id: number, name: string, progress: string): string {
  return (
    '<div class="required_block required_smal_text">' +
    `<a href="#" onclick="return Dialog.info(${id})" class="tooltip" data-tooltip-content="<span>${name} Level 2 (${progress})</span>">` +
    `<img src="./img/gebaeude/${id}.gif" alt="${name}" />` +
    `<div class="text">${progress}</div></a>` +
    '</div>'
  )
}

export const entryWithBonusLines: string = catalogueEntry(
  601,
  [
    entryHead('', '(Level 1/20)'),
    '<div class="time_build_mini">1.000</div>',
    entryPrices('--5% attack', '+3 fleet slots', 'Energy tech 5', ''),
    entryRequirement(21, 'Shipyard', '0/5') + entryRequirement(22, 'Robotics factory', '0/2'),
    '<input type="hidden" name="id" value="601">',
    '<button type="submit">Buy</button>',
  ].join(''),
)

export const entryWithUnreadableFigures: string = catalogueEntry(
  604,
  [
    entryHead('', '(Level 1/20)'),
    '<div class="time_build_mini">1.000</div>',
    entryPrices(
      '+inf% Fleet speed',
      '+nan% fleet slots',
      '--infinity% attack',
      '+Infinity shield',
      '+1.234,5 armour',
      '--2.5 hull',
    ),
    '<input type="hidden" name="id" value="604">',
    '<button type="submit">Buy</button>',
  ].join(''),
)

export const entryWithFloatedNote = `    <div class="build_box" id="ofic_602">
      <div class="head">General<span style="float:right">+10%</span><span class="gov6">(Level 2)</span></div>
      <div class="time_build_mini">2.000</div>
      <input type="hidden" name="id" value="602">
      <button type="submit">Buy</button>
    </div>
  `

export const entryWithoutControl = `
    <div class="build_box" id="ofic_603">
      <div class="head">Admiral<span class="gov6">(Level 20/20)</span></div>
    </div>
  `

export const choiceEntriesWithRenderedPrices = `
    <div class="build_box" id="ofic_1501">
      <div class="head"><strong>Photorians</strong></div>
      <div class="btn_build_border">
        <button type="submit" class="btn_build">Choose Metal <span style="color:lime">1.000</span> Crystal <span style="color:red">500</span></button>
      </div>
      <input type="hidden" name="id" value="1501">
    </div>
    <div class="build_box" id="ofic_1502">
      <div class="head"><strong>Sinuria</strong></div>
      <div class="btn_build_border">
        <span class="btn_build red">Choose <span style="color:lime">2.000</span></span>
      </div>
      <input type="hidden" name="id" value="1502">
    </div>
  `

export const choiceEntryWithoutPrice = `
    <div class="build_box" id="ofic_1501">
      <div class="head"><strong>Photorians</strong></div>
      <div class="btn_build_border">
        <button type="submit" class="btn_build">Choose <span style="color:lime">for free</span></button>
      </div>
      <input type="hidden" name="id" value="1501">
    </div>
  `
