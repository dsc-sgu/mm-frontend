import { diffArrays } from 'diff';
import { Marked, type Links, type Token, type Tokens } from 'marked';

import { sanitizeMarkdownHtml } from './sanitize';

export type RenderedMarkdownBlockChange = 'unchanged' | 'added' | 'deleted';

export type RenderedMarkdownBlock = {
  change: RenderedMarkdownBlockChange;
  html: string;
};

export type RenderedMarkdownDiff =
  | { status: 'rendered'; blocks: RenderedMarkdownBlock[] }
  | { status: 'too-large' }
  | { status: 'failed' };

// A block is compared by `key` and shown as `html`. They differ only for an
// ordered list item, whose number must not make a moved item look rewritten.
type DocumentBlock = {
  key: string;
  html: string;
};

// Rendering runs on the main thread, and parsing time grows faster than the
// text with deep nesting, so a large version is left to the source diff.
const MAX_RENDERED_TEXT_LENGTH = 100_000;

// CodeView unmounts the rendered view whenever its file scrolls out of the
// rendered window, so recent results are kept to make scrolling back cheap.
const RECENT_DIFF_LIMIT = 8;
const recentDiffs = new Map<string, RenderedMarkdownDiff>();

const markdown = new Marked({ gfm: true });

export function buildRenderedMarkdownDiff(
  oldText: string,
  newText: string
): RenderedMarkdownDiff {
  if (
    oldText.length > MAX_RENDERED_TEXT_LENGTH ||
    newText.length > MAX_RENDERED_TEXT_LENGTH
  ) {
    return { status: 'too-large' };
  }

  const key = `${oldText.length}:${oldText}${newText}`;
  const recentDiff = recentDiffs.get(key);

  if (recentDiff) {
    return recentDiff;
  }

  const diff = renderDiff(oldText, newText);

  recentDiffs.set(key, diff);

  if (recentDiffs.size > RECENT_DIFF_LIMIT) {
    recentDiffs.delete(recentDiffs.keys().next().value as string);
  }

  return diff;
}

function renderDiff(oldText: string, newText: string): RenderedMarkdownDiff {
  try {
    const changes = diffArrays(splitBlocks(oldText), splitBlocks(newText), {
      comparator: (left, right) => left.key === right.key,
    });

    return {
      status: 'rendered',
      blocks: changes.flatMap((change) =>
        change.value.map((block) => ({
          change: change.added
            ? 'added'
            : change.removed
              ? 'deleted'
              : 'unchanged',
          html: block.html,
        }))
      ),
    };
  } catch {
    // The source diff stays available, so a parser failure only costs the
    // rendered view of this file.
    return { status: 'failed' };
  }
}

function splitBlocks(text: string): DocumentBlock[] {
  const tokens = markdown.lexer(text);

  return tokens.flatMap((token): DocumentBlock[] => {
    if (token.type === 'space') {
      return [];
    }

    if (token.type === 'list') {
      return splitListItems(token as Tokens.List, tokens.links);
    }

    const html = renderTokens([token], tokens.links);

    return html ? [{ key: html, html }] : [];
  });
}

// Each item becomes a one-item list, so changing one checklist entry does not
// mark the whole list as rewritten.
function splitListItems(list: Tokens.List, links: Links): DocumentBlock[] {
  const firstNumber = list.start === '' ? 1 : list.start;

  return list.items.map((item, index) => {
    const itemList = { ...list, raw: item.raw, items: [item] };

    return {
      key: renderTokens([{ ...itemList, start: 1 }], links),
      html: renderTokens(
        [{ ...itemList, start: list.ordered ? firstNumber + index : '' }],
        links
      ),
    };
  });
}

// Rendering block by block also closes any raw HTML tag a block left open, so
// it cannot swallow the blocks after it. Reference-style links still resolve
// through the definitions of the whole document.
function renderTokens(tokens: Token[], links: Links): string {
  return sanitizeMarkdownHtml(
    markdown.parser(Object.assign(tokens, { links }))
  );
}
