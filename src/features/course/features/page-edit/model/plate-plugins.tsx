import { CodeBlockRules, unwrapCodeBlock } from '@platejs/code-block';
import { CodeBlockPlugin, CodeLinePlugin } from '@platejs/code-block/react';
import { IndentPlugin } from '@platejs/indent/react';
import { LinkRules } from '@platejs/link';
import { LinkPlugin } from '@platejs/link/react';
import { BulletedListRules, OrderedListRules } from '@platejs/list';
import { ListPlugin } from '@platejs/list/react';
import { TogglePlugin } from '@platejs/toggle/react';
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
import {
  KEYS,
  NodeIdPlugin,
  TrailingBlockPlugin,
  type SlateEditor,
} from 'platejs';
import { createPlatePlugin, ParagraphPlugin } from 'platejs/react';

import { clampCourseListIndent } from '@/features/course/features/page/model/list-indent';
import {
  COURSE_ASSIGNMENT_NODE,
  COURSE_FILES_NODE,
  COURSE_IMAGE_NODE,
  COURSE_SPOILER_TITLE_NODE,
  type CoursePlateElement,
} from '@/features/course/features/page-edit/model/plate-content';
import {
  BlockquoteElement,
  BoldLeaf,
  CodeBlockElement,
  CodeLineElement,
  CourseAssignmentElement,
  CourseFilesElement,
  CourseImageElement,
  CourseListWrapper,
  CourseSpoilerTitleElement,
  HeadingOneElement,
  HeadingThreeElement,
  HeadingTwoElement,
  InlineCodeLeaf,
  ItalicLeaf,
  LinkElement,
  ParagraphElement,
  ToggleElement,
} from '@/features/course/features/page-edit/ui/plate/nodes';

const CourseImagePlugin = createPlatePlugin({
  key: COURSE_IMAGE_NODE,
  node: {
    isElement: true,
    isVoid: true,
    type: COURSE_IMAGE_NODE,
    component: CourseImageElement,
  },
});

const CourseFilesPlugin = createPlatePlugin({
  key: COURSE_FILES_NODE,
  node: {
    isElement: true,
    isVoid: true,
    type: COURSE_FILES_NODE,
    component: CourseFilesElement,
  },
});

const CourseAssignmentPlugin = createPlatePlugin({
  key: COURSE_ASSIGNMENT_NODE,
  node: {
    isElement: true,
    isVoid: true,
    type: COURSE_ASSIGNMENT_NODE,
    component: CourseAssignmentElement,
  },
});

const CourseSpoilerTitlePlugin = createPlatePlugin({
  key: COURSE_SPOILER_TITLE_NODE,
  node: {
    isElement: true,
    type: COURSE_SPOILER_TITLE_NODE,
    component: CourseSpoilerTitleElement,
  },
});

function isSamePath(left: number[], right: number[]) {
  return (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  );
}

function isMarkdownInputEnabled({ editor }: { editor: SlateEditor }) {
  return !editor.api.some({
    match: { type: editor.getType(KEYS.codeBlock) },
  });
}

const CourseCodeBlockBackspacePlugin = createPlatePlugin({
  key: 'course_code_block_backspace',
}).overrideEditor(({ editor, tf: { deleteBackward } }) => ({
  transforms: {
    deleteBackward(unit) {
      if (editor.selection && !editor.api.isExpanded()) {
        const codeLine = editor.api.above({
          match: { type: editor.getType(KEYS.codeLine) },
        });
        const codeBlock = editor.api.above({
          match: { type: editor.getType(KEYS.codeBlock) },
        });

        if (codeLine && codeBlock) {
          const [, codeLinePath] = codeLine;
          const [, codeBlockPath] = codeBlock;
          const firstCodeLinePath = [...codeBlockPath, 0];
          const isFirstCodeLine = isSamePath(codeLinePath, firstCodeLinePath);
          const isAtCodeLineStart = editor.api.isStart(
            editor.selection.anchor,
            codeLinePath
          );

          if (isFirstCodeLine && isAtCodeLineStart) {
            unwrapCodeBlock(editor);
            return;
          }
        }
      }

      deleteBackward(unit);
    },
  },
}));

function isCourseListElement(node: unknown): node is CoursePlateElement {
  if (typeof node !== 'object' || node === null) return false;

  const element = node as CoursePlateElement;

  return element.listStyleType === KEYS.ol || element.listStyleType === KEYS.ul;
}

function isSameCourseList(
  current: CoursePlateElement,
  previous: CoursePlateElement
) {
  const currentListId = current.courseListId;
  const previousListId = previous.courseListId;

  if (typeof currentListId === 'string' || typeof previousListId === 'string') {
    return currentListId === previousListId;
  }

  return true;
}

