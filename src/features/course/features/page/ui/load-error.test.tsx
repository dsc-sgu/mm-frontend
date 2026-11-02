import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, expect, test } from 'vitest';
import { holdResponse, undeclaredStatus } from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import {
  accessWorld,
  mockBackend,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { renderRoutes } from '@/app/testing/render-routes';

const PAGE_URL = '/api/v1/courses/:courseId/page';

beforeEach(() => {
  mockBackend.reset('world:access');
  mockBackend.state.session = {
    userId: accessWorld.users.vera.id,
    expiresAt: SESSION_EXPIRES_AT,
  };
});

test.each(['/courses/databases', '/courses/databases/edit'])(
  '%s keeps its retry visible and disabled until the read settles',
  async (path) => {
    server.use(http.get(PAGE_URL, undeclaredStatus(503)));
    const user = userEvent.setup();
    const { queryClient } = renderRoutes([], path, { appRoutes: true });
    const retry = await screen.findByRole('button', { name: 'Повторить' });
    expect(
      within(screen.getByRole('alert')).getByRole('heading', {
        name: 'Не удалось загрузить страницу',
      })
    ).toBeDefined();

    const failedRetry = holdResponse();
    let retryReads = 0;
    server.use(
      http.get(PAGE_URL, async (info) => {
        retryReads += 1;
        await failedRetry.resolver(info);
        return new HttpResponse(null, { status: 503 });
      })
    );

    try {
      await user.click(retry);
      await failedRetry.requested;

      const pendingRetry = await screen.findByRole('button', {
        name: 'Загружаем…',
      });
      expect(pendingRetry.hasAttribute('disabled')).toBe(true);
      expect(
        screen.getByRole('status', { name: 'Повторная загрузка страницы' })
          .textContent
      ).toBe('Загружаем…');
      expect(screen.getByRole('alert')).toBeDefined();

      await user.click(pendingRetry);
      expect(retryReads).toBe(1);
    } finally {
      failedRetry.release();
    }

    const nextRetry = await screen.findByRole('button', { name: 'Повторить' });
    expect(nextRetry.hasAttribute('disabled')).toBe(false);

    server.resetHandlers();
    const successfulRetry = holdResponse();
    server.use(http.get(PAGE_URL, successfulRetry.resolver));

    try {
      await user.click(nextRetry);
      await successfulRetry.requested;
      expect(
        (
          await screen.findByRole('button', { name: 'Загружаем…' })
        ).hasAttribute('disabled')
      ).toBe(true);
    } finally {
      successfulRetry.release();
    }

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    if (path.endsWith('/edit')) {
      expect(
        screen.getByRole('textbox', { name: 'Название курса' })
      ).toHaveProperty('value', 'Базы данных');
    } else {
      expect(
        screen.getByRole('heading', { name: 'Базы данных' })
      ).toBeDefined();
    }
    queryClient.clear();
  }
);
