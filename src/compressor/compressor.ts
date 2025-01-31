import * as path from 'path';
import * as tar from 'tar';

export default class Compressor {
  static async compress(
    directoryPath: string,
    outputPath: string,
  ): Promise<string> {
    await tar.c(
      {
        gzip: true,
        file: outputPath,
        cwd: path.dirname(directoryPath),
      },
      [path.basename(directoryPath)],
    );

    return outputPath;
  }

  static async extract(
    tarFilePath: string,
    extractToPath: string,
  ): Promise<string> {
    await tar.x({
      file: tarFilePath,
      C: extractToPath,
    });

    return extractToPath;
  }
}
