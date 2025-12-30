import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Setting {
  @PrimaryColumn({ type: 'text' })
  key: string;

  @Column({ type: 'text' })
  value: string;
}
