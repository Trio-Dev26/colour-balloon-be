import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminOnly } from '../../auth/decorators/admin-only.decorator';
import { LessonFileResponseDto } from './dto/lesson-file-response.dto';
import { RegisterFileDto, UpdateFileDto } from './dto/register-file.dto';
import { ReorderFilesDto } from './dto/reorder-files.dto';
import {
  RequestUploadDto,
  UploadUrlResponseDto,
} from './dto/request-upload.dto';
import { LessonFilesService } from './lesson-files.service';

@ApiTags('lesson files')
@AdminOnly()
@ApiNotFoundResponse({ description: 'Lesson (or file) does not exist' })
@Controller('admin/lessons/:lessonId/files')
export class LessonFilesController {
  constructor(private readonly lessonFilesService: LessonFilesService) {}

  @Get()
  @ApiOperation({
    summary: 'All files of the lesson, by group then order, with preview URLs',
  })
  @ApiOkResponse({ type: [LessonFileResponseDto] })
  findAll(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    return this.lessonFilesService.findAll(lessonId);
  }

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Step 1: get a signed URL, then PUT the file to it from the browser',
  })
  @ApiOkResponse({ type: UploadUrlResponseDto })
  @ApiBadRequestResponse({
    description: 'Type not allowed for the group, or over 200 MB',
  })
  requestUpload(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: RequestUploadDto,
  ) {
    return this.lessonFilesService.requestUpload(lessonId, dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Step 2: register the uploaded file at the end of its group',
  })
  @ApiCreatedResponse({ type: LessonFileResponseDto })
  @ApiBadRequestResponse({
    description:
      'Not uploaded, wrong key, empty, over 200 MB, or real type not allowed (the upload is removed)',
  })
  @ApiConflictResponse({ description: 'The upload is already registered' })
  register(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: RegisterFileDto,
  ) {
    return this.lessonFilesService.register(lessonId, dto);
  }

  // Declared before ':fileId' so "reorder" is not parsed as a file id.
  @Patch('reorder')
  @ApiOperation({ summary: 'Set the order of all files in one group' })
  @ApiOkResponse({ type: [LessonFileResponseDto] })
  @ApiBadRequestResponse({
    description: 'fileIds is not exactly the files of the group',
  })
  reorder(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: ReorderFilesDto,
  ) {
    return this.lessonFilesService.reorder(lessonId, dto);
  }

  @Patch(':fileId')
  @ApiOperation({ summary: 'Update the captions of a file' })
  @ApiOkResponse({ type: LessonFileResponseDto })
  update(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Body() dto: UpdateFileDto,
  ) {
    return this.lessonFilesService.update(lessonId, fileId, dto);
  }

  @Delete(':fileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file and its stored object' })
  @ApiNoContentResponse({ description: 'File deleted' })
  remove(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.lessonFilesService.remove(lessonId, fileId);
  }
}
