import { CourseCard } from '@/course-card.component';
import type { CourseColor } from '@/course.types';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/')({
  component: RouteComponent,
});

const colors: CourseColor[] = [
  'blue',
  'teal',
  'green',
  'violet',
  'pink',
  'red',
  'orange',
];

function RouteComponent() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 m-20">
      {colors.map((color) => (
        <CourseCard
          title="Структуры данных и алгоритмы. Анализ сложности алгоритмов"
          courseId="some-uuid"
          color={color}
          iconName="code-xml"
          teachers={[
            {
              lastName: 'Батраева',
              firstName: 'Инна',
              patronymic: 'Александровна',
              username: 'inna_batraeva',
            },
            {
              lastName: 'Сафрончик',
              firstName: 'Мария',
              patronymic: 'Ильинична',
              username: 'maria_safronchik',
            },
          ]}
        />
      ))}
    </div>
  );
}
