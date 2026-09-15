import { once } from 'node:events';
import { createServer, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import * as v from 'valibot';

/**
 * ОДНОРАЗОВЫЙ ПРОТОТИП. Не переносить в production как есть.
 *
 * Вопрос: достаточно ли малого транспортного ядра для единого Fetch-пути,
 * отмены, проверки внешних данных и типизированных отказов без endpoint DSL?
 *
 * Запуск: bun docs/prototypes/remote-data-kernel.prototype.ts
 */

type OperationFailureReason =
  | { kind: 'network'; cause: unknown }
  | { kind: 'unexpected-http'; status: number }
  | { kind: 'unreadable-body'; cause: unknown }
  | { kind: 'invalid-response'; explanation: string };

export class OperationFailure extends Error {
  readonly name = 'OperationFailure';
  readonly kind: OperationFailureReason['kind'];

  constructor(
    readonly operation: string,
    readonly reason: OperationFailureReason
  ) {
    super(
      `[${operation}] ${buildDiagnosticMessage(reason)}`,
      'cause' in reason ? { cause: reason.cause } : undefined
    );
    this.kind = reason.kind;
  }
}

// Только для диагностики. UI не должен показывать Error.message пользователю напрямую.
function buildDiagnosticMessage(reason: OperationFailureReason) {
  switch (reason.kind) {
    case 'network':
      return 'Fetch не вернул Response';
    case 'unexpected-http':
      return `неожиданный HTTP-статус ${reason.status}`;
    case 'unreadable-body':
      return 'тело ответа невозможно прочитать или декодировать';
    case 'invalid-response':
      return `ответ нарушает контракт: ${reason.explanation}`;
  }
}

type HttpOperationRequest = Omit<RequestInit, 'signal'> & {
  name: string;
  url: string | URL;
  signal?: AbortSignal;
};

export type HttpResponseContext = {
  operation: string;
  response: Response;
};

export async function runHttpOperation<T>(
  request: HttpOperationRequest,
  decode: (context: HttpResponseContext) => Promise<T>
): Promise<T> {
  const { name, url, signal, ...init } = request;
  let response: Response;

  try {
    response = await fetch(url, { ...init, signal });
  } catch (cause) {
    throwIfCancellation(cause, signal);
    throw new OperationFailure(name, { kind: 'network', cause });
  }

  // Намеренно вне catch: ошибки программирования и ошибки decode не маскируются.
  return decode({ operation: name, response });
}

export async function readJson<TSchema extends v.GenericSchema>(
  context: HttpResponseContext,
  schema: TSchema
): Promise<v.InferOutput<TSchema>> {
  let input: unknown;

  try {
    input = await context.response.json();
  } catch (cause) {
    throwIfCancellation(cause);
    throw new OperationFailure(context.operation, {
      kind: 'unreadable-body',
      cause,
    });
  }

  const result = v.safeParse(schema, input);
  if (!result.success) {
    throw new OperationFailure(context.operation, {
      kind: 'invalid-response',
      explanation: result.issues
        .map(
          (issue) =>
            issue.path?.map((item) => item.key).join('.') || issue.message
        )
        .join(', '),
    });
  }

  return result.output;
}

export function unexpectedHttp(context: HttpResponseContext) {
  return new OperationFailure(context.operation, {
    kind: 'unexpected-http',
    status: context.response.status,
  });
}

export function invalidResponse(
  context: HttpResponseContext,
  explanation: string
) {
  return new OperationFailure(context.operation, {
    kind: 'invalid-response',
    explanation,
  });
}

export function jsonBody(value: unknown) {
  return {
    body: JSON.stringify(value),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
  } satisfies Pick<RequestInit, 'body' | 'headers'>;
}

function throwIfCancellation(cause: unknown, signal?: AbortSignal): void {
  const isAbortError =
    cause instanceof DOMException && cause.name === 'AbortError';
  const isSignalReason = signal?.aborted && cause === signal.reason;

  if (isAbortError || isSignalReason) {
    throw cause;
  }
}

// TanStack Query: безопасное общее умолчание, затем явный opt-in операции.
export const remoteQueryDefaults = {
  queries: { retry: false },
  mutations: { retry: false },
} as const;

export function canRetrySessionCheck(
  failureCount: number,
  error: unknown
): boolean {
  if (failureCount >= 1 || !(error instanceof OperationFailure)) {
    return false;
  }

  return (
    error.kind === 'network' ||
    (error.reason.kind === 'unexpected-http' &&
      [502, 503, 504].includes(error.reason.status))
  );
}

export const sessionRetryDelay = 500;

const SessionDtoSchema = v.object({
  username: v.string(),
  role: v.picklist(['teacher', 'student']),
  session_expires_at: v.string(),
});

const CoursePageDtoSchema = v.object({
  course_id: v.string(),
  title: v.string(),
  revision: v.number(),
});

const CoursePageConflictDtoSchema = v.object({
  latest_revision: v.number(),
});

const AttemptReviewDtoSchema = v.object({
  attempt_id: v.string(),
  score: v.nullable(v.number()),
  revision: v.number(),
});

const AttemptReviewConflictDtoSchema = v.object({
  latest_revision: v.number(),
});

type SessionOutcome =
  | {
      status: 'authorized';
      session: {
        username: string;
        role: 'teacher' | 'student';
        expiresAt: string;
      };
    }
  | { status: 'not-authorized' };

type SaveCoursePageOutcome =
  | {
      status: 'saved';
      page: { courseId: string; title: string; revision: number };
    }
  | { status: 'conflict'; latestRevision: number };

type SaveAttemptReviewOutcome =
  | {
      status: 'saved';
      review: { attemptId: string; score: number | null; revision: number };
    }
  | { status: 'conflict'; latestRevision: number };

export async function checkSession(
  apiBaseUrl: string,
  signal?: AbortSignal
): Promise<SessionOutcome> {
  return runHttpOperation(
    {
      name: 'check-session',
      url: `${apiBaseUrl}/api/v1/auth/session`,
      credentials: 'include',
      signal,
    },
    async (context) => {
      if (context.response.status === 401) {
        return { status: 'not-authorized' };
      }
      if (!context.response.ok) {
        throw unexpectedHttp(context);
      }

      const dto = await readJson(context, SessionDtoSchema);
      return {
        status: 'authorized',
        session: {
          username: dto.username,
          role: dto.role,
          expiresAt: dto.session_expires_at,
        },
      };
    }
  );
}

export async function saveCoursePage(
  apiBaseUrl: string,
  input: { courseSlug: string; title: string }
): Promise<SaveCoursePageOutcome> {
  return runHttpOperation(
    {
      name: 'save-course-page',
      url: `${apiBaseUrl}/api/v1/courses/${input.courseSlug}/page`,
      method: 'PUT',
      ...jsonBody({ title: input.title }),
    },
    async (context) => {
      if (context.response.status === 409) {
        const conflict = await readJson(context, CoursePageConflictDtoSchema);
        return {
          status: 'conflict',
          latestRevision: conflict.latest_revision,
        };
      }
      if (!context.response.ok) {
        throw unexpectedHttp(context);
      }

      const dto = await readJson(context, CoursePageDtoSchema);
      return {
        status: 'saved',
        page: {
          courseId: dto.course_id,
          title: dto.title,
          revision: dto.revision,
        },
      };
    }
  );
}

export async function saveAttemptReview(
  apiBaseUrl: string,
  input: { attemptId: string; score: number | null }
): Promise<SaveAttemptReviewOutcome> {
  return runHttpOperation(
    {
      name: 'save-attempt-review',
      url: `${apiBaseUrl}/api/v1/attempts/${input.attemptId}/review`,
      method: 'PUT',
      ...jsonBody({ score: input.score }),
    },
    async (context) => {
      if (context.response.status === 409) {
        const conflict = await readJson(
          context,
          AttemptReviewConflictDtoSchema
        );
        return {
          status: 'conflict',
          latestRevision: conflict.latest_revision,
        };
      }
      if (!context.response.ok) {
        throw unexpectedHttp(context);
      }

      const dto = await readJson(context, AttemptReviewDtoSchema);
      return {
        status: 'saved',
        review: {
          attemptId: dto.attempt_id,
          score: dto.score,
          revision: dto.revision,
        },
      };
    }
  );
}

// Ниже — только исполняемый стенд прототипа. Он не является частью ядра.
type PrototypeScenario =
  | 'session-authorized'
  | 'session-not-authorized'
  | 'session-invalid'
  | 'session-slow'
  | 'course-saved'
  | 'course-conflict'
  | 'review-saved'
  | 'review-conflict';

async function runPrototype() {
  let scenario: PrototypeScenario = 'session-authorized';
  const server = createServer((_request, response) => {
    if (scenario === 'session-slow') {
      setTimeout(
        () =>
          writeJson(response, 200, {
            username: 'teacher',
            role: 'teacher',
            session_expires_at: '2099-01-01T00:00:00.000Z',
          }),
        150
      );
      return;
    }

    const replies: Record<
      Exclude<PrototypeScenario, 'session-slow'>,
      () => void
    > = {
      'session-authorized': () =>
        writeJson(response, 200, {
          username: 'teacher',
          role: 'teacher',
          session_expires_at: '2099-01-01T00:00:00.000Z',
        }),
      'session-not-authorized': () => writeJson(response, 401, null),
      'session-invalid': () => writeJson(response, 200, { username: 42 }),
      'course-saved': () =>
        writeJson(response, 200, {
          course_id: 'typescript',
          title: 'TypeScript',
          revision: 4,
        }),
      'course-conflict': () => writeJson(response, 409, { latest_revision: 5 }),
      'review-saved': () =>
        writeJson(response, 200, {
          attempt_id: 'attempt-17',
          score: 9,
          revision: 3,
        }),
      'review-conflict': () => writeJson(response, 409, { latest_revision: 4 }),
    };

    replies[scenario]();
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Не удалось получить адрес стенда');
  }
  const apiBaseUrl = `http://127.0.0.1:${address.port}`;

  await show('Session: authorized', async () => {
    scenario = 'session-authorized';
    return checkSession(apiBaseUrl);
  });
  await show('Session: 401 остаётся данными', async () => {
    scenario = 'session-not-authorized';
    return checkSession(apiBaseUrl);
  });
  await show('Session: неверный DTO отклоняет Promise', async () => {
    scenario = 'session-invalid';
    return checkSession(apiBaseUrl);
  });
  await show('Course Page: сохранено', async () => {
    scenario = 'course-saved';
    return saveCoursePage(apiBaseUrl, {
      courseSlug: 'typescript',
      title: 'TypeScript',
    });
  });
  await show('Course Page: 409 остаётся conflict', async () => {
    scenario = 'course-conflict';
    return saveCoursePage(apiBaseUrl, {
      courseSlug: 'typescript',
      title: 'Новый заголовок',
    });
  });
  await show('Attempt Review: сохранено', async () => {
    scenario = 'review-saved';
    return saveAttemptReview(apiBaseUrl, {
      attemptId: 'attempt-17',
      score: 9,
    });
  });
  await show('Attempt Review: 409 остаётся conflict', async () => {
    scenario = 'review-conflict';
    return saveAttemptReview(apiBaseUrl, {
      attemptId: 'attempt-17',
      score: 10,
    });
  });
  await show('Session: AbortSignal сохраняет отмену', async () => {
    scenario = 'session-slow';
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10);
    return checkSession(apiBaseUrl, controller.signal);
  });

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  await show('Session: недоступный сервер становится network failure', () =>
    checkSession(apiBaseUrl)
  );

  console.log('\nБезопасные значения TanStack Query по умолчанию:');
  console.log(JSON.stringify(remoteQueryDefaults, null, 2));
}

function writeJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(body === null ? '' : JSON.stringify(body));
}

async function show(label: string, operation: () => Promise<unknown>) {
  try {
    const value = await operation();
    console.log(`\n✓ ${label}`);
    console.log(JSON.stringify(value, null, 2));
  } catch (error) {
    if (error instanceof OperationFailure) {
      console.log(`\n✗ ${label}`);
      console.log(
        JSON.stringify(
          {
            type: error.name,
            operation: error.operation,
            kind: error.kind,
            message: error.message,
          },
          null,
          2
        )
      );
      return;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log(`\n○ ${label}`);
      console.log(JSON.stringify({ type: 'cancellation', name: error.name }));
      return;
    }
    throw error;
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  await runPrototype();
}
