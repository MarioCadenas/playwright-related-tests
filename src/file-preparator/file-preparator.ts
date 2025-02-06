import nodePath from 'node:path';
import { type Config } from '../config';

export class FilePreparator {
  config: Config;

  constructor(config: Config) {
    this.config = config;

    this.outOfProjectFiles = this.outOfProjectFiles.bind(this);
    this.ignorePatternChecker = this.ignorePatternChecker.bind(this);
  }

  ignorePatternChecker(value: string): boolean {
    return (this.config.affectedIgnorePatterns || []).some((pattern) =>
      value.match(pattern),
    );
  }

  outOfProjectFiles(source: string) {
    return !source.startsWith('webpack') && !this.ignorePatternChecker(source);
  }

  toGitComparable(path: string): string {
    let normalizedPath = path.replace(/\\/g, '/');

    if (normalizedPath.startsWith('@fs/')) {
      normalizedPath = normalizedPath.replace(
        nodePath.join('@fs', process.cwd()),
        '',
      );
    }

    if (normalizedPath.startsWith(process.cwd())) {
      normalizedPath = normalizedPath.substring(process.cwd().length);
    }

    if (normalizedPath.startsWith('/')) {
      normalizedPath = normalizedPath.substring(1);
    }

    // Remove leading ./ or ../ or ../../ or ../../../
    normalizedPath = normalizedPath.replace(/^(\.\/|\.\.\/|\/)+/, '');
    // Remove query params
    normalizedPath = normalizedPath.replace(/\?.*$/, '');

    return normalizedPath;
  }
}
