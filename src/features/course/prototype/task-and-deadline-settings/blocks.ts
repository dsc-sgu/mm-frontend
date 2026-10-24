// PROTOTYPE (#181): `taskApply: blocks` — per-block drafts as mm-backend
// PR #187 has them. There is no Course lock: an edit of a block becomes the
// author's own draft of that block, «Применить» publishes all of them, and
// each draft is merged with what others published meanwhile. Position and
// data merge separately; data changed on both sides, or a deletion against
// a change, is a conflict, and then nothing is published.
import type {
  CourseContentBlockItem,
  RichTextNode,
} from '@/features/course/features/page/model/types';
import { NEW_TASK_ID } from './editor/new-task';

type Block = CourseContentBlockItem;

export type BlockChange = 'data' | 'position' | 'both';

type DraftBase = { blockId: string; label: string; taskId: string | null };

/** One block of the Teacher's draft, compared with the version it is based on. */
export type BlockDraft =
  | (DraftBase & { kind: 'created' })
  | (DraftBase & { kind: 'deleted' })
  | (DraftBase & { kind: 'edited'; change: BlockChange });

export type ConflictReason =
  | 'both-edited'
  | 'deleted-by-them'
  | 'deleted-by-me';

export type BlockConflict = {
  blockId: string;
  label: string;
  reason: ConflictReason;
  /** Their version; null when they deleted the block. */
  theirs: Block | null;
};

export type MergeOutcome =
  | {
      status: 'merged';
      content: Block[];
      /** Labels of blocks whose published changes were taken as they are. */
      theirsKept: string[];
    }
  | { status: 'conflict'; conflicts: BlockConflict[] };

export type TaskTitle = (taskId: string) => string;

export function blockTaskId(block: Block) {
  if (block.type !== 'assignment') {
    return null;
  }

  return block.taskId === NEW_TASK_ID ? block.id : block.taskId;
}

/**
 * A block's data as the backend compares it: without ids and ranks, and
 * with keys sorted, since the editor writes them back in its own order.
 */
function dataOf(block: Block) {
  return JSON.stringify(block, (key, value: unknown) => {
    if (key === 'id' || key === 'rank') {
      return undefined;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      );
    }
    return value;
  });
}

/** Ranks follow the array order: the editor sorts blocks by rank. */
function reranked(content: readonly Block[]): Block[] {
  return content.map((block, index) => ({
    ...block,
    rank: String(index).padStart(4, '0'),
  }));
}

function plainText(nodes: readonly RichTextNode[]) {
  return nodes.map((node) => node.text).join('');
}

function clip(text: string, length = 48) {
  const trimmed = text.trim();
  return trimmed.length > length
    ? `${trimmed.slice(0, length).trimEnd()}…`
    : trimmed;
}

/** A block's text for a short preview. */
export function blockText(block: Block): string {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'quote':
      return plainText(block.children);
    case 'list':
      return block.items.map((item) => plainText(item.children)).join(' · ');
    case 'spoiler':
      return plainText(block.title);
    case 'code':
      return block.code;
    default:
      return '';
  }
}

export function blockLabel(block: Block, title: TaskTitle) {
  switch (block.type) {
    case 'assignment':
      return `Задание «${title(blockTaskId(block)!) || 'Без названия'}»`;
    case 'heading':
      return `Заголовок «${clip(plainText(block.children))}»`;
    case 'paragraph':
      return `Абзац «${clip(plainText(block.children))}»`;
    case 'quote':
      return `Цитата «${clip(plainText(block.children))}»`;
    case 'list':
      return `Список «${clip(plainText(block.items[0]?.children ?? []))}»`;
    case 'spoiler':
      return `Спойлер «${clip(plainText(block.title))}»`;
    case 'code':
      return 'Блок кода';
    case 'image':
      return 'Картинка';
    case 'files':
      return 'Файлы';
  }
}

/**
 * Blocks whose position changed: everything outside the longest run of
 * blocks that kept their relative order.
 */
function movedBlockIds(base: readonly Block[], working: readonly Block[]) {
  const index = new Map(base.map((block, position) => [block.id, position]));
  const common = working.filter((block) => index.has(block.id));
  const order = common.map((block) => index.get(block.id)!);
  const length = order.map(() => 1);
  const previous = order.map(() => -1);
  let end = -1;

  for (let i = 0; i < order.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      if (order[j]! < order[i]! && length[j]! + 1 >= length[i]!) {
        length[i] = length[j]! + 1;
        previous[i] = j;
      }
    }
    // On a tie keep the later run: a block moved up is the one marked.
    if (end === -1 || length[i]! >= length[end]!) {
      end = i;
    }
  }

  const kept = new Set<string>();
  for (let i = end; i !== -1; i = previous[i]!) {
    kept.add(common[i]!.id);
  }

  return new Set(
    common.filter((block) => !kept.has(block.id)).map((block) => block.id)
  );
}

