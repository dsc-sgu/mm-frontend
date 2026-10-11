import * as v from 'valibot';

// The only module that calls Fetch. Feature operations own their URL, status
// classification, schemas and DTO mapping; this module owns the Fetch call,
// cancellation and the typed failures.

type OperationFailureReason =
  | { kind: 'network'; cause: unknown }
  | { kind: 'unexpected-http'; status: number }
  | { kind: 'unreadable-body'; cause: unknown }
  | { kind: 'invalid-response'; explanation: string };

export type OperationFailureKind = OperationFailureReason['kind'];

/**
 * Rejection of a remote operation that could not reach any declared outcome.
 *
 * `operation` is a stable internal id such as `check-session`. `message` is an
 * English diagnostic for DevTools and logs: UI chooses its own text by `kind`
 * and operation and never shows `message`.
 */
export class OperationFailure extends Error {
  readonly name = 'OperationFailure';
  readonly kind: OperationFailureKind;
  readonly operation: string;
  readonly reason: OperationFailureReason;

  constructor(operation: string, reason: OperationFailureReason) {
    super(
      `[${operation}] ${buildDiagnosticMessage(reason)}`,
      'cause' in reason ? { cause: reason.cause } : undefined
    );
    this.operation = operation;
    this.reason = reason;
    this.kind = reason.kind;
  }
}

// Diagnostics only. UI must not show Error.message to the user.
function buildDiagnosticMessage(reason: OperationFailureReason) {
  switch (reason.kind) {
    case 'network':
      return 'Fetch did not return a Response';
    case 'unexpected-http':
      return `unexpected HTTP status ${reason.status}`;
    case 'unreadable-body':
      return 'response body could not be read or decoded';
    case 'invalid-response':
      return `response failed validation: ${reason.explanation}`;
  }
}

export type HttpOperationRequest = RequestInit & {
  name: string;
  url: string | URL;
};

export type HttpResponseContext = {
  operation: string;
  response: Response;
  /** The operation's signal, so body readers keep cancellation. */
  signal?: AbortSignal | null;
};

/**
 * Executes one Fetch attempt through the shared transport boundary.
 *
 * Preserves cancellation and wraps other Fetch rejections as network failures.
 * Does not retry, interpret HTTP statuses or validate response bodies.
 *
 * The decoder owns the operation's response contract: it returns declared
 * outcomes, validates consumed data and throws for unexpected responses.
 * Decoder exceptions propagate unchanged rather than being misclassified as
 * network failures.
 *
 * @example
 * ```ts
 * return runHttpOperation(
 *   { name: 'save-page', url: '/api/v1/page', method: 'PUT', ...jsonBody(page) },
 *   async (context) => {
 *     if (context.response.status === 409) {
 *       const conflict = await readJson(context, ConflictDtoSchema);
 *       return { status: 'conflict' as const, ...conflict };
 *     }
 *     if (context.response.status !== 200) throw unexpectedHttp(context);
 *     const page = await readJson(context, PageDtoSchema);
 *     return { status: 'saved' as const, page };
 *   }
 * );
 * ```
 */
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

  // Deliberately outside the catch: decoder and programming errors stay as is.
  return decode({ operation: name, response, signal });
}

/**
 * Consumes the body as unknown JSON and validates it before returning data.
 *
 * Use after classifying the HTTP status, for success and declared negative
 * payloads alike. Body reading or JSON parsing failures become
 * `unreadable-body`; schema violations become `invalid-response`. Cancellation
 * while reading the body is rethrown unchanged.
 */
export async function readJson<TSchema extends v.GenericSchema>(
  context: HttpResponseContext,
  schema: TSchema
): Promise<v.InferOutput<TSchema>> {
  let input: unknown;

  try {
    input = await context.response.json();
  } catch (cause) {
    throwIfCancellation(cause, context.signal);
    throw new OperationFailure(context.operation, {
      kind: 'unreadable-body',
      cause,
    });
  }

  const result = v.safeParse(schema, input);
  if (!result.success) {
    throw new OperationFailure(context.operation, {
      kind: 'invalid-response',
      explanation: valibotIssuesToString(result.issues),
    });
  }

  return result.output;
}

/**
 * Creates an `unexpected-http` failure for a status the operation does not
 * declare. Use as `throw unexpectedHttp(context)`.
 */
export function unexpectedHttp(context: HttpResponseContext) {
  return new OperationFailure(context.operation, {
    kind: 'unexpected-http',
    status: context.response.status,
  });
}

/**
 * Creates an `invalid-response` failure for a contract check outside a JSON
 * schema, such as an unexpected media type. The explanation is an internal
 * English diagnostic. Use as `throw invalidResponse(context, explanation)`.
 */
export function invalidResponse(
  context: HttpResponseContext,
  explanation: string
) {
  return new OperationFailure(context.operation, {
    kind: 'invalid-response',
    explanation,
  });
}

/**
 * Serializes a value into a Fetch body with JSON Accept and Content-Type
 * headers. Spread the result into the request. The headers are a complete
 * property: another `headers` in the same object replaces them or is replaced.
 */
export function jsonBody(value: unknown) {
  return {
    body: JSON.stringify(value),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
  } satisfies Pick<RequestInit, 'body' | 'headers'>;
}

function throwIfCancellation(
  cause: unknown,
  signal?: AbortSignal | null
): void {
  // Compared by name: the AbortError may come from another realm (jsdom), where
  // `instanceof DOMException` is false.
  const isAbortError = cause instanceof Error && cause.name === 'AbortError';
  const isSignalReason = signal?.aborted && cause === signal.reason;

  if (isAbortError || isSignalReason) {
    throw cause;
  }
}

function valibotIssuesToString(
  issues: [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]]
): string {
  return issues
    .map(
      (issue) =>
        issue.path?.map((item) => String(item.key)).join('.') || issue.message
    )
    .join(', ');
}
