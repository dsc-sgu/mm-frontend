import { DeadlinesCalendar } from '@/deadlines-calendar/deadlines-calendar.component';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/calendar')({
  component: CalendarPage,
});

function CalendarPage() {
  return <DeadlinesCalendar className="max-w-200 h-150" />;
}
