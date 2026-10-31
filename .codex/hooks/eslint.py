"""Lint TypeScript files changed by a Codex apply_patch call."""

import json
from pathlib import Path
import subprocess
import sys


def changed_paths(patch):
    paths = []
    for line in patch.splitlines():
        if line.startswith(('*** Add File: ', '*** Update File: ')):
            paths.append(line.split(': ', 1)[1])
        elif line.startswith('*** Move to: ') and paths:
            paths[-1] = line.removeprefix('*** Move to: ')
    return paths


def main():
    event = json.load(sys.stdin)
    if event.get('tool_name') != 'apply_patch':
        return 0
    patch = event.get('tool_input', {}).get('command', '')
    cwd = Path(event['cwd']).resolve()
    root = Path(subprocess.check_output(
        ['git', '-C', str(cwd), 'rev-parse', '--show-toplevel'], text=True
    ).strip()).resolve()
    files = []
    for name in changed_paths(patch):
        path = (cwd / name).resolve()
        if (path.is_relative_to(root) and path.suffix in {'.ts', '.tsx'}
                and path.is_file() and path not in files):
            files.append(path)
    if not files:
        return 0
    eslint = root / 'node_modules/.bin/eslint'
    if not eslint.is_file():
        print('ESLint hook: run bun install first.', file=sys.stderr)
        return 2
    result = subprocess.run(
        [str(eslint), '--no-warn-ignored', '--', *map(str, files)],
        cwd=root, capture_output=True, text=True, timeout=50
    )
    if result.returncode:
        print(result.stdout + result.stderr, file=sys.stderr, end='')
        return 2
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        print(f'ESLint hook: {error}', file=sys.stderr)
        sys.exit(2)
