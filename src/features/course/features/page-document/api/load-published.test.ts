import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/app/mock-backend/node';
import {
  accessWorld,
  mockBackend,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { OperationFailure } from '@/app/remote-data/http';
import type { UserId } from '@/features/auth/model/identity';
import { createCoursePage } from '@/features/course/features/page/api/mock';
import { loadPublishedCoursePage } from './load-published';

const COURSE = accessWorld.courses.algorithms;
const URL = `/api/v1/courses/${COURSE.id}/page/published`;

function signIn(userId: UserId) {
  mockBackend.state.session = { userId, expiresAt: SESSION_EXPIRES_AT };
}

function validDto() {
  const page = createCoursePage(COURSE);
  const blocks: Array<{
    id: string;
    type: string;
    version: number;
    data: unknown;
  }> = page.content.map((block) => ({ ...block, version: 1 }));
  return {
    ...page,
    viewerRole: 'student',
    blocks,
    taskSummaries: [{ status: 'open', taskId: '1', title: 'Открытое задание' }],
  };
}

beforeEach(() => {
  mockBackend.reset('world:access');
  signIn(accessWorld.users.sasha.id);
});

describe('DRF-22: published Course Page reading', () => {
  it('returns the latest published non-deleted blocks in stable order', async () => {
    const outcome = await loadPublishedCoursePage(COURSE.id);

    expect(outcome.status).toBe('found');
    if (outcome.status !== 'found') {
      return;
    }
    const text = JSON.stringify(outcome.page.content);
    expect(outcome.page.content[0]).toMatchObject({
      id: `${COURSE.id}:intro`,
      type: 'heading',
      version: 2,
      data: { children: [{ text: 'О курсе' }] },
    });
    expect(text).not.toContain('Устаревшая публикация');
    expect(text).not.toContain('Чужой черновик');
    expect(text).not.toContain('Удалённый блок');
  });

  it('returns open, locked and unavailable Task Summaries for a Student', async () => {
    const outcome = await loadPublishedCoursePage(COURSE.id);

    expect(outcome).toMatchObject({
      status: 'found',
      page: {
        taskSummaries: [
          { status: 'open', taskId: '1' },
          {
            status: 'locked',
            taskId: '2',
            prerequisite: 'Сначала выполните вводное практическое задание',
          },
          { status: 'unavailable', taskId: '3' },
        ],
      },
    });
  });

  it('returns available Task Summaries without Student access for a Teacher', async () => {
    signIn(accessWorld.users.anna.id);

    const outcome = await loadPublishedCoursePage(COURSE.id);

    expect(outcome).toMatchObject({
      status: 'found',
      page: {
        taskSummaries: [
          { status: 'teacher', taskId: '1' },
          { status: 'teacher', taskId: '2' },
          { status: 'unavailable', taskId: '3' },
        ],
      },
    });
    expect(JSON.stringify(outcome)).not.toContain('prerequisite');
  });

  it('treats an invalid individual block as unsupported content', async () => {
    const dto = validDto();
    dto.blocks[0] = {
      id: 'unknown',
      type: 'future-block',
      version: 4,
      data: { secret: 'draft' },
    };
    server.use(http.get(URL, () => HttpResponse.json(dto)));

    const outcome = await loadPublishedCoursePage(COURSE.id);

    expect(outcome.status).toBe('found');
    if (outcome.status === 'found') {
      expect(outcome.page.content[0]).toEqual({
        id: 'unknown',
        type: 'unsupported',
        version: 4,
      });
    }
  });

  it('rejects an invalid successful DTO', async () => {
    server.use(
      http.get(URL, () => HttpResponse.json({ ...validDto(), courseId: 42 }))
    );

    await expect(loadPublishedCoursePage(COURSE.id)).rejects.toMatchObject({
      name: 'OperationFailure',
      kind: 'invalid-response',
    });
  });

  it('keeps cancellation distinct from an operation failure', async () => {
    server.use(
      http.get(URL, async ({ request }) => {
        await new Promise<never>((_resolve, reject) => {
          request.signal.addEventListener('abort', () =>
            reject(request.signal.reason)
          );
        });
        throw new Error('unreachable');
      })
    );
    const controller = new AbortController();
    const pending = loadPublishedCoursePage(COURSE.id, controller.signal);

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await expect(pending).rejects.not.toBeInstanceOf(OperationFailure);
  });
});
