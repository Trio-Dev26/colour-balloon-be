import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { QuizType } from '../../../../generated/prisma/enums';
import { Trim } from '../../../common/decorators/trim.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListQuizzesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiPropertyOptional({ enum: QuizType, enumName: 'QuizType' })
  @IsOptional()
  @IsEnum(QuizType)
  type?: QuizType;

  @ApiPropertyOptional({
    description: 'Matches the code, English title or Myanmar title',
  })
  @IsOptional()
  @Trim()
  @IsString()
  search?: string;
}
