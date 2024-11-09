export function outOfProjectFiles(source: string) {
  return !source.startsWith('../') && !source.startsWith('webpack');
}

export function toGitComparable(path: string) {
  let normalizedPath = path.replace(/\\/g, '/');

  if (normalizedPath.startsWith('./')) {
    normalizedPath = normalizedPath.substring(2);
  }

  // Remove query params
  normalizedPath = normalizedPath.replace(/\?.*$/, '');

  return normalizedPath;
}
