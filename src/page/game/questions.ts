import type { PageReply } from '../../protocol/ack.ts'
import { contentText, linkUrl, selections, textContent } from '../../protocol/dom.ts'
import { readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

export type HelpQuestion = {
  categoryId: number
  questionId: number
  title: string
}

export type QuestionsPage = Observation & {
  kind: 'questions'

  questions: HelpQuestion[]
}

export type AnswerPage = Observation & {
  kind: 'answer'

  title: string
  body: string
}

export function readQuestions(page: Page): QuestionsPage {
  page.one('td.left')
  return {
    kind: 'questions',
    ...observation(page),
    questions: selections(page.$('a[href*="page=questions"][href*="mode=single"]')).map((item) => {
      const query = linkUrl(page, item).searchParams
      return {
        categoryId: readInteger(query.get('categoryID')),
        questionId: readInteger(query.get('questionID')),
        title: textContent(item),
      }
    }),
  }
}

export function readAnswer(page: Page): AnswerPage {
  page.one('td.left')
  return {
    kind: 'answer',
    ...observation(page),
    title: textContent(page.$('table th').eq(1)),
    body: contentText(page.$('td.left')),
  }
}

export function questions(session: Session): Promise<Observed<PageReply<QuestionsPage>>> {
  return routePage(session, GAME_ROUTES.questions, {}, readQuestions)
}

/**
 * Read one help answer; unknown identifiers can return the questions overview as a redirect.
 *
 * 读取一条帮助回答；未知标识可能重定向至问题总览。
 */
export function answer(
  session: Session,
  options: { categoryId: number; questionId: number },
): Promise<Observed<PageReply<AnswerPage>>> {
  return routePage(
    session,
    GAME_ROUTES.questionsSingle,
    {
      query: { categoryID: options.categoryId, questionID: options.questionId },
    },
    readAnswer,
  )
}
