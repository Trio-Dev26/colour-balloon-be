import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminOnly } from '../../auth/decorators/admin-only.decorator';
import { CreateQuestionDto } from './dto/create-question.dto';
import { ListQuestionsQueryDto } from './dto/list-questions-query.dto';
import {
  QuestionListResponseDto,
  QuestionResponseDto,
  UploadedMediaDto,
} from './dto/question-response.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QUESTION_MEDIA } from './question.constants';
import { QuestionsService } from './questions.service';

@ApiTags('questions')
@AdminOnly()
@Controller('admin/questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({
    summary:
      'List questions with search, module/unit/type filters and pagination',
  })
  @ApiOkResponse({ type: QuestionListResponseDto })
  findAll(@Query() query: ListQuestionsQueryDto) {
    return this.questionsService.findAll(query);
  }

  @Post('media')
  @ApiOperation({
    summary:
      'Upload an image for a question being written; use the returned id in promptMediaIds or answers',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [QUESTION_MEDIA.FIELD],
      properties: {
        [QUESTION_MEDIA.FIELD]: {
          type: 'string',
          format: 'binary',
          description: 'JPG or PNG, up to 20 MB',
        },
      },
    },
  })
  @ApiCreatedResponse({ type: UploadedMediaDto })
  @ApiBadRequestResponse({ description: 'Missing file, or not a JPG/PNG' })
  @ApiPayloadTooLargeResponse({ description: 'File is larger than 20 MB' })
  @UseInterceptors(
    // The size limit stops oversized uploads before they are buffered in memory.
    FileInterceptor(QUESTION_MEDIA.FIELD, {
      limits: { fileSize: QUESTION_MEDIA.MAX_BYTES, files: 1 },
    }),
  )
  uploadMedia(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            fileType: QUESTION_MEDIA.MIME_TYPES,
            // Store the type detected from the bytes, not the client's claim.
            overrideMimeType: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.questionsService.uploadMedia(file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one question with its images and quizzes' })
  @ApiOkResponse({ type: QuestionResponseDto })
  @ApiNotFoundResponse({ description: 'Question does not exist' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a question in a unit' })
  @ApiCreatedResponse({ type: QuestionResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid body or answers for the type, unknown unit, or unknown image id',
  })
  create(@Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a question (its unit never changes)' })
  @ApiOkResponse({ type: QuestionResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid body or answers for the type, or unknown image id',
  })
  @ApiNotFoundResponse({ description: 'Question does not exist' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a question that is in no quiz' })
  @ApiNoContentResponse({ description: 'Question deleted' })
  @ApiNotFoundResponse({ description: 'Question does not exist' })
  @ApiConflictResponse({
    description: 'Used in a quiz; remove it from those quizzes first (D18)',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionsService.remove(id);
  }
}
