/** URLs allowed in saved rich text; relative paths are same-origin links. */
export function isSafeCourseHref(href: string) {
  return (
    /^(?:https?:\/\/|mailto:|tel:|\/(?!\/)|#)/iu.test(href) &&
    ![...href].some(
      (character) =>
        character.charCodeAt(0) <= 32 ||
        character.charCodeAt(0) === 127 ||
        character === '\\'
    )
  );
}
export function isExternalCourseHref(href: string) {
  return /^https?:\/\//iu.test(href);
}
