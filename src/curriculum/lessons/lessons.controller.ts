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
  Query,
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
import { CreateLessonDto } from './dto/create-lesson.dto';
import {
  LessonListResponseDto,
  LessonResponseDto,
} from './dto/lesson-response.dto';
import { ListLessonsQueryDto } from './dto/list-lessons-query.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonsService } from './lessons.service';

@ApiTags('lessons')
@AdminOnly()
@Controller('admin/lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get()
  @ApiOperation({
    summary: 'List lessons with search, module/unit filter and pagination',
  })
  @ApiOkResponse({ type: LessonListResponseDto })
  findAll(@Query() query: ListLessonsQueryDto) {
    return this.lessonsService.findAll(query);
  }

  // Declared before ':id' so "reorder" is not parsed as a lesson id.
  @Patch('reorder')
  @ApiOperation({ summary: 'Set the order of all lessons in a unit' })
  @ApiOkResponse({
    type: [LessonResponseDto],
    description: 'The unit lessons in their new order',
  })
  @ApiBadRequestResponse({
    description: 'Unknown unit, or lessonIds is not exactly the unit lessons',
  })
  @ApiConflictResponse({ description: 'The module is not Draft (D28)' })
  reorder(@Body() dto: ReorderLessonsDto) {
    return this.lessonsService.reorder(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one lesson with its unit, module, level and category',
  })
  @ApiOkResponse({ type: LessonResponseDto })
  @ApiNotFoundResponse({ description: 'Lesson does not exist' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.lessonsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a lesson at the end of its unit' })
  @ApiCreatedResponse({ type: LessonResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body or unknown unit' })
  create(@Body() dto: CreateLessonDto) {
    return this.lessonsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update a lesson; a new unitId moves it to the end of that unit (Draft modules only)',
  })
  @ApiOkResponse({ type: LessonResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body or unknown unit' })
  @ApiConflictResponse({
    description: 'Moving out of or into a module that is not Draft (D28)',
  })
  @ApiNotFoundResponse({ description: 'Lesson does not exist' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLessonDto) {
    return this.lessonsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lesson' })
  @ApiNoContentResponse({ description: 'Lesson deleted' })
  @ApiConflictResponse({
    description: 'The module is not Draft (D18, until progress is tracked)',
  })
  @ApiNotFoundResponse({ description: 'Lesson does not exist' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.lessonsService.remove(id);
  }
}
