// PROTOTYPE (#181): Task Key suggestion and validation from #180.
const TRANSLIT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export function suggestKey(title: string) {
  return title
    .toLowerCase()
    .split('')
    .map((char) => TRANSLIT[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

const KEY_FORMAT = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export function validateKey(
  key: string,
  takenInGroup: readonly string[]
): string | null {
  if (!key) {
    return 'Введите ключ задания';
  }

  if (!KEY_FORMAT.test(key)) {
    return 'Латиница, цифры, «-» и «_»; первый символ — буква или цифра';
  }

  const lower = key.toLowerCase();

  if (takenInGroup.includes(lower)) {
    let suffix = 2;
    while (takenInGroup.includes(`${lower}-${suffix}`)) {
      suffix += 1;
    }
    return `Ключ «${lower}» уже занят в этой группе заданий. Свободен «${lower}-${suffix}»`;
  }

  return null;
}
