export const randomIPv4 = () => {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(
    Math.random() * 256,
  )}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`
}
