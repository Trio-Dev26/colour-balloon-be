import { ApiProperty } from '@nestjs/swagger';

/** A fixed level or category. */
export class TaxonomyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'FOUNDATION' })
  code: string;

  @ApiProperty({ example: 'Foundation' })
  titleEn: string;

  @ApiProperty({ example: 'အခြေခံ' })
  titleMy: string;
}
