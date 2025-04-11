import { logger } from '../logger';
import type { CSSCoverageEntry, JSCoverageEntry, SourceMap } from './types';

function replaceWebpackIfExists(sourceMap: SourceMap) {
  if (!sourceMap || sourceMap.sources.length === 0) {
    return undefined;
  }
  return {
    ...sourceMap,
    sources: sourceMap.sources.map((sourcePath) =>
      sourcePath.replace(/^webpack:\/\/\//, ''),
    ),
  };
}

type Key = 'source' | 'text';

type EntryData<T extends Key> = T extends 'source'
  ? { entry: JSCoverageEntry; key: 'source' }
  : { entry: CSSCoverageEntry; key: 'text' };

export async function getSourceMap<T extends Key>(
  entryData: EntryData<T>,
  headers: Record<string, string>,
) {
  const base64Header = 'data:application/json;charset=utf-8;base64,';
  const regex =
    entryData.key === 'source'
      ? /\/\/# sourceMappingURL=(.*)/g
      : /\/\*# sourceMappingURL=(.*) \*\//g;

  const content =
    entryData.key === 'source'
      ? (entryData.entry as JSCoverageEntry).source
      : (entryData.entry as CSSCoverageEntry).text;

  const match = [...(content ?? '').matchAll(regex)].map((match) => match[1]);

  const sourceMappingBase64 = match.find((sourceMap) =>
    sourceMap?.startsWith(base64Header),
  );

  if (sourceMappingBase64) {
    const buffer = Buffer.from(
      sourceMappingBase64.slice(base64Header.length),
      'base64',
    );

    return replaceWebpackIfExists(JSON.parse(buffer.toString()));
  }

  let sourceMappingURL = match.find((sourceMap) =>
    sourceMap?.startsWith('https'),
  );

  // relative path
  if (!sourceMappingURL && match.length > 0) {
    sourceMappingURL = entryData.entry.url + '.map';
  }

  if (sourceMappingURL) {
    try {
      const response = await fetch(sourceMappingURL, {
        headers,
      }).then((r) => r.json());

      return replaceWebpackIfExists(response);
    } catch (error) {
      logger.error(error);
    }
  }

  return undefined;
}
