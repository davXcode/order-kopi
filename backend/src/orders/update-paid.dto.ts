import { IsBoolean } from 'class-validator';

export class UpdatePaidDto {
  @IsBoolean()
  paid: boolean;
}
