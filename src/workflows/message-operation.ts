import type { Session } from '../session.ts'

const PENDING = new WeakMap<Session, Promise<void>>()

/**
 * Serialize message workflows per Session so they cannot overwrite each other's recipient token.
 *
 * 按 Session 串行执行消息工作流，避免相互覆盖收件人令牌。
 */
export async function runMessageOperation<Value>(
  session: Session,
  run: () => Promise<Value>,
): Promise<Value> {
  const previous = PENDING.get(session)
  const release = Promise.withResolvers<void>()
  PENDING.set(session, release.promise)
  await previous
  try {
    return await run()
  } finally {
    release.resolve()
    if (PENDING.get(session) === release.promise) PENDING.delete(session)
  }
}
