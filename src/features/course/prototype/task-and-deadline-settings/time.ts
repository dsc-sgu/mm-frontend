// PROTOTYPE (#181): time helpers. Moments are epoch milliseconds; input and
// display use the browser time zone, always labelled.

const DAY = 24 * 60 * 60 * 1000;

/** The prototype clock is frozen so the fixture always tells the same story. */
export const NOW = new Date('2026-10-13T12:00:00+04:00').getTime();

export function shiftDays(at: number, days: number) {
  const date = new Date(at);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

export function dayDiff(from: number, to: number) {
  return Math.round((to - from) / DAY);
}

export function startOfDay(at: number) {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function timeZoneLabel() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = -new Date(NOW).getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '−';
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const utc = `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`;

  return `${zone.replace('Europe/', '')}, ${utc}`;
}

const shortFormat = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const shortWithYearFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const compactFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
});

const longFormat = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const clockFormat = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
});

function sameYear(at: number) {
  return new Date(at).getFullYear() === new Date(NOW).getFullYear();
}

function trimDot(text: string) {
  return text.replace(/\.(?=,|\s|$)/g, '');
}

/** «вт, 22 сент., 23:59»; the year appears only outside the current one. */
export function formatMoment(at: number) {
  return trimDot(
    sameYear(at) ? shortFormat.format(at) : shortWithYearFormat.format(at)
  );
}

/** «22 сент.» without time, for dense cells. */
export function formatDay(at: number) {
  return trimDot(compactFormat.format(at));
}

export function formatClock(at: number) {
  return clockFormat.format(at);
}

export function formatMomentLong(at: number) {
  return longFormat.format(at);
}

/** Shows the time only when it is not the default 23:59 of a deadline. */
export function formatCompactMoment(at: number, defaultTime = '23:59') {
  const time = formatClock(at);
  return time === defaultTime ? formatDay(at) : `${formatDay(at)} ${time}`;
}

export function formatDuration(ms: number) {
  const abs = Math.abs(ms);
  const days = Math.floor(abs / DAY);
  const hours = Math.floor((abs % DAY) / (60 * 60 * 1000));

  if (days > 0) {
    return hours > 0 ? `${days} д ${hours} ч` : `${days} д`;
  }

  const minutes = Math.max(1, Math.round(abs / 60000));
  return hours > 0 ? `${hours} ч` : `${minutes} мин`;
}

export function formatInputValue(at: number) {
  const date = new Date(at);
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type ParsedMoment =
  | { status: 'empty' }
  | { status: 'valid'; at: number; usedDefaultTime: boolean }
  | { status: 'invalid'; message: string };

/**
 * Accepts «22.09», «22.09.2026», «22.09 18:00», «22/9 9:30», «2026-09-22».
 * Without a year, picks the one closest to the prototype clock. Without
 * time, uses `defaultTime` — 23:59 for deadlines, 00:00 for opening times.
 */
export function parseMomentInput(
  raw: string,
  defaultTime: '23:59' | '00:00'
): ParsedMoment {
  const text = raw.trim().replace(/\s+/g, ' ');

  if (!text) {
    return { status: 'empty' };
  }

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})[:.](\d{2}))?$/.exec(
    text
  );
  const ru =
    /^(\d{1,2})[./](\d{1,2})(?:[./](\d{2}|\d{4}))?(?:[ ,]+(\d{1,2})[:.](\d{2}))?$/.exec(
      text
    );

  let day: number;
  let month: number;
  let year: number | undefined;
  let hours: number | undefined;
  let minutes: number | undefined;

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
    hours = iso[4] === undefined ? undefined : Number(iso[4]);
    minutes = iso[5] === undefined ? undefined : Number(iso[5]);
  } else if (ru) {
    day = Number(ru[1]);
    month = Number(ru[2]);
    year =
      ru[3] === undefined
        ? undefined
        : ru[3].length === 2
          ? 2000 + Number(ru[3])
          : Number(ru[3]);
    hours = ru[4] === undefined ? undefined : Number(ru[4]);
    minutes = ru[5] === undefined ? undefined : Number(ru[5]);
  } else {
    return {
      status: 'invalid',
      message: 'Формат: 22.09, 22.09.2026 или 22.09 18:00',
    };
  }

  const usedDefaultTime = hours === undefined;
  const [defaultHours, defaultMinutes] = defaultTime.split(':').map(Number);
  hours ??= defaultHours;
  minutes ??= defaultMinutes;

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { status: 'invalid', message: 'Такой даты нет' };
  }

  if (hours > 23 || minutes > 59) {
    return { status: 'invalid', message: 'Время от 00:00 до 23:59' };
  }

  const build = (candidateYear: number) =>
    new Date(candidateYear, month - 1, day, hours, minutes).getTime();

  if (year === undefined) {
    const currentYear = new Date(NOW).getFullYear();
    const candidates = [currentYear - 1, currentYear, currentYear + 1].map(
      build
    );
    const closest = candidates.reduce((best, candidate) =>
      Math.abs(candidate - NOW) < Math.abs(best - NOW) ? candidate : best
    );
    const check = new Date(closest);

    if (check.getDate() !== day) {
      return { status: 'invalid', message: 'Такой даты нет' };
    }

    return { status: 'valid', at: closest, usedDefaultTime };
  }

  const at = build(year);

  if (new Date(at).getDate() !== day) {
    return { status: 'invalid', message: 'Такой даты нет' };
  }

  return { status: 'valid', at, usedDefaultTime };
}
