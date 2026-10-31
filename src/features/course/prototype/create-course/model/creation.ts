// PROTOTYPE mm-277: local simulation; no backend or durable commands.
export type Scenario =
  | 'success'
  | 'conflict'
  | 'check-failure'
  | 'timeout'
  | 'late-success';
export type CreatedCourse = { id: string; name: string; slug: string };
export type CreationState =
  | { phase: 'editing'; conflict: boolean }
  | { phase: 'sending'; command: CreatedCourse }
  | { phase: 'unknown'; command: CreatedCourse }
  | { phase: 'success'; course: CreatedCourse };
export type CreationEvent =
  | { type: 'send'; command: CreatedCourse }
  | { type: 'timeout' }
  | { type: 'conflict' }
  | { type: 'succeed'; course: CreatedCourse }
  | { type: 'edit' }
  | { type: 'reset' };
export function transition(
  state: CreationState,
  event: CreationEvent
): CreationState {
  switch (event.type) {
    case 'send':
      if (state.phase === 'sending' || state.phase === 'success') return state;
      return {
        phase: 'sending',
        command: state.phase === 'unknown' ? state.command : event.command,
      };
    case 'timeout':
      return state.phase === 'sending'
        ? { phase: 'unknown', command: state.command }
        : state;
    case 'conflict':
      return { phase: 'editing', conflict: true };
    case 'succeed':
      return { phase: 'success', course: event.course };
    case 'edit':
      return state.phase === 'editing'
        ? { phase: 'editing', conflict: false }
        : state;
    case 'reset':
      return { phase: 'editing', conflict: false };
  }
}
const letters: Record<string, string> = Object.fromEntries(
  [...'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'].map((letter, index) => [
    letter,
    [
      'a',
      'b',
      'v',
      'g',
      'd',
      'e',
      'yo',
      'zh',
      'z',
      'i',
      'y',
      'k',
      'l',
      'm',
      'n',
      'o',
      'p',
      'r',
      's',
      't',
      'u',
      'f',
      'kh',
      'ts',
      'ch',
      'sh',
      'sch',
      '',
      'y',
      '',
      'e',
      'yu',
      'ya',
    ][index],
  ])
);
export function suggestSlug(name: string) {
  return [...name.toLowerCase()]
    .map((letter) => letters[letter] ?? letter)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
export function validSlug(slug: string) {
  return (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(slug)
  );
}
