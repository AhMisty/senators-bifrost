export const numericalString = (string: string): number =>
  parseInt(string?.replaceAll('.', '')) || 0
