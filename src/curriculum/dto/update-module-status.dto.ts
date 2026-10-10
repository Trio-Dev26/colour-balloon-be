import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ModuleStatus } from '../../../generated/prisma/enums';

export class UpdateModuleStatusDto {
  @ApiProperty({
    enum: ModuleStatus,
    enumName: 'ModuleStatus',
    example: ModuleStatus.PUBLISHED,
  })
  @IsEnum(ModuleStatus)
  status: ModuleStatus;
}
