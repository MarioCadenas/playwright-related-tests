import path from 'node:path';
import process from 'node:process';

export const RELATIONSHIP_TYPES = {
  MAIN: 'main',
  COMMIT: 'commit',
} as const;

const AFFECTED_FILES_FOLDER_NAME = '.affected-files';

export const AFFECTED_FILES_FOLDER = path.join(
  process.cwd(),
  AFFECTED_FILES_FOLDER_NAME,
);
