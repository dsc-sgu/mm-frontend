import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/calendar')({
  component: CalendarPage,
});

function CalendarPage() {
  return (
    <div>
      <h1>Calendar</h1>
    </div>
  );
}
