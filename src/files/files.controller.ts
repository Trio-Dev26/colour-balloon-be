import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../storage/storage.service';

const UPLOAD_PREFIX = 'uploads/';

@Controller('files')
export class FilesController {
  constructor(private readonly storageService: StorageService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('A file is required');
    }

    const key = `${UPLOAD_PREFIX}${Date.now()}-${file.originalname}`;
    await this.storageService.uploadFile(key, file.buffer, file.mimetype);
    const url = await this.storageService.getPresignedDownloadUrl(key);

    return {
      key,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
    };
  }

  @Get()
  async list() {
    const files = await this.storageService.listFiles(UPLOAD_PREFIX);
    const withUrls = await Promise.all(
      files.map(async (file) => ({
        ...file,
        originalName: file.key.slice(UPLOAD_PREFIX.length).replace(/^\d+-/, ''),
        url: await this.storageService.getPresignedDownloadUrl(file.key),
      })),
    );
    return withUrls.sort(
      (a, b) => (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0),
    );
  }

  @Delete()
  async remove(@Body('key') key?: string) {
    if (!key || !key.startsWith(UPLOAD_PREFIX)) {
      throw new BadRequestException('A valid file key is required');
    }
    await this.storageService.deleteFile(key);
    return { success: true };
  }
}
