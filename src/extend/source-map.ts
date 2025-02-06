import { logger } from '../logger';
import type { CoverageReport, SourceMap } from './types';

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

export async function getSourceMap(
  entry: CoverageReport,
  headers: Record<string, string>,
) {
  const base64Header = 'data:application/json;charset=utf-8;base64,';
  const match = [
    ...(entry.source ?? '').matchAll(/\/\/# sourceMappingURL=(.*)/g),
  ].map((match) => match[1]);

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
    sourceMappingURL = entry.url + '.map';
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
