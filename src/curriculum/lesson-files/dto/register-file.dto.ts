import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { RequiredText } from '../../shared/fields';
import { LESSON_FILE } from '../lesson-file.constants';
import { RequestUploadDto } from './request-upload.dto';

/** Registers a finished upload as a lesson file, at the end of its group. */
export class RegisterFileDto extends PickType(RequestUploadDto, [
  'group',
  'fileName',
] as const) {
  @ApiProperty({ description: 'The key returned by POST /files/upload-url' })
  @IsString()
  key: string;

  /** Learners and teachers see the captions next to the file, so both are required. */
  @RequiredText(LESSON_FILE.CAPTION_MAX, 'Listen and repeat')
  captionEn: string;

  @RequiredText(LESSON_FILE.CAPTION_MAX, 'နားထောင်ပြီး လိုက်ဆိုပါ')
  captionMy: string;
}

/** Both captions; neither can be cleared. */
export class UpdateFileDto extends PickType(RegisterFileDto, [
  'captionEn',
  'captionMy',
] as const) {}
