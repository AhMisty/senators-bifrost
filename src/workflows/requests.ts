import { ServerError, ValidationError } from '../protocol/result.ts'
import type { Session } from '../session.ts'
import type { SnapshotResult } from '../types.ts'
const SKIPPED = { status: 'skipped' } as const
const SKIP_REQUEST = Symbol('skipped request')

/**
 * Share a snapshot concurrency budget; authentication errors with a login redirect stop queued reads.
 *
 * 共享快照并发预算；带登录重定向的认证错误会停止排队读取。
 */
export class WorkflowRequests {
  stopped = false
  readonly session: Session
  private readonly limit: number
  private active = 0
  private readonly pending: (() => void)[] = []
  private cursor = 0
  constructor(session: Session, concurrency: number | null) {
    if (concurrency !== null && (!Number.isSafeInteger(concurrency) || concurrency < 1))
      throw new ValidationError('concurrency must be a positive safe integer or null')
    this.session = session
    this.limit = concurrency ?? Infinity
  }

  private settle<T>(result: PromiseSettledResult<T>): SnapshotResult<T> {
    if (result.status === 'fulfilled') return result
    const reason: unknown = result.reason
    if (reason === SKIP_REQUEST) return SKIPPED
    return { status: 'rejected', reason }
  }

  run<T>(read: () => Promise<T>): Promise<T> {
    const deferred = Promise.withResolvers<T>()
    const start = () => {
      if (this.stopped) {
        deferred.reject(SKIP_REQUEST)
        return
      }
      this.active++
      void Promise.try(read)
        .then(deferred.resolve, (reason: unknown) => {
          if (
            reason instanceof ServerError &&
            reason.response !== undefined &&
            this.session.redirectsTo(reason.response, 'index.php')
          )
            this.stopped = true
          deferred.reject(reason)
        })
        .finally(() => {
          this.active--
          this.advance()
        })
    }
    if (this.active < this.limit) start()
    else this.pending.push(start)
    return deferred.promise
  }

  private advance(): void {
    while (this.cursor < this.pending.length && (this.stopped || this.active < this.limit))
      this.pending[this.cursor++]!()
    if (this.cursor === this.pending.length) {
      this.pending.length = 0
      this.cursor = 0
    }
  }

  async read<T>(request: () => Promise<T>): Promise<SnapshotResult<T>> {
    try {
      return { status: 'fulfilled', value: await this.run(request) }
    } catch (reason) {
      return this.settle({ status: 'rejected', reason })
    }
  }

  async batch<T>(requests: readonly (() => Promise<T>)[]): Promise<SnapshotResult<T>[]> {
    const settled = await Promise.allSettled(requests.map((request) => this.run(request)))
    return settled.map((result) => this.settle(result))
  }
}
