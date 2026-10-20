import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';
import { RequestUploadDto } from './request-upload.dto';

/** Registers a finished upload as a lesson file, at the end of its group. */
export class RegisterFileDto extends PickType(RequestUploadDto, [
  'group',
  'fileName',
] as const) {
  @ApiProperty({ description: 'The key returned by POST /files/upload-url' })
  @IsString()
  key: string;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  captionEn?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  captionMy?: string | null;
}

/** Captions only; send null to clear one. */
export class UpdateFileDto extends PickType(RegisterFileDto, [
  'captionEn',
  'captionMy',
] as const) {}