const CourseListIndentPlugin = createPlatePlugin({
  key: 'course_list_indent',
}).overrideEditor(({ editor, tf: { normalizeNode } }) => ({
  transforms: {
    normalizeNode([node, path]) {
      if (isCourseListElement(node)) {
        const itemIndex = path.at(-1) ?? 0;
        const previousEntry =
          itemIndex > 0
            ? editor.api.node([...path.slice(0, -1), itemIndex - 1])
            : undefined;
        const previousNode = previousEntry?.[0];
        const previousIndent =
          isCourseListElement(previousNode) &&
          isSameCourseList(node, previousNode)
            ? previousNode.indent
            : null;
        const indent = clampCourseListIndent(node.indent, previousIndent);

        if (node.indent !== indent) {
          editor.tf.setNodes({ indent }, { at: path });
          return;
        }
      }

      normalizeNode([node, path]);
    },
  },
}));

export const coursePagePlatePlugins = [
  NodeIdPlugin,
  ParagraphPlugin.withComponent(ParagraphElement),
  H1Plugin.configure({
    inputRules: [HeadingRules.markdown({ enabled: isMarkdownInputEnabled })],
    node: { component: HeadingOneElement },
    rules: {
      break: { empty: 'reset', splitReset: true },
      delete: { start: 'reset' },
    },
    shortcuts: { toggle: { keys: 'mod+alt+1' } },
  }),
  H2Plugin.configure({
    inputRules: [HeadingRules.markdown({ enabled: isMarkdownInputEnabled })],
    node: { component: HeadingTwoElement },
    rules: {
      break: { empty: 'reset', splitReset: true },
      delete: { start: 'reset' },
    },
    shortcuts: { toggle: { keys: 'mod+alt+2' } },
  }),
  H3Plugin.configure({
    inputRules: [HeadingRules.markdown({ enabled: isMarkdownInputEnabled })],
    node: { component: HeadingThreeElement },
    rules: {
      break: { empty: 'reset', splitReset: true },
      delete: { start: 'reset' },
    },
    shortcuts: { toggle: { keys: 'mod+alt+3' } },
  }),
  BlockquotePlugin.configure({
    inputRules: [BlockquoteRules.markdown({ enabled: isMarkdownInputEnabled })],
    node: { component: BlockquoteElement },
    rules: { break: { empty: 'default' } },
  }),
  BoldPlugin.configure({
    inputRules: [
      BoldRules.markdown({
        enabled: isMarkdownInputEnabled,
        variant: '*',
      }),
    ],
  }).withComponent(BoldLeaf),
  ItalicPlugin.configure({
    inputRules: [
      ItalicRules.markdown({
        enabled: isMarkdownInputEnabled,
        variant: '*',
      }),
    ],
  }).withComponent(ItalicLeaf),
  CodePlugin.configure({
    inputRules: [CodeRules.markdown({ enabled: isMarkdownInputEnabled })],
    node: { component: InlineCodeLeaf },
    shortcuts: { toggle: { keys: 'mod+e' } },
  }),
  LinkPlugin.configure({
    inputRules: [
      LinkRules.markdown({ enabled: isMarkdownInputEnabled }),
      LinkRules.autolink({
        enabled: isMarkdownInputEnabled,
        variant: 'paste',
      }),
      LinkRules.autolink({
        enabled: isMarkdownInputEnabled,
        variant: 'space',
      }),
      LinkRules.autolink({
        enabled: isMarkdownInputEnabled,
        variant: 'break',
      }),
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
      BulletedListRules.markdown({
        enabled: isMarkdownInputEnabled,
        variant: '-',
      }),
      OrderedListRules.markdown({
        enabled: isMarkdownInputEnabled,
        variant: '.',
      }),
    ],
    inject: {
      targetPlugins: [KEYS.p, KEYS.h1, KEYS.h2, KEYS.h3, KEYS.blockquote],
    },
    render: {
      belowNodes: (props) => {
        if (!props.element.listStyleType) return;

        return CourseListWrapper;
      },
    },
  }),
  CourseListIndentPlugin,
  CodeBlockPlugin.configure({
    inputRules: [
      CodeBlockRules.markdown({
        enabled: isMarkdownInputEnabled,
        on: 'match',
      }),
    ],
    node: { component: CodeBlockElement },
  }),
  CodeLinePlugin.withComponent(CodeLineElement),
  CourseCodeBlockBackspacePlugin,
  TogglePlugin.withComponent(ToggleElement),
  CourseSpoilerTitlePlugin,
  CourseImagePlugin,
  CourseFilesPlugin,
  CourseAssignmentPlugin,
  TrailingBlockPlugin.configure({
    options: { type: KEYS.p },
  }),
];
