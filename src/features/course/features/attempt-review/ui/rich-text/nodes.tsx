import {
  PlateElement,
  PlateLeaf,
  type PlateElementProps,
  type PlateLeafProps,
} from 'platejs/react';

export function BoldLeaf(props: PlateLeafProps) {
  return <PlateLeaf as="strong" {...props} />;
}

export function ItalicLeaf(props: PlateLeafProps) {
  return <PlateLeaf as="em" {...props} />;
}

export function StrikeLeaf(props: PlateLeafProps) {
  return <PlateLeaf as="s" {...props} />;
}

export function CodeLeaf(props: PlateLeafProps) {
  return <PlateLeaf as="code" {...props} />;
}

export function QuoteElement(props: PlateElementProps) {
  return <PlateElement as="blockquote" {...props} />;
}

export function CodeElement(props: PlateElementProps) {
  return <PlateElement as="pre" {...props} />;
}

export function CodeLineElement(props: PlateElementProps) {
  return <PlateElement as="div" {...props} />;
}

export function LinkElement(props: PlateElementProps) {
  return (
    <PlateElement as="span" className="text-primary underline" {...props} />
  );
}

export function ListWrapper({ children, element }: PlateElementProps) {
  const Tag = element.listStyleType === 'decimal' ? 'ol' : 'ul';
  return (
    <Tag
      start={
        typeof element.listStart === 'number' ? element.listStart : undefined
      }
      style={{ listStyleType: String(element.listStyleType) }}
    >
      <li>{children}</li>
    </Tag>
  );
}
