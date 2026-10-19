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
import { CreateUnitDto } from './dto/create-unit.dto';
import { ListUnitsQueryDto } from './dto/list-units-query.dto';
import { ReorderUnitsDto } from './dto/reorder-units.dto';
import { UnitListResponseDto, UnitResponseDto } from './dto/unit-response.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitsService } from './units.service';

@ApiTags('units')
@AdminOnly()
@Controller('admin/units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @ApiOperation({
    summary: 'List units with search, module filter and pagination',
  })
  @ApiOkResponse({ type: UnitListResponseDto })
  findAll(@Query() query: ListUnitsQueryDto) {
    return this.unitsService.findAll(query);
  }

  // Declared before ':id' so "reorder" is not parsed as a unit id.
  @Patch('reorder')
  @ApiOperation({ summary: 'Set the order of all units in a module' })
  @ApiOkResponse({
    type: [UnitResponseDto],
    description: 'The module units in their new order',
  })
  @ApiBadRequestResponse({
    description: 'Unknown module, or unitIds is not exactly the module units',
  })
  @ApiConflictResponse({ description: 'The module is not Draft (D28)' })
  reorder(@Body() dto: ReorderUnitsDto) {
    return this.unitsService.reorder(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one unit' })
  @ApiOkResponse({ type: UnitResponseDto })
  @ApiNotFoundResponse({ description: 'Unit does not exist' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.unitsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a unit at the end of its module' })
  @ApiCreatedResponse({ type: UnitResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body or unknown module' })
  create(@Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a unit; a new moduleId moves it to the end of that module',
  })
  @ApiOkResponse({ type: UnitResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiNotFoundResponse({ description: 'Unit does not exist' })
  @ApiConflictResponse({
    description: 'Moving between modules that are not both Draft (D28)',
  })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a unit' })
  @ApiNoContentResponse({ description: 'Unit deleted' })
  @ApiNotFoundResponse({ description: 'Unit does not exist' })
  @ApiConflictResponse({ description: 'The unit’s module is not Draft (D18)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.unitsService.remove(id);
  }
}
