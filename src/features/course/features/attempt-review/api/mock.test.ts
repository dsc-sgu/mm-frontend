import { describe, expect, test } from 'vitest';

import {
  mockBackend,
  seededUsers,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { createAttemptReviewCommentReply, fetchAttemptReview } from './mock';

describe('attempt review reply ownership', () => {
  test.each([
    {
      user: seededUsers.mitStudent,
      authorUsername: 'mit-student',
      authorName: 'Студент СИТ',
    },
    {
      user: seededUsers.mitTeacher,
      authorUsername: 'mit-teacher',
      authorName: 'Преподаватель СИТ',
    },
  ])(
    'a reply belongs to the signed-in $authorUsername after reloading',
    async ({ user, authorUsername, authorName }) => {
      mockBackend.state.session = {
        userId: user.id,
        expiresAt: SESSION_EXPIRES_AT,
      };
      const attempt = mockBackend.state.attempts.find(
        ({ studentId, attemptNumber }) =>
          studentId === seededUsers.mitStudent.id && attemptNumber === 2
      );
      if (!attempt) throw new Error('The fixture has no Student Attempt #2');
      const params = {
        courseId: attempt.courseId,
        studentId: attempt.studentId,
        attemptId: attempt.id,
      };

      const created = await createAttemptReviewCommentReply({
        ...params,
        commentId: 'comment-a2-main-4',
        html: '<p>Добавлю тест.</p>',
      });
      expect(created).toMatchObject({ authorUsername, authorName });

      const reloaded = await fetchAttemptReview(params);
      const reply = reloaded.lineComments
        .flatMap((comment) => comment.replies ?? [])
        .find(({ id }) => id === created.id);
      expect(reply).toMatchObject({
        authorUsername,
        authorName,
        html: '<p>Добавлю тест.</p>',
      });
    }
  );
});
