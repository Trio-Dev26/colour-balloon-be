import { ApiProperty } from '@nestjs/swagger';
import { LessonFileGroup } from '../../../../generated/prisma/enums';

export class LessonFileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: LessonFileGroup, enumName: 'LessonFileGroup' })
  group: LessonFileGroup;

  @ApiProperty({ example: 1, description: 'Position inside its group' })
  sequence: number;

  @ApiProperty({ example: 'Lesson 1 worksheet.pdf' })
  fileName: string;

  @ApiProperty({
    example: 'application/pdf',
    description: "Detected from the file's bytes",
  })
  contentType: string;

  @ApiProperty({ example: 524288 })
  sizeBytes: number;

  @ApiProperty({ type: String, nullable: true })
  captionEn: string | null;

  @ApiProperty({ type: String, nullable: true })
  captionMy: string | null;

  @ApiProperty({ description: 'Signed URL for preview, valid for 1 hour' })
  url: string;

  @ApiProperty({ format: 'uuid' })
  lessonId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
