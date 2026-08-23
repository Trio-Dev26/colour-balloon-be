import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('storage.bucket')!;
    this.client = new S3Client({
      endpoint: this.configService.get<string>('storage.endpoint'),
      region: this.configService.get<string>('storage.region'),
      forcePathStyle: this.configService.get<boolean>(
        'storage.forcePathStyle',
      ),
      credentials: {
        accessKeyId: this.configService.get<string>('storage.accessKeyId')!,
        secretAccessKey: this.configService.get<string>(
          'storage.secretAccessKey',
        )!,
      },
      // R2 (and some other S3-compatible providers) reject the flexible
      // checksum headers/params the SDK sends by default since v3.729.
      // WHEN_REQUIRED restores the old opt-in behavior. Harmless for MinIO.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async uploadFile(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async getPresignedUploadUrl(
    key: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async getPresignedDownloadUrl(
    key: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async listFiles(
    prefix?: string,
  ): Promise<{ key: string; size: number; lastModified?: Date }[]> {
    const result = await this.client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }),
    );
    return (result.Contents ?? [])
      .filter((object) => object.Key)
      .map((object) => ({
        key: object.Key!,
        size: object.Size ?? 0,
        lastModified: object.LastModified,
      }));
  }
}
