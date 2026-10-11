// PROTOTYPE (#121): mock students have short "Имя Фамилия" names. Real course
// rosters show "Фамилия Имя Отчество", so the "ФИО" toggle swaps in realistic
// three-part names of varied length to check whether the Student zone fits.
import type {
  CourseAttempt,
  CourseAttemptStudent,
} from '@/features/course/features/attempts/model/types';

const FULL_NAMES = [
  'Иванов Иван Иванович',
  'Кузнецова Екатерина Сергеевна',
  'Смирнов Александр Владимирович',
  'Петрова Анна Михайловна',
  'Константинопольская Александра Владимировна',
  'Волков Даниил Андреевич',
  'Новикова Елизавета Константиновна',
  'Фёдоров Максим Олегович',
  'Морозова Ольга Петровна',
  'Ахмедов Рустам Шамилевич',
  'Лебедев Никита Вячеславович',
  'Семёнова Мария Александровна',
  'Егоров Пётр Ильич',
  'Павлова Надежда Валентиновна',
  'Мухаметзянов Ринат Ильдарович',
  'Соколов Артём Дмитриевич',
  'Алексеева Мила Евгеньевна',
  'Христорождественский Святослав Владиславович',
  'Орлова Анастасия Станиславовна',
  'Ким Виктор Сергеевич',
];

// FNV-1a: similar usernames ("student-04", "student-05") still spread out.
function hash(value: string) {
  let result = 0x811c9dc5;

  for (const char of value) {
    result = Math.imul(result ^ char.charCodeAt(0), 0x01000193) >>> 0;
  }

  return result;
}

export function realisticName(username: string, fallback: string) {
  return FULL_NAMES[hash(username) % FULL_NAMES.length] ?? fallback;
}

export function withRealisticNames(
  attempts: readonly CourseAttempt[]
): CourseAttempt[] {
  return attempts.map((attempt) => ({
    ...attempt,
    student: {
      ...attempt.student,
      fullName: realisticName(
        attempt.student.username,
        attempt.student.fullName
      ),
    },
  }));
}

export function withRealisticStudentNames(
  students: readonly CourseAttemptStudent[]
): CourseAttemptStudent[] {
  return students.map((student) => ({
    ...student,
    fullName: realisticName(student.username, student.fullName),
  }));
}
