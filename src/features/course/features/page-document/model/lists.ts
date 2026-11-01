import type { DocumentBlock } from './document';
import { clampCourseListIndent } from './list-indent';

type ListItem = Extract<DocumentBlock, { type: 'list-item' }>;
export type ListTreeItem = {
  block: ListItem;
  number: number;
  nestedItems: ListTreeItem[];
};
export function buildListTree(items: ListItem[]): ListTreeItem[] {
  const roots: ListTreeItem[] = [];
  const levels: ListTreeItem[][] = [roots];
  let previous: number | null = null;
  for (const block of items) {
    const indent = clampCourseListIndent(block.data.indent, previous);
    previous = indent;
    while (levels.length > indent) {
      levels.pop();
    }
    if (levels.length < indent) {
      levels.push(levels.at(-1)!.at(-1)!.nestedItems);
    }
    const siblings = levels.at(-1)!;
    const last = siblings.at(-1);
    const number =
      last?.block.data.variant === block.data.variant ? last.number + 1 : 1;
    siblings.push({ block, number, nestedItems: [] });
  }
  return roots;
}
