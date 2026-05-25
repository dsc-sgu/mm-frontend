import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';

type CopyState = 'idle' | 'copied' | 'failed';

type CourseCodeBlockCopyBtnProps = {
  code: string;
};

const copyButtonClassName = cn(
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5',
  'rounded-lg border px-2.5 py-1 text-xs font-medium',
  'border-black/10 bg-white text-slate-700 transition-colors',
  'hover:bg-slate-100 focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-slate-400/40',
  'dark:border-white/10 dark:bg-white/5 dark:text-zinc-200',
  'dark:hover:bg-white/10 dark:focus-visible:ring-white/40'
);

export function CourseCodeBlockCopyBtn({ code }: CourseCodeBlockCopyBtnProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const copyResetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    if (copyResetTimeoutRef.current !== null) {
      window.clearTimeout(copyResetTimeoutRef.current);
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }

    copyResetTimeoutRef.current = window.setTimeout(() => {
      setCopyState('idle');
      copyResetTimeoutRef.current = null;
    }, 1400);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={copyButtonClassName}
      aria-label="Скопировать код"
    >
      {copyState === 'copied' ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      {copyState === 'copied'
        ? 'Скопировано'
        : copyState === 'failed'
          ? 'Не удалось'
          : 'Скопировать'}
    </button>
  );
}
