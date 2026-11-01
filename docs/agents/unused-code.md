# Проверка неиспользуемого кода

`bun run knip` проверяет неиспользуемые файлы, зависимости, экспорты значений и типов, неразрешённые импорты и остальные штатные категории Knip. В CI проверка обязательна в задании сборки после `bun run build`: на чистой копии сначала нужен сгенерированный `src/routeTree.gen.ts`.

## Достижимость

- `src/main.tsx` — явная точка входа, импортирующая сгенерированное дерево маршрутов. Маршруты достижимы через это дерево; не нужно объявлять каждый файл маршрута отдельной точкой входа.
- `src/**/*.type-test.ts` — отдельные проверки типов, указанные в `entry`.
- Плагины Knip читают конфигурации Vitest и Playwright: учитываются unit-, компонентные и браузерные тесты, их подготовка и `tooling/eslint/blank-lines.test.js`.
- Моки достижимы через динамический импорт `app/mock-backend/browser` из `main.tsx`, тестовые импорты и операции функций предметной области.
- Пул Web Workers достижим через страницу проверки попытки. Скрипт Worker поставляет пакет `@pierre/diffs`, на который ссылается `new URL('@pierre/diffs/worker/worker.js', import.meta.url)`. В репозитории нет отдельного локального скрипта Worker, требующего новой точки входа. Скрипт MSW также поставляется пакетом и обслуживается плагином в `vite.config.ts`.

## Исключения shadcn

В `knip.json` только категория `exports` исключена для восьми конкретных файлов штатных компонентов shadcn. Это сохраняет целостный набор частей компонентов и вариантов, устанавливаемый CLI. Внутренние зависимости, импорты, типы и достижимость самих файлов продолжают проверяться. Новые файлы автоматически под исключение не попадают.

Сохранены следующие неиспользуемые сейчас части:

- `button.tsx`: `buttonVariants`.
- `card.tsx`: `CardFooter`, `CardAction`.
- `avatar.tsx`: `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`.
- `dropdown-menu.tsx`: `DropdownMenuPortal`, `DropdownMenuGroup`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuShortcut`.
- `drawer.tsx`: `DrawerPortal`, `DrawerOverlay`, `DrawerClose`, `DrawerFooter`, `DrawerDescription`.
- `popover.tsx`: `PopoverHeader`, `PopoverTitle`, `PopoverDescription`.
- `command.tsx`: `CommandDialog`, `CommandShortcut`, `CommandSeparator`.
- `dialog.tsx`: `DialogClose`, `DialogFooter`, `DialogOverlay`, `DialogPortal`, `DialogTrigger`.

Не расширяйте эти исключения на код возможностей или все файлы каталога. При изменении компонентов пересматривайте список; подтверждённо неиспользуемое объявление удаляется, а используемое только внутри файла лишается `export`.
