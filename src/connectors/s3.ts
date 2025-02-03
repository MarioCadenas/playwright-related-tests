import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { Readable, pipeline as nonPromisePipeline } from 'node:stream';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

import { RemoteConnector } from './base';
import type { RelationshipType } from '../types';
import { Compressor } from '../compressor';
import { tmpdir } from 'node:os';
import { logger } from '../logger';

const pipeline = promisify(nonPromisePipeline);

export class S3Connector extends RemoteConnector {
  private s3: S3Client;
  private bucketName: string;

  constructor() {
    super();

    const region = process.env['AWS_REGION'];
    const accessKeyId = process.env['AWS_ACCESS_KEY_ID'];
    const secretAccessKey = process.env['AWS_ACCESS_KEY_SECRET'];
    const bucketName = process.env['AWS_BUCKET_NAME'];

    const s3Options = {
      region,
      credentials: { accessKeyId, secretAccessKey },
      bucketName,
    };

    this.ensureKeysExist(s3Options);

    this.s3 = new S3Client(s3Options);
    this.bucketName = s3Options.bucketName;
  }

  private ensureKeysExist(keys: {
    region: string | undefined;
    credentials: {
      accessKeyId: string | undefined;
      secretAccessKey: string | undefined;
    };
    bucketName: string | undefined;
  }): asserts keys is {
    region: string;
    credentials: {
      accessKeyId: string;
      secretAccessKey: string;
    };
    bucketName: string;
  } {
    const missing = [];
    const {
      region,
      credentials: { accessKeyId, secretAccessKey },
      bucketName,
    } = keys;

    if (!region) missing.push('AWS_REGION');
    if (!accessKeyId) missing.push('AWS_ACCESS_KEY_ID');
    if (!secretAccessKey) missing.push('AWS_ACCESS_KEY_SECRET');
    if (!bucketName) missing.push('AWS_BUCKET_NAME');

    if (missing.length > 0) {
      throw new Error(
        `Environment variables for the S3 Connector are missing. Please define ${missing.join(', ')}`,
      );
    }
  }

  private async uploadFile(
    filePath: string,
    destination: string,
  ): Promise<void> {
    const fileStream = fs.createReadStream(filePath);
    const contentType = this.getContentType(filePath);
    const input = {
      Bucket: this.bucketName,
      Key: destination,
      Body: fileStream,
      ContentType: contentType,
    };

    try {
      const multipartUpload = new Upload({
        client: this.s3,
        params: input,
      });

      console.log('Upload file to:', `s3://${input.Bucket}/${input.Key}`);
      await multipartUpload.done();
    } catch (err) {
      logger.error(err);
    }
  }

  private async downloadFile(key: string, downloadPath: string): Promise<void> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
    };

    try {
      const command = new GetObjectCommand(params);
      const response = await this.s3.send(command);

      if (response.Body instanceof Readable) {
        await pipeline(response.Body, fs.createWriteStream(downloadPath));
      } else {
        throw new Error('Expected a readable stream from S3');
      }

      logger.log(
        `File downloaded successfully: ${this.bucketName}/${key} to ${downloadPath}`,
      );
    } catch (err) {
      logger.warn(`File ${this.bucketName}/${key} does not exist yet.`);
    }
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      default:
        return 'application/octet-stream';
    }
  }

  async download(
    type: RelationshipType,
    fromPath: string,
  ): Promise<string | null> {
    const filename = `${type}.tar.gz`;
    const filePath = path.join(tmpdir(), filename);
    const tmpToExtract = path.join(tmpdir(), 'extracted');
    const s3FilePath = path.join(fromPath, filename);

    try {
      await this.downloadFile(s3FilePath, filePath);
    } catch {
      logger.log(`File not found: ${s3FilePath}`);

      return null;
    }

    fs.mkdirSync(tmpToExtract, { recursive: true });

    // We should maintain a cache of the downloaded files, so we don't download the same file multiple times.
    // download tar or zip from s3, and maybe extract it. Return the path where the file is
    return Compressor.extract(filePath, tmpToExtract);
  }

  async upload(
    type: RelationshipType,
    folder: string,
    destination: string,
  ): Promise<void> {
    const filename = `${type}.tar.gz`;
    const compressedFilePath = await Compressor.compress(
      folder,
      path.join(tmpdir(), filename),
    );

    return await this.uploadFile(
      compressedFilePath,
      path.join(destination, filename),
    );
  }
}