/**
 * The Teacher's drafts: blocks of the working copy that differ from their
 * base. A Task's settings are the data of its block, so a Task edit kept in
 * the draft makes its block edited too.
 */
export function blockDraftsOf(
  base: readonly Block[],
  working: readonly Block[],
  draftTaskIds: ReadonlySet<string>,
  title: TaskTitle
): BlockDraft[] {
  const byId = new Map(base.map((block) => [block.id, block]));
  const inWorking = new Set(working.map((block) => block.id));
  const moved = movedBlockIds(base, working);
  const drafts: BlockDraft[] = [];

  for (const block of working) {
    const draft = {
      blockId: block.id,
      label: blockLabel(block, title),
      taskId: blockTaskId(block),
    };
    const before = byId.get(block.id);

    if (!before) {
      drafts.push({ ...draft, kind: 'created' });
      continue;
    }

    const data =
      dataOf(before) !== dataOf(block) ||
      (draft.taskId !== null && draftTaskIds.has(draft.taskId));
    const change = blockChange(data, moved.has(block.id));

    if (change) {
      drafts.push({ ...draft, kind: 'edited', change });
    }
  }

  for (const block of base) {
    if (!inWorking.has(block.id)) {
      drafts.push({
        blockId: block.id,
        label: blockLabel(block, title),
        taskId: blockTaskId(block),
        kind: 'deleted',
      });
    }
  }

  return drafts;
}

function blockChange(data: boolean, position: boolean): BlockChange | null {
  if (data && position) {
    return 'both';
  }
  if (data) {
    return 'data';
  }

  return position ? 'position' : null;
}

function changesData(draft: BlockDraft) {
  return draft.kind === 'edited' && draft.change !== 'position';
}

/**
 * Three-way merge of every block, by the rules of PR #187: base is the
 * version the Teacher's draft started from, head is what is published now.
 * The result keeps the Teacher's order.
 */
export function mergeWithHead(
  base: readonly Block[],
  head: readonly Block[],
  working: readonly Block[],
  title: TaskTitle
): MergeOutcome {
  const baseById = new Map(base.map((block) => [block.id, block]));
  const headById = new Map(head.map((block) => [block.id, block]));
  const workingIds = new Set(working.map((block) => block.id));
  const moved = movedBlockIds(base, working);
  const conflicts: BlockConflict[] = [];
  const theirsKept: string[] = [];
  const content: Block[] = [];

  for (const block of working) {
    const before = baseById.get(block.id);

    if (!before) {
      content.push(block);
      continue;
    }

    const theirs = headById.get(block.id) ?? null;
    const mineData = dataOf(before) !== dataOf(block);
    const theirsData = theirs !== null && dataOf(before) !== dataOf(theirs);

    if (!theirs) {
      if (mineData || moved.has(block.id)) {
        conflicts.push(conflict(block, 'deleted-by-them', null, title));
      } else {
        theirsKept.push(blockLabel(before, title));
      }
      continue;
    }

    if (mineData && theirsData && dataOf(block) !== dataOf(theirs)) {
      conflicts.push(conflict(block, 'both-edited', theirs, title));
      continue;
    }

    if (theirsData && !mineData) {
      theirsKept.push(blockLabel(theirs, title));
      content.push({ ...theirs, rank: block.rank });
      continue;
    }

    content.push(block);
  }

  for (const block of base) {
    const theirs = headById.get(block.id);

    if (
      !workingIds.has(block.id) &&
      theirs &&
      dataOf(theirs) !== dataOf(block)
    ) {
      conflicts.push(conflict(block, 'deleted-by-me', theirs, title));
    }
  }

  return conflicts.length > 0
    ? { status: 'conflict', conflicts }
    : { status: 'merged', content: reranked(content), theirsKept };
}

function conflict(
  block: Block,
  reason: ConflictReason,
  theirs: Block | null,
  title: TaskTitle
): BlockConflict {
  return {
    blockId: block.id,
    label: blockLabel(block, title),
    reason,
    theirs,
  };
}

/**
 * The draft of one block now starts from the published head, as after
 * `PATCH` with the head's `version`: the Teacher's version wins next time.
 */
