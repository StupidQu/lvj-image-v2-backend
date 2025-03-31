import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ApiUpload {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sha256: string;

  @Column()
  url: string;

  @Column()
  ip: string;

  @Column()
  createdAt: Date;
}
