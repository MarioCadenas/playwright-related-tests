import { logger } from '../logger';
import type { CoverageReport, SourceMap } from './types';

function fixSourceMap(sourceMap: SourceMap) {
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

export async function getSourceMap(entry: CoverageReport) {
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

    return fixSourceMap(JSON.parse(buffer.toString()));
  }

  const sourceMappingURL = match.find((sourceMap) =>
    sourceMap?.startsWith('https'),
  );

  if (sourceMappingURL) {
    try {
      const response = await fetch(sourceMappingURL).then((r) => r.json());

      return fixSourceMap(response);
    } catch (error) {
      logger.error(error);
    }
  }

  return undefined;
}
