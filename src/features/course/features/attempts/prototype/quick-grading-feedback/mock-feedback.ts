// PROTOTYPE (#121): CourseAttempt carries no Overall Feedback. To show how a
// published one is viewed from the row, two of three graded Attempts get a
// deterministic sample text. The real list projection would have to carry it
// (or its presence plus a lazy load).
import type { CourseAttempt } from '@/features/course/features/attempts/model/types';

const SAMPLES = [
  'Всё по заданию, коммиты аккуратные.',
  'Работает, но нет обработки пустого ввода и тестов на граничные случаи. В следующий раз начни с тестов: так проще поймать ошибку в разборе аргументов, и ревью пройдёт быстрее.',
  'Хорошо. Ветки названы не по соглашению курса — посмотри раздел «Git workflow».',
  'Решение верное, но история коммитов шумная: перед сдачей стоит объединить промежуточные коммиты.',
];

export function mockPublishedFeedback(attempt: CourseAttempt): string | null {
  const serial = Number(attempt.id.split(':').pop()) || 0;

  return serial % 3 === 0 ? null : (SAMPLES[serial % SAMPLES.length] ?? null);
}
