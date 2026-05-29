import { Input } from '@/shadcn/components/ui/input';
import type { CourseAttempt } from './course-attempts.types';
import {
  AttemptDetails,
  AttemptDiffStats,
  AttemptTitle,
} from './course-attempts.card-parts.component';

export function QuickGradingCard({
  attempt,
  draftScore,
  onDraftScoreChange,
}: {
  attempt: CourseAttempt;
  draftScore: string;
  onDraftScoreChange: (score: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card px-6 py-5 sm:px-7 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <AttemptTitle attempt={attempt} />
          <AttemptDetails attempt={attempt} />
        </div>
        <AttemptDiffStats attempt={attempt} />
      </div>

      <label className="mt-2 flex items-center gap-3">
        {/*TODO: Добавить валидацию*/}
        <Input
          type="text"
          inputMode="decimal"
          min={0}
          max={attempt.task.maxScore}
          step={1}
          value={draftScore}
          disabled={Boolean(attempt.reviewLock)}
          onChange={(event) => onDraftScoreChange(event.target.value)}
          placeholder="—"
          className="h-12 w-20 rounded-xl text-center text-xl font-semibold md:text-xl"
        />
        <span className="text-xl font-semibold text-muted-foreground">
          / {attempt.task.maxScore}
        </span>
      </label>
    </article>
  );
}
