#!/usr/bin/env bash
# PostToolUse hook: lints a .ts/.tsx file after Claude edits it.
# Exit code 2 sends stderr back to Claude, so it sees and fixes the errors.

if ! command -v jq >/dev/null; then
  echo 'eslint hook: jq is not installed, skipping' >&2
  exit 1
fi

file=$(jq -r '.tool_input.file_path // empty')

case "$file" in
  *.ts | *.tsx) ;;
  *) exit 0 ;;
esac

[ -f "$file" ] || exit 0

eslint="$CLAUDE_PROJECT_DIR/node_modules/.bin/eslint"
if [ ! -x "$eslint" ]; then
  echo 'eslint hook: eslint is not installed, run `bun install`' >&2
  exit 1
fi

cd "$CLAUDE_PROJECT_DIR" || exit 1

if ! output=$("$eslint" --no-warn-ignored "$file" 2>&1); then
  echo "$output" >&2
  exit 2
fi
