// PROTOTYPE (#181): Plate setup for the statement editor. The statement stays
// a Markdown string in the store (diffs, conflicts and «Скопировать условие»
// keep working); Plate edits it as rich text and converts at the edges.
import {
  BlockquoteRules,
  BoldRules,
  CodeRules,
  HeadingRules,
  ItalicRules,
} from '@platejs/basic-nodes';
import {
  BlockquotePlugin,
  BoldPlugin,
  CodePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
} from '@platejs/basic-nodes/react';
import { CodeBlockRules } from '@platejs/code-block';
import { CodeBlockPlugin, CodeLinePlugin } from '@platejs/code-block/react';
import { IndentPlugin } from '@platejs/indent/react';
import { LinkRules } from '@platejs/link';
import { LinkPlugin } from '@platejs/link/react';
import { BulletedListRules, OrderedListRules } from '@platejs/list';
import { ListPlugin } from '@platejs/list/react';
import { MarkdownPlugin } from '@platejs/markdown';
import { KEYS, type SlateEditor, type Value } from 'platejs';
import { ParagraphPlugin } from 'platejs/react';

import {
  BoldLeaf,
  InlineCodeLeaf,
  ItalicLeaf,
  LinkElement,
} from '@/features/course/features/page-edit/ui/plate/nodes';
import {
  BlockquoteElement,
  CodeBlockElement,
  CodeLineElement,
  HeadingOneElement,
  HeadingThreeElement,
  HeadingTwoElement,
  ListWrapper,
  ParagraphElement,
} from '@/features/course/prototype/task-and-deadline-settings/panel/statement/nodes';

const HEADING_RULES = {
  break: { empty: 'reset', splitReset: true },
  delete: { start: 'reset' },
} as const;

// Markdown shortcuts stay off inside a code block.
function enabled({ editor }: { editor: SlateEditor }) {
  return !editor.api.some({
    match: { type: editor.getType(KEYS.codeBlock) },
  });
}

export const statementPlugins = [
  ParagraphPlugin.withComponent(ParagraphElement),
  H1Plugin.configure({
    inputRules: [HeadingRules.markdown({ enabled })],
    node: { component: HeadingOneElement },
    rules: HEADING_RULES,
  }),
  H2Plugin.configure({
    inputRules: [HeadingRules.markdown({ enabled })],
    node: { component: HeadingTwoElement },
    rules: HEADING_RULES,
  }),
  H3Plugin.configure({
    inputRules: [HeadingRules.markdown({ enabled })],
    node: { component: HeadingThreeElement },
    rules: HEADING_RULES,
  }),
  BlockquotePlugin.configure({
    inputRules: [BlockquoteRules.markdown({ enabled })],
    node: { component: BlockquoteElement },
    rules: { break: { empty: 'default' } },
  }),
  BoldPlugin.configure({
    inputRules: [BoldRules.markdown({ enabled, variant: '*' })],
  }).withComponent(BoldLeaf),
  ItalicPlugin.configure({
    inputRules: [ItalicRules.markdown({ enabled, variant: '*' })],
  }).withComponent(ItalicLeaf),
  CodePlugin.configure({
    inputRules: [CodeRules.markdown({ enabled })],
    node: { component: InlineCodeLeaf },
    shortcuts: { toggle: { keys: 'mod+e' } },
  }),
  LinkPlugin.configure({
    inputRules: [
      LinkRules.markdown({ enabled }),
      LinkRules.autolink({ enabled, variant: 'paste' }),
      LinkRules.autolink({ enabled, variant: 'space' }),
    ],
    node: { component: LinkElement },
  }),
  IndentPlugin.configure({
    inject: {
      targetPlugins: [KEYS.p, KEYS.h1, KEYS.h2, KEYS.h3, KEYS.blockquote],
    },
  }),
  ListPlugin.configure({
    inputRules: [
      BulletedListRules.markdown({ enabled, variant: '-' }),
      OrderedListRules.markdown({ enabled, variant: '.' }),
    ],
    inject: {
      targetPlugins: [KEYS.p, KEYS.h1, KEYS.h2, KEYS.h3, KEYS.blockquote],
    },
    render: {
      belowNodes: (props) =>
        props.element.listStyleType ? ListWrapper : undefined,
    },
  }),
  CodeBlockPlugin.configure({
    inputRules: [CodeBlockRules.markdown({ enabled, on: 'match' })],
    node: { component: CodeBlockElement },
  }),
  CodeLinePlugin.withComponent(CodeLineElement),
  MarkdownPlugin,
];

export function markdownToValue(editor: SlateEditor, markdown: string): Value {
  const value = editor
    .getApi(MarkdownPlugin)
    .markdown.deserialize(markdown, { withoutMdx: true });

  return value.length > 0
    ? value
    : [{ type: KEYS.p, children: [{ text: '' }] }];
}

export function valueToMarkdown(editor: SlateEditor) {
  return editor.getApi(MarkdownPlugin).markdown.serialize().trimEnd();
}
