import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { CourseRichText } from './rich-text';

it('renders a rejected href as text without a replacement link', () => {
  const { container } = render(
    <CourseRichText
      nodes={[
        {
          type: 'link',
          text: 'Rejected link',
          href: 'jav&#97;script:alert(1)',
        },
      ]}
    />
  );
  expect(screen.getByText('Rejected link')).toBeTruthy();
  expect(container.querySelector('a')).toBeNull();
});

it('preserves the original accepted href encoding', () => {
  const href = 'https://example.com/a%20b?q=%2F';
  render(
    <CourseRichText nodes={[{ type: 'link', text: 'Accepted link', href }]} />
  );
  expect(
    screen.getByRole('link', { name: 'Accepted link' }).getAttribute('href')
  ).toBe(href);
});
