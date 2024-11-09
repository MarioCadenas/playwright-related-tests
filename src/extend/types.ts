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

export type CoverageReport = {
  url: string;
  scriptId: string;
  source?: string;
  functions: CoverageReportFunction[];
};

export type SourceMap = {
  version: number;
  sources: string[];
  names: string[];
  mappings: string;
  file: string;
  sourcesContent: string[];
  sourceRoot: string;
};
