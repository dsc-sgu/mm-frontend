import { Check } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';

import { Input } from '@/shadcn/components/ui/input';
import { Label } from '@/shadcn/components/ui/label';
import { cn } from '@/shadcn/lib/utils';
import type { CoursePage } from '@/features/course/features/page/model/types';
import type { CoursePageEditValidationErrors } from '@/features/course/features/page-edit/model/validation';
import {
  COURSE_EDIT_COLOR_OPTIONS,
  COURSE_EDIT_ICON_OPTIONS,
} from '@/features/course/features/page-edit/model/validation';
import type {
  CourseColor,
  LucideIconName,
  Teacher,
} from '@/features/course/model/types';
import { COURSE_COLORS } from '@/features/course/ui/theme';

const COURSE_COLOR_LABELS: Record<CourseColor, string> = {
  blue: 'Синий',
  teal: 'Бирюзовый',
  violet: 'Фиолетовый',
  pink: 'Розовый',
  red: 'Красный',
  orange: 'Оранжевый',
  green: 'Зелёный',
};

const COURSE_COLOR_SWATCHES: Record<CourseColor, string> = {
  blue: 'bg-blue-500',
  teal: 'bg-teal-500',
  violet: 'bg-violet-500',
  pink: 'bg-pink-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
};

function teacherFullName(teacher: Teacher) {
  return [teacher.lastName, teacher.firstName, teacher.patronymic || '']
    .filter(Boolean)
    .join(' ');
}

function FieldError({ children }: { children?: string }) {
  if (!children) {
    return null;
  }

  return <p className="text-sm text-destructive">{children}</p>;
}

