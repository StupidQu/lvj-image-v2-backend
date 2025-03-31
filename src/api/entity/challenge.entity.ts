import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pref: string;

  @Column()
  N: number;

  @Column()
  ip: string;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  solvedAt?: Date;

  @Column({ nullable: true })
  suff?: string;
}
