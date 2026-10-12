import { http, HttpResponse } from 'msw';
import type { SetupWorker } from 'msw/browser';
import * as v from 'valibot';
import { holdResponse } from '@/app/mock-backend/failures';
import type { HeldResponse } from '@/app/mock-backend/failures';
import {
  accessWorld,
  mockBackend,
  seededUsers,
  SESSION_EXPIRES_AT,
} from '@/app/mock-backend/state';
import { UserIdSchema, UsernameSchema } from '@/features/auth/model/identity';

// This module is dynamically imported only by the e2e dev server. The channel
// uses page-origin HTTP (MSW), not a window global or Playwright's API context.
const CONTROL_URL = '/__test/mock-backend';
const STORAGE_KEY = 'mergeminds:e2e:mock-backend';
const WorldSchema = v.picklist(['dev', 'world:access']);
const OperationSchema = v.literal('load-course-by-slug');
const SelectionSchema = v.object({
  world: WorldSchema,
  session: v.nullable(
    v.object({ userId: UserIdSchema, expiresAt: v.string() })
  ),
});
const CommandSchema = v.variant('action', [
  v.object({
    action: v.literal('scenario'),
    world: WorldSchema,
    session: v.nullable(UsernameSchema),
  }),
  v.object({ action: v.literal('hold'), operation: OperationSchema }),
  v.object({ action: v.literal('release'), operation: OperationSchema }),
]);

type Operation = v.InferOutput<typeof OperationSchema>;

export function installTestControl(worker: SetupWorker) {
  let world: v.InferOutput<typeof WorldSchema> = 'dev';
  const held = new Map<
    Operation,
    { response: HeldResponse; requested: number }
  >();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    let decoded: unknown;
    try {
      decoded = JSON.parse(stored);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    const selection = v.safeParse(SelectionSchema, decoded);
    if (selection.success) {
      world = selection.output.world;
      mockBackend.reset(world);
      mockBackend.state.session = selection.output.session;
    }
  }

  function persistSelection() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ world, session: mockBackend.state.session })
    );
  }

  // Also retain session changes made through the normal auth HTTP operations.
  worker.events.on('response:mocked', persistSelection);
  worker.use(
    http.get(CONTROL_URL, () =>
      HttpResponse.json({
        world,
        session: mockBackend.state.session,
        held: [...held].map(([operation, gate]) => ({
          operation,
          requested: gate.requested,
        })),
      })
    ),
    http.post(CONTROL_URL, async ({ request }) => {
      const body: unknown = await request.json();
      const parsed = v.safeParse(CommandSchema, body);
      if (!parsed.success) {
        return HttpResponse.json(
          { error: 'Invalid test command' },
          { status: 400 }
        );
      }
      const command = parsed.output;
      switch (command.action) {
        case 'scenario': {
          // Validate the selected identity before changing the running world.
          const users =
            command.world === 'world:access'
              ? Object.values(accessWorld.users)
              : Object.values(seededUsers);
          const user = users.find(
            (candidate) => candidate.username === command.session
          );
          if (command.session !== null && !user) {
            return HttpResponse.json(
              { error: 'Unknown test user' },
              { status: 400 }
            );
          }
          for (const gate of held.values()) gate.response.release();
          held.clear();
          mockBackend.reset(command.world);
          world = command.world;
          mockBackend.state.session = user
            ? { userId: user.id, expiresAt: SESSION_EXPIRES_AT }
            : null;
          persistSelection();
          break;
        }
        case 'hold':
          held.get(command.operation)?.response.release();
          held.set(command.operation, {
            response: holdResponse(),
            requested: 0,
          });
          break;
        case 'release':
          held.get(command.operation)?.response.release();
          held.delete(command.operation);
          break;
      }
      return new HttpResponse(null, { status: 204 });
    }),
    http.get('/api/v1/courses/by-slug/:courseSlug', async (args) => {
      const gate = held.get('load-course-by-slug');
      if (gate) {
        gate.requested += 1;
        await gate.response.resolver(args);
      }
      // Falling through preserves the production operation and seeded handler.
    })
  );
}
