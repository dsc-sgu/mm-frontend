import { useEffect, useState } from 'react';
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const TOAST_EDGE_OFFSET = 16;
const TOAST_HEADER_GAP = 12;

function getDocumentTheme(): ToasterProps['theme'] {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function getTopToastOffset() {
  const headerBottom = document
    .querySelector('header')
    ?.getBoundingClientRect().bottom;

  return Math.max(
    TOAST_EDGE_OFFSET,
    Math.ceil((headerBottom ?? 0) + TOAST_HEADER_GAP)
  );
}

function useTopToastOffset() {
  const [topOffset, setTopOffset] = useState(getTopToastOffset);

  useEffect(() => {
    let animationFrameId = 0;

    const updateOffset = () => {
      animationFrameId = 0;
      const nextOffset = getTopToastOffset();

      setTopOffset((currentOffset) =>
        currentOffset === nextOffset ? currentOffset : nextOffset
      );
    };

    const scheduleUpdate = () => {
      if (animationFrameId === 0) {
        animationFrameId = window.requestAnimationFrame(updateOffset);
      }
    };

    const header = document.querySelector('header');
    const resizeObserver = header ? new ResizeObserver(scheduleUpdate) : null;

    resizeObserver?.observe(header as Element);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();

    return () => {
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId);
      }

      resizeObserver?.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  return topOffset;
}

const Toaster = ({ offset, mobileOffset, ...props }: ToasterProps) => {
  const [theme, setTheme] = useState<ToasterProps['theme']>(getDocumentTheme);
  const topOffset = useTopToastOffset();

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(getDocumentTheme());
    });

    observer.observe(document.documentElement, {
      attributeFilter: ['class'],
      attributes: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      offset={offset ?? { top: topOffset }}
      mobileOffset={mobileOffset ?? { top: topOffset }}
      toastOptions={{
        classNames: {
          toast:
            'max-w-[calc(100vw-2rem)] overflow-hidden !border-border !bg-popover !text-popover-foreground',
          icon: 'mt-0.5 self-start !text-popover-foreground',
          title:
            'min-w-0 whitespace-normal break-words !text-popover-foreground',
          description:
            'min-w-0 max-w-full whitespace-normal break-words !text-muted-foreground',
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
