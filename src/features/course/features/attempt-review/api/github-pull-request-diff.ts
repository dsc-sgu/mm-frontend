import { parsePatchFiles, type FileDiffMetadata } from '@pierre/diffs';

import type {
  AttemptReviewChangedFile,
  AttemptReviewFileStatus,
} from '@/features/course/features/attempt-review/model/types';

type GitHubPullRequestDiffInput = {
  owner: string;
  repo: string;
  pullNumber: number;
};

const diffCache = new Map<string, Promise<AttemptReviewChangedFile[]>>();

export function fetchGitHubPullRequestChangedFiles(
  input: GitHubPullRequestDiffInput
): Promise<AttemptReviewChangedFile[]> {
  const path = getGitHubPullRequestPath(input);
  const cached = diffCache.get(path);

  if (cached) {
    return cached;
  }

  const request = fetchAndParseGitHubPullRequestDiff(path);
  diffCache.set(path, request);
  return request;
}

async function fetchAndParseGitHubPullRequestDiff(
  path: string
): Promise<AttemptReviewChangedFile[]> {
  const searchParams = new URLSearchParams({ path });
  const response = await fetch(`/api/diff?${searchParams}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      detail.trim() ||
        `Failed to load GitHub pull request diff (${response.status})`
    );
  }

  const patchText = await response.text();
  const parsedPatches = parsePatchFiles(patchText, encodeURIComponent(path));

  return parsedPatches.flatMap((patch) =>
    patch.files.map((fileDiff) => toAttemptReviewChangedFile(fileDiff))
  );
}

function getGitHubPullRequestPath({
  owner,
  repo,
  pullNumber,
}: GitHubPullRequestDiffInput): string {
  return `/${owner}/${repo}/pull/${pullNumber}`;
}

function toAttemptReviewChangedFile(
  fileDiff: FileDiffMetadata
): AttemptReviewChangedFile {
  return {
    path: fileDiff.name,
    status: toAttemptReviewFileStatus(fileDiff),
    addedLines: countAddedLines(fileDiff),
    deletedLines: countDeletedLines(fileDiff),
    contents: {
      oldText: '',
      newText: '',
    },
    diff: fileDiff,
  };
}

function toAttemptReviewFileStatus(
  fileDiff: FileDiffMetadata
): AttemptReviewFileStatus {
  if (fileDiff.type === 'new') {
    return 'added';
  }

  if (fileDiff.type === 'deleted') {
    return 'deleted';
  }

  return 'changed';
}

function countAddedLines(diff: FileDiffMetadata): number {
  return diff.hunks.reduce((sum, hunk) => sum + hunk.additionLines, 0);
}

function countDeletedLines(diff: FileDiffMetadata): number {
  return diff.hunks.reduce((sum, hunk) => sum + hunk.deletionLines, 0);
}
