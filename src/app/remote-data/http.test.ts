import { http } from 'msw';
import * as v from 'valibot';
import { describe, expect, test } from 'vitest';
import {
  holdBody,
  holdResponse,
  invalidBody,
  networkFailure,
  undeclaredStatus,
  unreadableBody,
} from '@/app/mock-backend/failures';
import { server } from '@/app/mock-backend/node';
import {
  OperationFailure,
  readJson,
  runHttpOperation,
  unexpectedHttpStatus,
} from '@/app/remote-data/http';

const PAGE_URL = '/api/test/page';
const PageDtoSchema = v.object({ title: v.string() });

function readPage(signal?: AbortSignal) {
  return runHttpOperation(
    { name: 'read-page', url: PAGE_URL, signal },
    async (context) => {
      if (context.response.status !== 200) throw unexpectedHttpStatus(context);
      return readJson(context, PageDtoSchema);
    }
  );
}

async function rejectionOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the promise to reject');
}

describe('TR-01: Fetch failure', () => {
  test('rejects with a network OperationFailure of the operation', async () => {
    server.use(http.get(PAGE_URL, networkFailure));

    const error = await rejectionOf(readPage());

    expect(error).toBeInstanceOf(OperationFailure);
    expect(error).toMatchObject({ kind: 'network', operation: 'read-page' });
    expect((error as OperationFailure).message).toBe(
      '[read-page] Fetch did not return a Response'
    );
  });
});

describe('TR-02: response body', () => {
  test('unreadable body rejects with unreadable-body', async () => {
    server.use(http.get(PAGE_URL, unreadableBody));

    await expect(readPage()).rejects.toMatchObject({
      name: 'OperationFailure',
      kind: 'unreadable-body',
      operation: 'read-page',
    });
  });

  test('schema violation rejects with invalid-response naming the path', async () => {
    server.use(http.get(PAGE_URL, invalidBody({ title: 42 })));

    const error = await rejectionOf(readPage());

    expect(error).toBeInstanceOf(OperationFailure);
    expect((error as OperationFailure).reason).toEqual({
      kind: 'invalid-response',
      explanation: 'title',
    });
  });
});

describe('TR-03: cancellation', () => {
  test('abort before the response stays an AbortError', async () => {
    const held = holdResponse();
    server.use(http.get(PAGE_URL, held.resolver));
    const controller = new AbortController();

    const page = readPage(controller.signal);
    await held.requested;
    controller.abort();

    const error = await rejectionOf(page);
    expect(error).not.toBeInstanceOf(OperationFailure);
    expect(error).toMatchObject({ name: 'AbortError' });
    held.release();
  });

  test('abort while the body is read stays an AbortError', async () => {
    const controller = new AbortController();
    server.use(http.get(PAGE_URL, holdBody(controller.signal)));

    const operation = runHttpOperation(
      { name: 'read-page', url: PAGE_URL, signal: controller.signal },
      async (context) => {
        const body = readJson(context, PageDtoSchema);
        controller.abort();
        return body;
      }
    );

    const error = await rejectionOf(operation);
    expect(error).not.toBeInstanceOf(OperationFailure);
    expect(error).toMatchObject({ name: 'AbortError' });
  });

  test('a custom abort reason while the body is read is rethrown as is', async () => {
    const controller = new AbortController();
    server.use(http.get(PAGE_URL, holdBody(controller.signal)));
    const reason = new Error('route left');

    const operation = runHttpOperation(
      { name: 'read-page', url: PAGE_URL, signal: controller.signal },
      async (context) => {
        const body = readJson(context, PageDtoSchema);
        controller.abort(reason);
        return body;
      }
    );

    await expect(operation).rejects.toBe(reason);
  });

  test('a custom abort reason is rethrown as is', async () => {
    const held = holdResponse();
    server.use(http.get(PAGE_URL, held.resolver));
    const controller = new AbortController();
    const reason = new Error('route left');

    const page = readPage(controller.signal);
    await held.requested;
    controller.abort(reason);

    await expect(page).rejects.toBe(reason);
    held.release();
  });
});

describe('decoder', () => {
  test('an undeclared status rejects with unexpected-http and the status', async () => {
    server.use(http.get(PAGE_URL, undeclaredStatus(503)));

    const error = await rejectionOf(readPage());

    expect(error).toBeInstanceOf(OperationFailure);
    expect((error as OperationFailure).reason).toEqual({
      kind: 'unexpected-http',
      status: 503,
    });
  });

  test('a programming error in the decoder is not turned into a failure', async () => {
    server.use(http.get(PAGE_URL, undeclaredStatus(200)));
    const bug = new TypeError('decoder bug');

    const operation = runHttpOperation(
      { name: 'read-page', url: PAGE_URL },
      async () => {
        throw bug;
      }
    );

    await expect(operation).rejects.toBe(bug);
  });
});
