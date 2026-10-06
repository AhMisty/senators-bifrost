import type { Ack, PageReply } from '../../protocol/ack.ts'
import { requiredAttribute, requiredLinkId, tableRows, textContent } from '../../protocol/dom.ts'
import { controlValue } from '../../protocol/forms.ts'
import { displayed, readInteger } from '../../protocol/numbers.ts'
import { observation } from '../../protocol/page.ts'
import type { Page } from '../../protocol/page.ts'
import { routeAck, routePage } from '../../protocol/request.ts'
import type { Observed } from '../../protocol/result.ts'
import { GAME_ROUTES } from '../../protocol/routes.ts'
import type { Session } from '../../session.ts'
import type { Observation } from '../../types.ts'

export type NoteSummary = {
  id: number
  title: string

  updatedAtText: string

  sizeBytes: number
}

export type NotesPage = Observation & {
  kind: 'notes'
  notes: NoteSummary[]
}

export function readNotes(page: Page): NotesPage {
  page.one('form[action*="mode=delete"]')
  return {
    kind: 'notes',
    ...observation(page),
    notes: tableRows(page, 'tr.classificabarra').map((row) => {
      const cells = row.children('td')
      const title = cells.eq(2).find('a')
      return {
        id: requiredLinkId(page, title),
        title: textContent(title),
        updatedAtText: textContent(cells.eq(1)),

        sizeBytes: displayed(textContent(cells.eq(3))),
      }
    }),
  }
}

export type NotePage = Observation & {
  kind: 'note'

  id: number
  title: string

  priority: number
  text: string
}

export function readNote(page: Page): NotePage {
  const form = page.one('form[action*="mode=insert"]')
  return {
    kind: 'note',
    ...observation(page),
    id: readInteger(form.find('[name="id"]').attr('value')),
    title: requiredAttribute(form.find('[name="title"]'), 'value'),
    priority: readInteger(controlValue(form.find('[name="priority"]'))),
    text: form.find('textarea[name="text"]').text(),
  }
}

export function notes(session: Session): Promise<Observed<PageReply<NotesPage>>> {
  return routePage(session, GAME_ROUTES.notes, {}, readNotes)
}

export function notesDetail(
  session: Session,
  options: { noteId: number },
): Promise<Observed<PageReply<NotePage>>> {
  return routePage(session, GAME_ROUTES.notesDetail, { query: { id: options.noteId } }, readNote)
}

export type NoteInput = {
  noteId?: number
  title?: string
  priority?: number
  text?: string
}

/**
 * Create or replace a note; omitted fields use server defaults rather than preserving stored values.
 *
 * 创建或覆盖笔记；省略的字段使用服务端默认值，不会保留已存内容。
 *
 * @param options - Note content; an omitted or zero noteId creates a note.
 *
 * 笔记内容；noteId 省略或为零时新建笔记。
 */
export function notesInsert(session: Session, options: NoteInput = {}): Promise<Observed<Ack>> {
  return routeAck(session, GAME_ROUTES.notesInsert, {
    method: 'POST',
    body: {
      id: options.noteId ?? 0,
      ...(options.title === undefined ? {} : { title: options.title }),
      ...(options.priority === undefined ? {} : { priority: options.priority }),
      ...(options.text === undefined ? {} : { text: options.text }),
    },
  })
}

export function notesDelete(
  session: Session,
  options: { noteIds: readonly number[] },
): Promise<Observed<Ack>> {
  const body = new URLSearchParams()
  for (const noteId of options.noteIds) body.set(`delmes[${noteId}]`, '1')
  return routeAck(session, GAME_ROUTES.notesDelete, {
    method: 'POST',
    body,
  })
}
