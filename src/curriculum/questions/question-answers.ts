import { randomUUID } from 'node:crypto';
import { QuestionType } from '../../../generated/prisma/enums';
import { QUESTION_LIMITS as LIMITS } from './question.constants';

/** Text and/or an image (a question_media id) shown as one choice, matching side or step. */
export interface AnswerItem {
  text?: string;
  mediaId?: string;
}

/**
 * The stored `answers` of each question type (Decision Log D22, D23). Choices,
 * pairs and steps keep an `id` across edits so attempts can refer to them.
 */
export type QuestionAnswers =
  | { options: (AnswerItem & { id: string; correct: boolean })[] } // MULTIPLE_CHOICE: exactly one correct
  | { correct: boolean } // TRUE_FALSE
  | { blanks: { accepted: string[] }[] } // FILL_BLANK: one entry per ___ in the prompt
  | { pairs: { id: string; left: AnswerItem; right: AnswerItem }[] } // MATCHING
  | { steps: (AnswerItem & { id: string })[] }; // SEQUENCE, in the correct order

type Raw = Record<string, unknown>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isRaw = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Blanks in a fill-in-the-blank prompt: each run of three or more underscores (D23). */
export const countBlanks = (promptText: string) =>
  (promptText.match(/_{3,}/g) ?? []).length;

/** Reads untrusted answers, collecting every problem instead of stopping at the first. */
class AnswerReader {
  readonly errors: string[] = [];
  readonly mediaIds = new Set<string>();

  fail(message: string) {
    this.errors.push(message);
  }

  list(value: unknown, label: string, min: number = LIMITS.MIN_ITEMS) {
    if (!Array.isArray(value)) {
      this.fail(`${label} must be an array`);
      return [];
    }
    if (value.length < min || value.length > LIMITS.MAX_ITEMS) {
      this.fail(`${label} must have ${min} to ${LIMITS.MAX_ITEMS} entries`);
    }
    return value as unknown[];
  }

  /** Keeps a sent id (an edit) or makes a new one; ids are unique within the list. */
  id(value: unknown, label: string, seen: Set<string>): string {
    const sent =
      isRaw(value) && typeof value.id === 'string' && value.id.trim();
    const id = sent || randomUUID();
    if (seen.has(id)) this.fail(`${label}.id is used twice`);
    seen.add(id);
    return id;
  }

  item(value: unknown, label: string): AnswerItem {
    if (!isRaw(value)) {
      this.fail(`${label} must be an object`);
      return {};
    }
    const text = this.text(value.text, `${label}.text`, LIMITS.MAX_ITEM_TEXT);
    const mediaId = this.mediaId(value.mediaId, `${label}.mediaId`);
    if (!text && !mediaId) this.fail(`${label} needs text or an image`);
    return { ...(text && { text }), ...(mediaId && { mediaId }) };
  }

  accepted(value: unknown, label: string): string[] {
    const answers = isRaw(value) ? value.accepted : undefined;
    if (!Array.isArray(answers) || answers.length < 1) {
      this.fail(`${label}.accepted must list at least one answer`);
      return [];
    }
    if (answers.length > LIMITS.MAX_ACCEPTED) {
      this.fail(
        `${label}.accepted can list at most ${LIMITS.MAX_ACCEPTED} answers`,
      );
    }
    const texts = answers.map((answer, i) =>
      this.text(answer, `${label}.accepted[${i}]`, LIMITS.MAX_ACCEPTED_TEXT),
    );
    if (texts.some((text) => !text)) {
      this.fail(`${label}.accepted can't contain empty answers`);
    }
    return [...new Set(texts.filter((text): text is string => !!text))];
  }

  private text(value: unknown, label: string, max: number) {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') {
      this.fail(`${label} must be a string`);
      return undefined;
    }
    const text = value.trim();
    if (text.length > max)
      this.fail(`${label} must be at most ${max} characters`);
    return text || undefined;
  }

  private mediaId(value: unknown, label: string) {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string' || !UUID.test(value)) {
      this.fail(`${label} must be an image id (UUID)`);
      return undefined;
    }
    this.mediaIds.add(value);
    return value;
  }
}

const BUILDERS: Record<
  QuestionType,
  (read: AnswerReader, raw: Raw, promptText: string) => QuestionAnswers
> = {
  MULTIPLE_CHOICE: (read, raw) => {
    const ids = new Set<string>();
    const options = read
      .list(raw.options, 'answers.options')
      .map((option, i) => {
        const label = `answers.options[${i}]`;
        return {
          id: read.id(option, label, ids),
          ...read.item(option, label),
          correct: isRaw(option) && option.correct === true,
        };
      });
    if (options.filter((option) => option.correct).length !== 1) {
      read.fail('answers.options must have exactly one correct option (D22)');
    }
    return { options };
  },

  TRUE_FALSE: (read, raw) => {
    if (typeof raw.correct !== 'boolean') {
      read.fail('answers.correct must be true or false');
    }
    return { correct: raw.correct === true };
  },

  FILL_BLANK: (read, raw, promptText) => {
    const expected = countBlanks(promptText);
    if (expected === 0) read.fail('The prompt needs at least one ___ blank');
    const blanks = read
      .list(raw.blanks, 'answers.blanks', 1)
      .map((blank, i) => ({
        accepted: read.accepted(blank, `answers.blanks[${i}]`),
      }));
    if (expected > 0 && blanks.length !== expected) {
      read.fail(
        `answers.blanks must have ${expected} entries, one per ___ in the prompt`,
      );
    }
    return { blanks };
  },

  MATCHING: (read, raw) => {
    const ids = new Set<string>();
    const pairs = read.list(raw.pairs, 'answers.pairs').map((pair, i) => {
      const label = `answers.pairs[${i}]`;
      const sides = isRaw(pair) ? pair : {};
      return {
        id: read.id(pair, label, ids),
        left: read.item(sides.left, `${label}.left`),
        right: read.item(sides.right, `${label}.right`),
      };
    });
    return { pairs };
  },

  SEQUENCE: (read, raw) => {
    const ids = new Set<string>();
    const steps = read.list(raw.steps, 'answers.steps').map((step, i) => {
      const label = `answers.steps[${i}]`;
      return { id: read.id(step, label, ids), ...read.item(step, label) };
    });
    return { steps };
  },
};

/**
 * Validates `answers` (an object: the DTO checks that) for the question type and
 * returns them in their stored shape (unknown keys dropped, texts trimmed, ids
 * filled in), plus every image id they use. `errors` is empty when they are valid.
 */
export function normalizeAnswers(
  type: QuestionType,
  raw: Raw,
  promptText: string,
): { answers: QuestionAnswers; mediaIds: string[]; errors: string[] } {
  const read = new AnswerReader();
  const answers = BUILDERS[type](read, raw, promptText);
  return { answers, mediaIds: [...read.mediaIds], errors: read.errors };
}
