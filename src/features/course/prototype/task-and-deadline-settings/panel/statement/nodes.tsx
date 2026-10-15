// PROTOTYPE (#181): compact Plate nodes for the statement editor. The Course
// Page nodes are sized for a page and carry drag handles, so the panel gets
// its own; marks and links reuse the page editor's leaves.
import { PlateElement, type PlateElementProps } from 'platejs/react';

import { cn } from '@/shadcn/lib/utils';

export function ParagraphElement({ children, ...props }: PlateElementProps) {
  return (
    <PlateElement
      // A list item renders its <ul>/<ol> inside, which a <p> cannot hold.
      as={props.element.listStyleType ? 'div' : 'p'}
      className="my-1.5 text-sm leading-6"
      {...props}
    >
      {children}
    </PlateElement>
  );
}

export function HeadingOneElement({ children, ...props }: PlateElementProps) {
  return (
    <PlateElement
      as="h2"
      className="mt-4 mb-1.5 text-lg font-semibold first:mt-0"
      {...props}
    >
      {children}
    </PlateElement>
  );
}

export function HeadingTwoElement({ children, ...props }: PlateElementProps) {
  return (
    <PlateElement
      as="h3"
      className="mt-4 mb-1 text-base font-semibold first:mt-0"
      {...props}
    >
      {children}
    </PlateElement>
  );
}

export function HeadingThreeElement({ children, ...props }: PlateElementProps) {
  return (
    <PlateElement
      as="h4"
      className="mt-3 mb-1 text-sm font-semibold first:mt-0"
      {...props}
    >
      {children}
    </PlateElement>
  );
}

export function BlockquoteElement({ children, ...props }: PlateElementProps) {
  return (
    <PlateElement
      as="blockquote"
      className={cn(
        'my-2 border-l-2 border-primary/60 pl-3',
        'text-sm leading-6 text-muted-foreground'
      )}
      {...props}
    >
      {children}
    </PlateElement>
  );
}

export function CodeBlockElement({ children, ...props }: PlateElementProps) {
  return (
    <PlateElement
      as="pre"
      className={cn(
        'my-2 overflow-x-auto rounded-md bg-muted px-3 py-2',
        'font-mono text-xs leading-5'
      )}
      {...props}
    >
      {children}
    </PlateElement>
  );
}

export function CodeLineElement({ children, ...props }: PlateElementProps) {
  return (
    <PlateElement as="div" {...props}>
      {children}
    </PlateElement>
  );
}

export function ListWrapper({ children, element }: PlateElementProps) {
  const ordered = element.listStyleType === 'decimal';
  const ListTag = ordered ? 'ol' : 'ul';

  return (
    <ListTag
      className={cn(
        'my-0 pl-5 [&>li::marker]:text-muted-foreground',
        ordered ? 'list-decimal' : 'list-disc'
      )}
      style={{
        marginLeft:
          typeof element.indent === 'number' && element.indent > 1
            ? `${(element.indent - 1) * 1.25}rem`
            : undefined,
      }}
      start={
        typeof element.listStart === 'number' ? element.listStart : undefined
      }
    >
      <li className="[&>p]:my-0.5">{children}</li>
    </ListTag>
  );
}
