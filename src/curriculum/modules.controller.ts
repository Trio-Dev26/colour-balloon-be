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
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { CreateModuleDto } from './dto/create-module.dto';
import { ListModulesQueryDto } from './dto/list-modules-query.dto';
import {
  ModuleListResponseDto,
  ModuleResponseDto,
} from './dto/module-response.dto';
import { UpdateModuleStatusDto } from './dto/update-module-status.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModulesService } from './modules.service';

@ApiTags('modules')
@AdminOnly()
@Controller('admin/modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Get()
  @ApiOperation({ summary: 'List modules with search, filters and pagination' })
  @ApiOkResponse({ type: ModuleListResponseDto })
  findAll(@Query() query: ListModulesQueryDto) {
    return this.modulesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one module' })
  @ApiOkResponse({ type: ModuleResponseDto })
  @ApiNotFoundResponse({ description: 'Module does not exist' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.modulesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a module' })
  @ApiCreatedResponse({ type: ModuleResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid body or unknown level/category',
  })
  @ApiConflictResponse({
    description: 'A module with this code or title already exists',
  })
  create(@Body() dto: CreateModuleDto) {
    return this.modulesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update any fields of a module' })
  @ApiOkResponse({ type: ModuleResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid body or unknown level/category',
  })
  @ApiNotFoundResponse({ description: 'Module does not exist' })
  @ApiConflictResponse({
    description: 'A module with this title already exists',
  })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateModuleDto) {
    return this.modulesService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change a module status (DRAFT, PUBLISHED or UNPUBLISHED)',
  })
  @ApiOkResponse({ type: ModuleResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid status' })
  @ApiNotFoundResponse({ description: 'Module does not exist' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateModuleStatusDto,
  ) {
    return this.modulesService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a module' })
  @ApiNoContentResponse({ description: 'Module deleted' })
  @ApiNotFoundResponse({ description: 'Module does not exist' })
  @ApiConflictResponse({ description: 'Module still has content' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.modulesService.remove(id);
  }
}
