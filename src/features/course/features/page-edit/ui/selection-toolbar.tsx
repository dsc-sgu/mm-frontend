import { useRef, useState, type ReactNode } from 'react';
import {
  Bold,
  Check,
  ClipboardPaste,
  Code,
  Globe2,
  Italic,
  Link2,
  Mail,
  Phone,
  Route,
  Unlink,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  FloatingPortal,
  flip,
  offset,
  shift,
  useFloatingToolbar,
  useFloatingToolbarState,
} from '@platejs/floating';
import { unwrapLink, upsertLink } from '@platejs/link';
import { KEYS, type Range } from 'platejs';
import {
  useEditorRef,
  useEditorSelector,
  useEventPlateId,
  useSelectionVersion,
} from 'platejs/react';

import { Button } from '@/shadcn/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shadcn/components/ui/dropdown-menu';
import { Input } from '@/shadcn/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shadcn/components/ui/tooltip';
import { cn } from '@/shadcn/lib/utils';
import {
  findCoursePageLinkCandidates,
  normalizeCoursePageLinkInput,
  type CoursePageLinkCandidate,
} from '@/features/course/features/page-edit/model/clipboard-links';
import type { CoursePlateElement } from '@/features/course/features/page-edit/model/plate-content';

type ClipboardLinkState =
  | { status: 'hidden' }
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'unavailable' }
  | {
      status: 'ready';
      candidates: CoursePageLinkCandidate[];
      openPicker: boolean;
    };

type LinkEditorState =
  | { status: 'closed' }
  | {
      status: 'open';
      clipboard: ClipboardLinkState;
      currentHref: string | null;
      error: string | null;
      selection: Range;
      selectionVersion: number | null;
      value: string;
    };

const CLOSED_LINK_EDITOR_STATE: LinkEditorState = { status: 'closed' };

const LINK_KIND_DETAILS: Record<
  CoursePageLinkCandidate['kind'],
  { icon: LucideIcon; label: string }
> = {
  email: { icon: Mail, label: 'Email' },
  internal: { icon: Route, label: 'Внутренняя ссылка' },
  phone: { icon: Phone, label: 'Телефон' },
  url: { icon: Globe2, label: 'Сайт' },
};

function requiresExplicitClipboardRead() {
  return (
    typeof navigator !== 'undefined' && /firefox/iu.test(navigator.userAgent)
  );
}

function readClipboardLinks({
  openPicker = false,
}: { openPicker?: boolean } = {}): Promise<ClipboardLinkState> {
  if (
    typeof navigator === 'undefined' ||
    !window.isSecureContext ||
    !navigator.clipboard?.readText
  ) {
    return Promise.resolve({ status: 'unavailable' });
  }

  return navigator.clipboard
    .readText()
    .then((text) => {
      const candidates = findCoursePageLinkCandidates(text);

      return candidates.length > 0
        ? ({ status: 'ready', candidates, openPicker } as const)
        : ({ status: 'empty' } as const);
    })
    .catch(() => ({ status: 'unavailable' }) as const);
}

function formatCandidateLabel(candidate: CoursePageLinkCandidate) {
  if (candidate.kind === 'email') {
    return candidate.href.replace(/^mailto:/u, '');
  }

  if (candidate.kind === 'phone') {
    return candidate.value;
  }

  try {
    const url = new URL(candidate.href);

    return `${url.host}${url.pathname === '/' ? '' : url.pathname}`;
  } catch {
    return candidate.href;
  }
}

