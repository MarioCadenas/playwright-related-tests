import { type Coverage } from '@playwright/test';

export type CoverageReportRange = {
  count: number;
  startOffset: number;
  endOffset: number;
};

export type CoverageReportFunction = {
  functionName: string;
  isBlockCoverage: boolean;
  ranges: CoverageReportRange[];
};

export type JSCoverageReport = Awaited<ReturnType<Coverage['stopJSCoverage']>>;
export type CSSCoverageReport = Awaited<
  ReturnType<Coverage['stopCSSCoverage']>
>;
export type JSCoverageEntry = JSCoverageReport[number];
export type CSSCoverageEntry = CSSCoverageReport[number];

export type CoverageEntry = JSCoverageEntry | CSSCoverageEntry;

export type SourceMap = {
  version: number;
  sources: string[];
  names: string[];
  mappings: string;
  file: string;
  sourcesContent: string[];
  sourceRoot: string;
};
