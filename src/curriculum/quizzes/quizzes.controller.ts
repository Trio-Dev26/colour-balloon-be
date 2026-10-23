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
  Put,
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
import { CreateQuizDto } from './dto/create-quiz.dto';
import { ListQuizzesQueryDto } from './dto/list-quizzes-query.dto';
import { QuizListResponseDto, QuizResponseDto } from './dto/quiz-response.dto';
import { SetQuizQuestionsDto } from './dto/set-quiz-questions.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { QuizzesService } from './quizzes.service';

@ApiTags('quizzes')
@AdminOnly()
@Controller('admin/quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get()
  @ApiOperation({
    summary:
      'List quizzes with search, module/unit/type filters and pagination',
  })
  @ApiOkResponse({ type: QuizListResponseDto })
  findAll(@Query() query: ListQuizzesQueryDto) {
    return this.quizzesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one quiz with its questions in order' })
  @ApiOkResponse({ type: QuizResponseDto })
  @ApiNotFoundResponse({ description: 'Quiz does not exist' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.quizzesService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Create a unit quiz (unitId) or the module’s Chapter End Test (moduleId)',
  })
  @ApiCreatedResponse({ type: QuizResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid body, missing or unknown unit/module, or a unit on a Chapter End Test',
  })
  @ApiConflictResponse({
    description: 'The module already has a Chapter End Test',
  })
  create(@Body() dto: CreateQuizDto) {
    return this.quizzesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update titles, descriptions, pass mark or Required/Optional',
  })
  @ApiOkResponse({ type: QuizResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid body, or making the Chapter End Test optional',
  })
  @ApiNotFoundResponse({ description: 'Quiz does not exist' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQuizDto) {
    return this.quizzesService.update(id, dto);
  }

  @Put(':id/questions')
  @ApiOperation({
    summary:
      'Save the quiz’s whole ordered question list (add, remove, reorder)',
  })
  @ApiOkResponse({ type: QuizResponseDto })
  @ApiBadRequestResponse({
    description: 'Unknown question, or one from outside the quiz’s unit/module',
  })
  @ApiNotFoundResponse({ description: 'Quiz does not exist' })
  setQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetQuizQuestionsDto,
  ) {
    return this.quizzesService.setQuestions(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a quiz' })
  @ApiNoContentResponse({ description: 'Quiz deleted' })
  @ApiNotFoundResponse({ description: 'Quiz does not exist' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.quizzesService.remove(id);
  }
}
