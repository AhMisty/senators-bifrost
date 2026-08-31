// 通用工具函数：纯函数、无内部状态，供 new-src 各模块复用
// 从 Set-Cookie 列表中解析 cookieName 对应的值；找不到返回 null
// 注意：getSetCookie() 需要 Node >= 18.14，此处不做运行时兜底
export const extractToken = (headers: Headers, cookieName: string): string | null => {
  const prefix = `${cookieName}=`
  for (const cookie of headers.getSetCookie()) {
    // lastIndexOf 定位到串尾最后一次出现，防御 cookie 名出现在其他属性值中的情况
    const start = cookie.lastIndexOf(prefix) + prefix.length
    if (start < prefix.length) continue
    // 裸 cookie（无 ';' 属性）也截到串尾，而非像旧实现那样视为未找到
    const end = cookie.indexOf(';', start)
    const value = end === -1 ? cookie.slice(start) : cookie.slice(start, end)
    if (value.length > 0) return value
  }
  return null
}
