import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Matches, Max, Min } from 'class-validator';
import { LessonFileGroup } from '../../../../generated/prisma/enums';
import { RequiredText } from '../../shared/fields';
import { LESSON_FILE } from '../lesson-file.constants';

export class RequestUploadDto {
  @ApiProperty({ enum: LessonFileGroup, enumName: 'LessonFileGroup' })
  @IsEnum(LessonFileGroup)
  group: LessonFileGroup;

  @RequiredText(255, 'Lesson 1 worksheet.pdf')
  fileName: string;

  @ApiProperty({
    example: 'application/pdf',
    description:
      "The browser's File.type; the upload must send the same Content-Type",
  })
  @IsString()
  @Matches(/^[\w.+-]+\/[\w.+-]+$/)
  contentType: string;

  @ApiProperty({ example: 524288, description: 'Bytes, at most 200 MB' })
  @IsInt()
  @Min(1)
  @Max(LESSON_FILE.MAX_BYTES)
  size: number;
}

export class UploadUrlResponseDto {
  @ApiProperty({
    description: 'PUT the file body here with the same Content-Type header',
  })
  uploadUrl: string;

  @ApiProperty({
    example: 'lessons/0199…/0199….pdf',
    description: 'Send back to POST /files after the upload',
  })
  key: string;

  @ApiProperty({ example: 900, description: 'Seconds until uploadUrl expires' })
  expiresIn: number;
}
