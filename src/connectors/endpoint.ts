import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import { RemoteConnector } from './base';
import type { RelationshipType } from '../types';
import { Compressor } from '../compressor';
import { logger } from '../logger';

type FetchOptions = {
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers: Record<string, string>;
  body?: string;
};

export class EndpointConnector extends RemoteConnector {
  constructor() {
    super();
  }

  private async createStream(res: Response, outputPath: string) {
    let nodeReadableStream: Readable;
    if (res?.body) {
      nodeReadableStream = Readable.from(res.body);
    }
    return new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(outputPath);
      if (res.body) {
        nodeReadableStream.pipe(fileStream);
        nodeReadableStream.on('end', resolve);
        fileStream.on('error', reject);
      }
    });
  }

  private async fetch(options: FetchOptions) {
    const { url, method, headers, body } = options || {};
    const response = await fetch(url, {
      method,
      headers,
      ...(body && { body }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response;
  }

  async upload() {
    console.log('Upload not implemented');
  }

  async download(
    type: RelationshipType,
    fromPath: string,
    headers?: Record<string, string>,
  ): Promise<string | null> {
    if (!fromPath) {
      logger.log('No URL provided.');
      return null;
    }
    if (!headers) {
      logger.log('No Headers provided.');
      return null;
    }
    const filename = `${type}.tar.gz`;
    const filePath = path.join(tmpdir(), filename);
    const tmpToExtract = path.join(tmpdir(), 'extracted');

    try {
      const file = await this.fetch({
        url: fromPath,
        // This could possible be a POST request
        method: 'GET',
        headers: headers,
      });
      await this.createStream(file, filePath);
    } catch (e) {
      logger.log(`File could not be fetched: ${e}`);
      return null;
    }

    fs.mkdirSync(tmpToExtract, { recursive: true });

    // We should maintain a cache of the downloaded files, so we don't download the same file multiple times.
    // download tar or zip from s3, and maybe extract it. Return the path where the file is
    return Compressor.extract(filePath, tmpToExtract);
  }
}
