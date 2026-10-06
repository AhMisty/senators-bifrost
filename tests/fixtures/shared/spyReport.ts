function spyReportBody(
  containers: string[],
  options: { head?: string; footer?: string } = {},
): string {
  return `
    <div class="spyRaport">
      ${options.head ?? '<div class="spyRaportHead"><a href="game.php?page=galaxy&amp;galaxy=1&amp;system=2">Spy on 1:2:3</a></div>'}
      ${containers.join('\n')}
      ${(options.footer ?? '<div class="spyRaportFooter">Nothing to report</div>').replace('<div class="spyRaportFooter">', '<div class="spyRaportFooter"><a href="game.php?page=fleetTable&amp;galaxy=1&amp;system=2&amp;planet=3&amp;planettype=1&amp;target_mission=1">Attack</a> ')}
    </div>
  `
}

function container(classId: string, name: string, cells: string[]): string {
  return `
    <div class="spyRaportContainer">
      <div class="spyRaportContainerHead spyRaportContainerHeadClass${classId}">${name}</div>
      <div class="spyRaportContainerRow clearfix">
        ${cells.map((cell) => `<div class="spyRaportContainerCell">${cell}</div>`).join('\n')}
      </div>
    </div>
  `
}

export const spyReportWithDuplicateSimulatorId: string = spyReportBody(
  [container('200', 'Ships', ['Small Cargo', '1.000'])],
  {
    footer:
      '<div class="spyRaportFooter"><a href="game.php?page=battleSimulator&amp;im[202]=1000&amp;im[202]=7&amp;im[203]=4">Simulate</a></div>',
  },
)

export const spyReportWithMismatchedSimulatorCount: string = spyReportBody(
  [container('200', 'Ships', ['Small Cargo', '1.000'])],
  {
    footer:
      '<div class="spyRaportFooter"><a href="game.php?page=battleSimulator&amp;im[202]=1000&amp;im[203]=4&amp;im[204]=1">Simulate</a></div>',
  },
)

export const spyReportWithNestedContainer: string = spyReportBody([
  `
    <div class="spyRaportContainer">
      <div class="spyRaportContainerHead spyRaportContainerHeadClass0">Buildings</div>
      <div class="spyRaportContainerRow clearfix"></div>
      ${container('1', 'Moon', ['Metal Store', '2'])}
    </div>
  `,
])

export const spyReportWithIncompleteRow: string = spyReportBody([
  `
    <div class="spyRaportContainer">
      <div class="spyRaportContainerHead spyRaportContainerHeadClass400">Defense</div>
      <div class="spyRaportContainerRow clearfix">
        <div class="spyRaportContainerCell">Rocket Launcher</div>
        <div class="spyRaportContainerCell">5</div>
        <div class="spyRaportContainerCell">Light Laser</div>
      </div>
    </div>
  `,
])

export const spyReportWithoutHeadClass: string = spyReportBody([
  `
    <div class="spyRaportContainer">
      <div class="spyRaportContainerHead">Defense</div>
      <div class="spyRaportContainerRow clearfix">
        <div class="spyRaportContainerCell">Rocket Launcher</div>
        <div class="spyRaportContainerCell">5</div>
      </div>
    </div>
  `,
])

export const spyReportWithForeignHeadClass: string = spyReportBody([
  `
    <div class="spyRaportContainer">
      <div class="spyRaportContainerHead spyRaportContainerHead">Defense</div>
      <div class="spyRaportContainerRow clearfix">
        <div class="spyRaportContainerCell">Rocket Launcher</div>
        <div class="spyRaportContainerCell">5</div>
      </div>
    </div>
  `,
])

export const twoSpyReports: string = spyReportBody([
  container('0', 'Buildings', ['Metal Mine', '5']),
]).concat(spyReportBody([container('400', 'Defense', ['Rocket Launcher', '3'])]))