export function rebaseBlock(
  base: readonly Block[],
  head: readonly Block[],
  blockId: string
): Block[] {
  const theirs = head.find((block) => block.id === blockId);

  if (!theirs) {
    return base.filter((block) => block.id !== blockId);
  }

  return base.some((block) => block.id === blockId)
    ? base.map((block) => (block.id === blockId ? theirs : block))
    : insertLike(base, head, theirs);
}

/** The working copy with one block taken from the head as it is. */
export function takeTheirBlock(
  working: readonly Block[],
  head: readonly Block[],
  blockId: string
): Block[] {
  const theirs = head.find((block) => block.id === blockId);

  if (!theirs) {
    return working.filter((block) => block.id !== blockId);
  }

  return reranked(
    working.some((block) => block.id === blockId)
      ? working.map((block) => (block.id === blockId ? theirs : block))
      : insertLike(working, head, theirs)
  );
}

/** Puts a block back after its nearest preceding neighbour in `order`. */
function insertLike(
  target: readonly Block[],
  order: readonly Block[],
  block: Block
): Block[] {
  const ids = new Set(target.map((item) => item.id));
  const position = order.findIndex((item) => item.id === block.id);
  const neighbour = order
    .slice(0, position)
    .reverse()
    .find((item) => ids.has(item.id));
  const at = neighbour
    ? target.findIndex((item) => item.id === neighbour.id) + 1
    : 0;

  return [...target.slice(0, at), block, ...target.slice(at)];
}

function appendText(nodes: readonly RichTextNode[], suffix: string) {
  const last = nodes.at(-1);

  if (!last) {
    return [{ id: 'their-text', type: 'text' as const, text: suffix.trim() }];
  }

  return [...nodes.slice(0, -1), { ...last, text: last.text + suffix }];
}

/** What another Teacher writes into a text block; null for other blocks. */
function theirEdit(block: Block): Block | null {
  switch (block.type) {
    case 'paragraph':
    case 'quote':
      return {
        ...block,
        children: appendText(
          block.children,
          ' Уточнение кафедры от 20.10: подробности в объявлении.'
        ),
      };
    case 'heading':
      return {
        ...block,
        children: appendText(block.children, ' (обновлено)'),
      };
    case 'list':
      return {
        ...block,
        items: block.items.map((item, index) =>
          index === block.items.length - 1
            ? {
                ...item,
                children: appendText(item.children, ' Уточнено кафедрой.'),
              }
            : item
        ),
      };
    default:
      return null;
  }
}

/**
 * Scenario 8: another Teacher publishes his own block drafts meanwhile. He
 * edits a block the Teacher has also edited or deleted (a conflict), a
 * block the Teacher only moved (merges), and one the Teacher left alone.
 */
export function simulateTheirPublication(
  base: readonly Block[],
  drafts: readonly BlockDraft[]
): { head: Block[]; touched: string[] } {
  const byId = new Map(base.map((block) => [block.id, block]));
  const drafted = new Set(drafts.map((draft) => draft.blockId));
  const editable = (blockId: string) => {
    const block = byId.get(blockId);
    return block ? theirEdit(block) !== null : false;
  };

  const targets = [
    drafts.find(
      (draft) =>
        (changesData(draft) || draft.kind === 'deleted') &&
        editable(draft.blockId)
    )?.blockId,
    drafts.find(
      (draft) =>
        draft.kind === 'edited' &&
        draft.change === 'position' &&
        editable(draft.blockId)
    )?.blockId,
    [...base]
      .reverse()
      .find((block) => block.type === 'paragraph' && !drafted.has(block.id))
      ?.id,
  ].filter((blockId): blockId is string => Boolean(blockId));
  const touched = new Set(targets);

  return {
    head: base.map((block) =>
      touched.has(block.id) ? (theirEdit(block) ?? block) : block
    ),
    touched: targets,
  };
}

/**
 * Scenario 3: the Teacher already has drafts — the Docker Task moved below
 * Compose and the paragraph about the training stand rewritten.
 */
export function sampleOwnDrafts(base: readonly Block[]): Block[] {
  const docker = base.find((block) => block.id === 'ref-docker');
  const withoutDocker = base.filter((block) => block.id !== 'ref-docker');
  const at = withoutDocker.findIndex((block) => block.id === 'ref-compose');
  const moved =
    docker && at !== -1
      ? [
          ...withoutDocker.slice(0, at + 1),
          docker,
          ...withoutDocker.slice(at + 1),
        ]
      : [...base];

  return reranked(moved).map((block) =>
    block.type === 'paragraph' &&
    plainText(block.children).startsWith('Учебный стенд')
      ? {
          ...block,
          children: appendText(
            block.children,
            ' Без доступа лабораторную не начать: проверьте почту заранее.'
          ),
        }
      : block
  );
}
