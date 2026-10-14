import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ModuleStatus } from '../../../../generated/prisma/enums';
import { Trim } from '../../../common/decorators/trim.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListModulesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Matches the code, English title or Myanmar title',
  })
  @IsOptional()
  @Trim()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ModuleStatus, enumName: 'ModuleStatus' })
  @IsOptional()
  @IsEnum(ModuleStatus)
  status?: ModuleStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  levelId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