function ToolbarTooltip({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function MarkButton({
  active,
  children,
  label,
  onToggle,
}: {
  active: boolean;
  children: ReactNode;
  label: string;
  onToggle: () => void;
}) {
  return (
    <ToolbarTooltip label={label}>
      <Button
        type="button"
        size="icon-sm"
        variant={active ? 'secondary' : 'ghost'}
        aria-label={label}
        aria-pressed={active}
        className="rounded-lg"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onToggle}
      >
        {children}
      </Button>
    </ToolbarTooltip>
  );
}

function ClipboardLinkButton({
  clipboard,
  onRead,
  onSelect,
}: {
  clipboard: ClipboardLinkState;
  onRead: () => void;
  onSelect: (candidate: CoursePageLinkCandidate) => void;
}) {
  if (clipboard.status === 'hidden') {
    return null;
  }

  if (clipboard.status === 'loading') {
    return (
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled
        aria-label="Чтение буфера обмена"
      >
        <ClipboardPaste className="size-4 animate-pulse" />
      </Button>
    );
  }

  if (clipboard.status !== 'ready') {
    const label =
      clipboard.status === 'idle'
        ? 'Проверить буфер обмена'
        : 'Проверить буфер обмена ещё раз';

    return (
      <ToolbarTooltip label="Проверить буфер · Ctrl/Cmd+V">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={label}
          className="rounded-lg"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onRead}
        >
          <ClipboardPaste className="size-4" />
        </Button>
      </ToolbarTooltip>
    );
  }

  if (clipboard.candidates.length === 1) {
    const candidate = clipboard.candidates[0];

    return (
      <ToolbarTooltip label={`Вставить: ${candidate.href}`}>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Вставить ссылку из буфера обмена"
          className="rounded-lg"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(candidate)}
        >
          <ClipboardPaste className="size-4" />
        </Button>
      </ToolbarTooltip>
    );
  }

  return (
    <DropdownMenu defaultOpen={clipboard.openPicker}>
      <ToolbarTooltip
        label={`Выбрать ссылку из буфера (${clipboard.candidates.length})`}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-lg px-2"
            onMouseDown={(event) => event.preventDefault()}
          >
            <ClipboardPaste className="size-4" />
            {clipboard.candidates.length}
            <span className="sr-only">ссылок в буфере обмена</span>
          </Button>
        </DropdownMenuTrigger>
      </ToolbarTooltip>
      <DropdownMenuContent
        align="end"
        className="ignore-click-outside/toolbar max-h-72 w-80 overflow-y-auto"
      >
        {clipboard.candidates.map((candidate) => {
          const { icon: Icon, label } = LINK_KIND_DETAILS[candidate.kind];

          return (
            <DropdownMenuItem
              key={`${candidate.kind}:${candidate.href}`}
              className="items-start gap-3"
              title={candidate.href}
              onSelect={() => onSelect(candidate)}
            >
              <Icon className="mt-0.5 size-4 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate">
                  {formatCandidateLabel(candidate)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {label}
                </span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CoursePageSelectionToolbar() {
  const editor = useEditorRef();
  const focusedEditorId = useEventPlateId();
  const selectionVersion = useSelectionVersion();
  const clipboardRequestRef = useRef(0);
  const [linkEditor, setLinkEditor] = useState<LinkEditorState>(
    CLOSED_LINK_EDITOR_STATE
  );
  const activeLinkEditor =
    linkEditor.status === 'open' &&
    linkEditor.selectionVersion === selectionVersion
      ? linkEditor
      : CLOSED_LINK_EDITOR_STATE;
  const boldActive = useEditorSelector(
    (currentEditor) => currentEditor.api.hasMark(KEYS.bold),
    []
  );
  const italicActive = useEditorSelector(
    (currentEditor) => currentEditor.api.hasMark(KEYS.italic),
    []
  );
  const codeActive = useEditorSelector(
    (currentEditor) => currentEditor.api.hasMark(KEYS.code),
    []
  );
  const linkActive = useEditorSelector(
    (currentEditor) =>
      Boolean(currentEditor.selection) &&
      currentEditor.api.some({
        match: { type: currentEditor.getType(KEYS.link) },
      }),
    []
  );
  const selectionInsideCodeBlock = useEditorSelector(
    (currentEditor) =>
      Boolean(currentEditor.selection) &&
      currentEditor.api.some({
        match: { type: currentEditor.getType(KEYS.codeBlock) },
      }),
    []
  );
  const floatingState = useFloatingToolbarState({
    editorId: editor.id,
    focusedEditorId,
    hideToolbar: selectionInsideCodeBlock,
    floatingOptions: {
      middleware: [offset(10), flip({ padding: 8 }), shift({ padding: 8 })],
      placement: 'top',
      strategy: 'fixed',
    },
  });
  const { clickOutsideRef, hidden, props, ref } =
    useFloatingToolbar(floatingState);

  function toggleMark(mark: string) {
    editor.tf.toggleMark(mark);
    editor.tf.focus();
  }

  function updateOpenLinkEditor(
    update: (
      current: Extract<LinkEditorState, { status: 'open' }>
    ) => Extract<LinkEditorState, { status: 'open' }>
  ) {
    setLinkEditor((current) =>
      current.status === 'open' ? update(current) : current
    );
  }

  function resolveClipboardLinks(
    requestId: number,
    { openPicker = false }: { openPicker?: boolean } = {}
  ) {
    void readClipboardLinks({ openPicker }).then((clipboard) => {
      if (clipboardRequestRef.current !== requestId) {
        return;
      }

      updateOpenLinkEditor((current) => ({ ...current, clipboard }));
    });
  }

  function requestClipboardLinks() {
    if (activeLinkEditor.status !== 'open') {
      return;
    }

    const requestId = clipboardRequestRef.current + 1;

    clipboardRequestRef.current = requestId;
    updateOpenLinkEditor((current) => ({
      ...current,
      clipboard: { status: 'loading' },
    }));
    resolveClipboardLinks(requestId, { openPicker: true });
  }

  function openLinkEditor() {
    if (!editor.selection) {
      return;
    }

    const selection = structuredClone(editor.selection);
    const linkEntry = editor.api.node({
      match: { type: editor.getType(KEYS.link) },
    });
    const linkElement = linkEntry?.[0] as CoursePlateElement | undefined;
    const currentHref =
      typeof linkElement?.url === 'string' ? linkElement.url : null;
    const shouldReadClipboard =
      !currentHref && !requiresExplicitClipboardRead();
    const requestId = clipboardRequestRef.current + 1;

    clipboardRequestRef.current = requestId;
    setLinkEditor({
      status: 'open',
      clipboard: currentHref
        ? { status: 'hidden' }
        : shouldReadClipboard
          ? { status: 'loading' }
          : { status: 'idle' },
      currentHref,
      error: null,
      selection,
      selectionVersion,
      value: currentHref ?? '',
    });

    if (shouldReadClipboard) {
      resolveClipboardLinks(requestId);
    }
  }

  function closeLinkEditor() {
    if (activeLinkEditor.status !== 'open') {
      return;
    }

    clipboardRequestRef.current += 1;
    editor.tf.select(activeLinkEditor.selection);
    editor.tf.focus();
    setLinkEditor(CLOSED_LINK_EDITOR_STATE);
  }

  function applyLink() {
    if (activeLinkEditor.status !== 'open') {
      return;
    }

    const candidate = normalizeCoursePageLinkInput(activeLinkEditor.value);

    if (!candidate) {
      updateOpenLinkEditor((current) => ({
        ...current,
        error: 'Введите адрес сайта, email, телефон или внутренний путь',
      }));
      return;
    }

    editor.tf.select(activeLinkEditor.selection);
    upsertLink(editor, {
      skipValidation: true,
      url: candidate.href,
    });
    editor.tf.setNodes(
      { linkType: candidate.kind === 'internal' ? 'internal' : 'external' },
      {
        at: editor.selection ?? activeLinkEditor.selection,
        match: { type: editor.getType(KEYS.link) },
      }
    );
    editor.tf.focus();
    setLinkEditor(CLOSED_LINK_EDITOR_STATE);
  }

  function removeLink() {
    if (activeLinkEditor.status !== 'open') {
      return;
    }

    editor.tf.select(activeLinkEditor.selection);
    unwrapLink(editor, { at: activeLinkEditor.selection });
    editor.tf.focus();
    setLinkEditor(CLOSED_LINK_EDITOR_STATE);
  }

  if (hidden) {
    return null;
  }

  return (
    <FloatingPortal>
      <TooltipProvider delayDuration={300}>
        <div
          ref={(node) => {
            ref(node);
            clickOutsideRef(node);
          }}
          role="toolbar"
          aria-label="Форматирование выделенного текста"
          className={cn(
            'ignore-click-outside/toolbar z-60 flex items-center gap-0.5',
            'rounded-xl border border-border bg-popover p-1 text-popover-foreground',
            'shadow-lg shadow-black/10 dark:shadow-black/30'
          )}
          {...props}
        >
          {activeLinkEditor.status === 'closed' ? (
            <>
              <MarkButton
                label="Жирный текст (Ctrl+B)"
                active={boldActive}
                onToggle={() => toggleMark(KEYS.bold)}
              >
                <Bold className="size-4" />
              </MarkButton>
              <MarkButton
                label="Курсив (Ctrl+I)"
                active={italicActive}
                onToggle={() => toggleMark(KEYS.italic)}
              >
                <Italic className="size-4" />
              </MarkButton>
              <MarkButton
                label="Встроенный код (Ctrl+E)"
                active={codeActive}
                onToggle={() => toggleMark(KEYS.code)}
              >
                <Code className="size-4" />
              </MarkButton>
              <div className="mx-1 h-5 w-px bg-border" />
              <MarkButton
                label={linkActive ? 'Изменить ссылку' : 'Добавить ссылку'}
                active={linkActive}
                onToggle={openLinkEditor}
              >
                <Link2 className="size-4" />
              </MarkButton>
            </>
          ) : (
            <form
              className="flex items-center gap-1"
              onBlur={(event) => {
                const nextTarget = event.relatedTarget;

                if (
                  nextTarget instanceof HTMLElement &&
                  (event.currentTarget.contains(nextTarget) ||
                    nextTarget.closest('.ignore-click-outside\\/toolbar'))
                ) {
                  return;
                }

                clipboardRequestRef.current += 1;
                setLinkEditor(CLOSED_LINK_EDITOR_STATE);
              }}
              onSubmit={(event) => {
                event.preventDefault();
                applyLink();
              }}
            >
              <Link2 className="ml-1 size-4 shrink-0 text-muted-foreground" />
              <div className="relative">
                <Input
                  autoFocus
                  aria-label="Адрес ссылки"
                  aria-invalid={Boolean(activeLinkEditor.error)}
                  className="h-8 w-64 pr-2 text-sm shadow-none"
                  placeholder="Сайт, email, телефон или /путь"
                  value={activeLinkEditor.value}
                  onChange={(event) =>
                    updateOpenLinkEditor((current) => ({
                      ...current,
                      error: null,
                      value: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      closeLinkEditor();
                    }
                  }}
                  onPaste={(event) => {
                    const candidates = findCoursePageLinkCandidates(
                      event.clipboardData.getData('text/plain')
                    );

                    if (candidates.length === 0) {
                      return;
                    }

                    event.preventDefault();
                    updateOpenLinkEditor((current) => ({
                      ...current,
                      clipboard: {
                        status: 'ready',
                        candidates,
                        openPicker: candidates.length > 1,
                      },
                      error: null,
                      value:
                        candidates.length === 1
                          ? candidates[0].href
                          : current.value,
                    }));
                  }}
                />
                {activeLinkEditor.error && (
                  <span
                    className={cn(
                      'text-destructive-foreground absolute top-full',
                      'left-0 mt-2 w-72 rounded-md bg-destructive px-2 py-1 text-xs shadow-md'
                    )}
                  >
                    {activeLinkEditor.error}
                  </span>
                )}
              </div>
              <ClipboardLinkButton
                clipboard={activeLinkEditor.clipboard}
                onRead={requestClipboardLinks}
                onSelect={(candidate) =>
                  updateOpenLinkEditor((current) => ({
                    ...current,
                    error: null,
                    value: candidate.href,
                  }))
                }
              />
              <ToolbarTooltip label="Применить ссылку">
                <Button
                  type="submit"
                  size="icon-sm"
                  variant="ghost"
                  className="rounded-lg text-primary"
                  aria-label="Применить ссылку"
                >
                  <Check className="size-4" />
                </Button>
              </ToolbarTooltip>
              {activeLinkEditor.currentHref && (
                <ToolbarTooltip label="Убрать ссылку">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="rounded-lg text-destructive"
                    aria-label="Убрать ссылку"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={removeLink}
                  >
                    <Unlink className="size-4" />
                  </Button>
                </ToolbarTooltip>
              )}
              <ToolbarTooltip label="Отмена">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="rounded-lg"
                  aria-label="Отменить создание ссылки"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={closeLinkEditor}
                >
                  <X className="size-4" />
                </Button>
              </ToolbarTooltip>
            </form>
          )}
        </div>
      </TooltipProvider>
    </FloatingPortal>
  );
}
