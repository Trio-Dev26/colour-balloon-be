import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({
    description: 'Only needed when the refresh_token cookie is not sent',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
