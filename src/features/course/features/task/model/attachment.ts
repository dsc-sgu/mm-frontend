const FILE_SIZE_FORMAT = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 1,
});

const FILE_SIZE_UNITS = ['Б', 'КБ', 'МБ', 'ГБ'] as const;

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
