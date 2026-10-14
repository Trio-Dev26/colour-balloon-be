import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';

/** Required, trimmed, non-blank string of at most `maxLength` characters. */
export const RequiredText = (maxLength: number, example: string) =>
  applyDecorators(
    ApiProperty({ example, maxLength }),
    Trim(),
    IsString(),
    IsNotEmpty(),
    MaxLength(maxLength),
  );

/** Required rich-text document from the editor (any JSON object). */
export const RichText = (description: string) =>
  applyDecorators(
    ApiProperty({
      type: 'object',
      additionalProperties: true,
      description,
      example: { type: 'doc', content: [] },
    }),
    IsObject(),
  );