function CourseColorPicker({
  value,
  onChange,
  className,
}: {
  value: CourseColor;
  onChange: (color: CourseColor) => void;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label>Цвет курса</Label>
      <div className="flex flex-wrap items-center gap-2">
        {COURSE_EDIT_COLOR_OPTIONS.map((color) => {
          const selected = color === value;

          return (
            <button
              key={color}
              type="button"
              aria-label={COURSE_COLOR_LABELS[color]}
              aria-pressed={selected}
              title={COURSE_COLOR_LABELS[color]}
              onClick={() => onChange(color)}
              className={cn(
                'grid size-10 place-items-center rounded-full transition-all',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                selected
                  ? 'bg-background shadow-sm ring-2 ring-primary ring-offset-0 ring-offset-background'
                  : 'hover:bg-background/70'
              )}
            >
              <span
                className={cn(
                  'grid size-8 place-items-center rounded-full',
                  COURSE_COLOR_SWATCHES[color]
                )}
              >
                {selected && (
                  <Check className="size-4 text-white drop-shadow" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CourseIconPicker({
  value,
  onChange,
  className,
}: {
  value: LucideIconName;
  onChange: (iconName: LucideIconName) => void;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label>Иконка курса</Label>
      <div className="flex flex-wrap items-center gap-2">
        {COURSE_EDIT_ICON_OPTIONS.map((iconName) => {
          const selected = iconName === value;

          return (
            <button
              key={iconName}
              type="button"
              aria-label={iconName}
              aria-pressed={selected}
              title={iconName}
              onClick={() => onChange(iconName)}
              className={cn(
                'grid size-10 place-items-center rounded-full transition-all',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                selected
                  ? 'bg-background text-primary shadow-sm ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : 'bg-background/40 text-foreground/75 hover:bg-background/70 hover:text-foreground'
              )}
            >
              <DynamicIcon name={iconName} className="size-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CoursePageEditHeroEditor({
  course,
  errors,
  onChange,
}: {
  course: CoursePage;
  errors: CoursePageEditValidationErrors;
  onChange: (course: CoursePage) => void;
}) {
  const theme = COURSE_COLORS[course.color];

  return (
    <section
      className={cn(
        'relative overflow-hidden bg-linear-to-br px-5 py-6',
        'sm:rounded-3xl sm:border sm:p-8',
        'md:-mx-12 md:px-20 lg:-mx-10 lg:px-20 lg:py-10',
        theme.base,
        theme.darkBase,
        theme.border
      )}
    >
      <DynamicIcon
        name={course.iconName}
        className={cn(
          'pointer-events-none absolute -top-8 -right-8 hidden',
          'size-72 rotate-12 stroke-[1.35] xl:block',
          theme.icon,
          theme.darkIcon
        )}
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full flex-col gap-5 sm:max-w-3xl">
        <div className="space-y-2">
          <Label htmlFor="course-edit-title">Название курса</Label>
          <Input
            id="course-edit-title"
            value={course.title}
            onChange={(event) =>
              onChange({ ...course, title: event.target.value })
            }
            aria-invalid={!!errors.title}
            className={cn(
              'h-auto border-0 bg-background/55 px-3 py-2',
              'font-bold tracking-tight shadow-none md:text-3xl',
              'focus-visible:bg-background/80'
            )}
          />
          <FieldError>{errors.title}</FieldError>
        </div>

        <div className="max-w-2xl space-y-2">
          <Label htmlFor="course-edit-short-title">
            Короткое название курса
          </Label>
          <Input
            id="course-edit-short-title"
            value={course.shortTitle}
            onChange={(event) =>
              onChange({ ...course, shortTitle: event.target.value })
            }
            aria-invalid={!!errors.shortTitle}
            className="border-0 bg-background/55 shadow-none focus-visible:bg-background/80"
          />
          <FieldError>{errors.shortTitle}</FieldError>
        </div>

        <CourseIconPicker
          value={course.iconName}
          onChange={(iconName) => onChange({ ...course, iconName })}
        />
        <CourseColorPicker
          value={course.color}
          onChange={(color) => onChange({ ...course, color })}
        />

        <div className="max-w-2xl space-y-2">
          <Label htmlFor="course-edit-slug">Slug курса</Label>
          <div
            className={cn(
              'flex items-center rounded-md border-0 bg-background/55 shadow-xs',
              'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50'
            )}
          >
            <span className="shrink-0 pl-3 text-sm text-muted-foreground">
              /courses/
            </span>
            <input
              id="course-edit-slug"
              value={course.courseId}
              onChange={(event) =>
                onChange({ ...course, courseId: event.target.value })
              }
              aria-invalid={!!errors.courseId}
              className={cn(
                'h-9 min-w-0 flex-1 bg-transparent px-1 py-1 text-sm',
                'font-mono outline-none placeholder:text-muted-foreground'
              )}
            />
          </div>
          <FieldError>{errors.courseId}</FieldError>
        </div>

        <div className="max-w-2xl space-y-2">
          <Label htmlFor="course-edit-description">Описание курса</Label>
          <textarea
            id="course-edit-description"
            value={course.description}
            onChange={(event) =>
              onChange({ ...course, description: event.target.value })
            }
            rows={4}
            aria-invalid={!!errors.description}
            className={cn(
              'w-full resize-y rounded-xl border-0 bg-background/55 px-3 py-2',
              'text-base leading-7 text-foreground/85 shadow-none outline-none',
              'focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:text-lg'
            )}
          />
          <FieldError>{errors.description}</FieldError>
        </div>

        <div
          className={cn(
            'flex max-w-2xl flex-col items-start gap-2 sm:flex-row',
            'sm:flex-wrap'
          )}
        >
          {course.teachers.map((teacher) => (
            <a
              key={teacher.username}
              href={`/@${teacher.username}`}
              className={cn(
                'max-w-full truncate rounded-lg bg-background/70 px-3 py-2',
                'text-sm font-medium text-foreground transition-colors',
                'hover:bg-background focus-visible:ring-2',
                'focus-visible:ring-ring focus-visible:outline-none'
              )}
            >
              {teacherFullName(teacher)}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
