import type { TaskAttachment } from './types';

export type AttachmentCategory =
  | 'pdf'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'archive'
  | 'code'
  | 'image'
  | 'media'
  | 'other';

const FILE_SIZE_FORMAT = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 1,
});

const FILE_SIZE_UNITS = ['Б', 'КБ', 'МБ', 'ГБ'] as const;

export function getAttachmentCategory(
  attachment: Pick<TaskAttachment, 'mimeType' | 'name'>
): AttachmentCategory {
  const mimeType = attachment.mimeType.toLowerCase();
  const extension = getAttachmentExtension(attachment.name).toLowerCase();

  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return 'pdf';
  }

  if (
    mimeType.includes('wordprocessingml') ||
    mimeType === 'application/msword' ||
    ['doc', 'docx', 'odt'].includes(extension)
  ) {
    return 'document';
  }

  if (
    mimeType.includes('spreadsheetml') ||
    mimeType === 'application/vnd.ms-excel' ||
    ['csv', 'ods', 'xls', 'xlsx'].includes(extension)
  ) {
    return 'spreadsheet';
  }

  if (
    mimeType.includes('presentationml') ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    ['odp', 'ppt', 'pptx'].includes(extension)
  ) {
    return 'presentation';
  }

  if (
    [
      'application/zip',
      'application/x-7z-compressed',
      'application/x-rar-compressed',
    ].includes(mimeType) ||
    ['7z', 'gz', 'rar', 'tar', 'zip'].includes(extension)
  ) {
    return 'archive';
  }

  if (
    mimeType.startsWith('text/x-') ||
    ['css', 'html', 'js', 'json', 'md', 'py', 'sh', 'ts', 'tsx'].includes(
      extension
    )
  ) {
    return 'code';
  }

  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
    return 'media';
  }

  return 'other';
}

export function getAttachmentExtension(name: string): string {
  const lastDotIndex = name.lastIndexOf('.');

  if (lastDotIndex <= 0 || lastDotIndex === name.length - 1) {
    return 'ФАЙЛ';
  }

  return name.slice(lastDotIndex + 1).toUpperCase();
}

export function formatFileSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return 'Размер неизвестен';
  }

  if (sizeBytes === 0) {
    return `0 ${FILE_SIZE_UNITS[0]}`;
  }

  const unitIndex = Math.min(
    Math.floor(Math.log(sizeBytes) / Math.log(1024)),
    FILE_SIZE_UNITS.length - 1
  );
  const value = sizeBytes / 1024 ** unitIndex;

  return `${FILE_SIZE_FORMAT.format(value)} ${FILE_SIZE_UNITS[unitIndex]}`;
}
