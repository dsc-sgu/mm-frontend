import { isSafeReviewHref } from '@/features/course/model/links';

export type LinkDialogState =
  | { status: 'closed' }
  | { status: 'open'; url: string; error: string | null };

export type LinkDialogEvent =
  | { type: 'open' }
  | { type: 'close' }
  | { type: 'change-url'; url: string }
  | { type: 'submit' };

export function transitionLinkDialog(
  state: LinkDialogState,
  event: LinkDialogEvent
): LinkDialogState {
  switch (event.type) {
    case 'open':
      return { status: 'open', url: '', error: null };
    case 'close':
      return { status: 'closed' };
    case 'change-url':
      if (state.status === 'closed') {
        return state;
      }

      return { status: 'open', url: event.url, error: null };
    case 'submit':
      if (state.status === 'closed') {
        return state;
      }
      if (!isSafeReviewHref(state.url)) {
        return {
          ...state,
          error: 'Введите http, https или путь от корня сайта',
        };
      }

      return { status: 'closed' };
  }
}
