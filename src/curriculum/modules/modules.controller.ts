import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  ParseFilePipe,
  FileTypeValidator,
  Patch,
  Post,
  Put,
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
  ApiPayloadTooLargeResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminOnly } from '../../auth/decorators/admin-only.decorator';
import { CreateModuleDto } from './dto/create-module.dto';
import { ListModulesQueryDto } from './dto/list-modules-query.dto';
import {
  ModuleListResponseDto,
  ModuleResponseDto,
} from './dto/module-response.dto';
import { UpdateModuleStatusDto } from './dto/update-module-status.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { MODULE_THUMBNAIL } from './module.constants';
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
    description: 'A module with this title already exists',
  })
  create(@Body() dto: CreateModuleDto) {
    return this.modulesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update any fields of a module (the code never changes)',
  })
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
  @ApiConflictResponse({
    description:
      'Transition not allowed: back to Draft, Draft to Unpublished, or publishing without units',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateModuleStatusDto,
  ) {
    return this.modulesService.updateStatus(id, dto.status);
  }

  @Put(':id/thumbnail')
  @ApiOperation({ summary: 'Upload or replace the module thumbnail image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [MODULE_THUMBNAIL.FIELD],
      properties: {
        [MODULE_THUMBNAIL.FIELD]: {
          type: 'string',
          format: 'binary',
          description: 'JPG or PNG, up to 20 MB',
        },
      },
    },
  })
  @ApiOkResponse({ type: ModuleResponseDto })
  @ApiBadRequestResponse({ description: 'Missing file, or not a JPG/PNG' })
  @ApiPayloadTooLargeResponse({ description: 'File is larger than 20 MB' })
  @ApiNotFoundResponse({ description: 'Module does not exist' })
  @UseInterceptors(
    // The size limit stops oversized uploads before they are buffered in memory.
    FileInterceptor(MODULE_THUMBNAIL.FIELD, {
      limits: { fileSize: MODULE_THUMBNAIL.MAX_BYTES, files: 1 },
    }),
  )
  setThumbnail(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            fileType: MODULE_THUMBNAIL.MIME_TYPES,
            // Store the type detected from the bytes, not the client's claim.
            overrideMimeType: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.modulesService.setThumbnail(id, file);
  }

  @Delete(':id/thumbnail')
  @ApiOperation({ summary: 'Remove the module thumbnail image' })
  @ApiOkResponse({ type: ModuleResponseDto })
  @ApiNotFoundResponse({ description: 'Module does not exist' })
  removeThumbnail(@Param('id', ParseUUIDPipe) id: string) {
    return this.modulesService.removeThumbnail(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a Draft module and all its units' })
  @ApiNoContentResponse({ description: 'Module deleted' })
  @ApiNotFoundResponse({ description: 'Module does not exist' })
  @ApiConflictResponse({
    description: 'Module has been published; unpublish it instead',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.modulesService.remove(id);
  }
}
