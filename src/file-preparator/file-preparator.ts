import { type Config } from '../config';

export class FilePreparator {
  config: Config;

  constructor(config: Config) {
    this.config = config;

    this.outOfProjectFiles = this.outOfProjectFiles.bind(this);
    this.ignorePatternChecker = this.ignorePatternChecker.bind(this);
  }

  ignorePatternChecker(value: string): boolean {
    return this.config.affectedIgnorePatterns.some((pattern) =>
      value.match(pattern),
    );
  }

  outOfProjectFiles(source: string) {
    return (
      !source.startsWith('../') &&
      !source.startsWith('webpack') &&
      !this.ignorePatternChecker(source)
    );
  }

  toGitComparable(path: string): string {
    let normalizedPath = path.replace(/\\/g, '/');

    if (normalizedPath.startsWith('./')) {
      normalizedPath = normalizedPath.substring(2);
    }

    // Remove query params
    normalizedPath = normalizedPath.replace(/\?.*$/, '');

    return normalizedPath;
  }
}
