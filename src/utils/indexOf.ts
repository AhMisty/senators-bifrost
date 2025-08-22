export const indexOfSlice = (
  body: string,
  position: number,
  result: { failed: boolean; data: string },
  key1: string,
  key2: string,
) => {
  const start = body.indexOf(key1, position) + key1.length
  if (start === key1.length - 1) {
    result.failed = true
    return position
  }
  const end = body.indexOf(key2, start)
  if (end === -1) {
    result.failed = true
    return start
  }
  result.failed = false
  result.data = body.slice(start, end)
  return end + key2.length
}

export const indexOfOrder = (
  body: string,
  position: number,
  result: { failed: boolean },
  ...keys: string[]
) => {
  for (const key of keys) {
    const index = body.indexOf(key, position)
    if (index === -1) {
      result.failed = true
      return position
    }
    position = index + key.length
  }
  result.failed = false
  return position
}
