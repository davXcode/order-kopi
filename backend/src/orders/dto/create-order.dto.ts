import { IsIn, IsInt, IsString, Max, Min } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  customerName: string;

  @IsIn(['americano', 'latte'])
  item: 'americano' | 'latte';

  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;
}
