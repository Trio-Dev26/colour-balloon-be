import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CatalogService } from './catalog.service';
import { TaxonomyResponseDto } from './dto/taxonomy-response.dto';

/** Read-only lists for dropdowns and filters. Any signed-in user may read them. */
@ApiTags('catalog')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('levels')
  @ApiOperation({ summary: 'List all levels in display order' })
  @ApiOkResponse({ type: [TaxonomyResponseDto] })
  findLevels() {
    return this.catalogService.findLevels();
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all categories in display order' })
  @ApiOkResponse({ type: [TaxonomyResponseDto] })
  findCategories() {
    return this.catalogService.findCategories();
  }
}
