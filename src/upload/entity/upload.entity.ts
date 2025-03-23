import { User } from 'src/users/entity/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Upload {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sha256: string;

  @Column()
  url: string;

  @Column()
  size: number;

  @Column({ nullable: true })
  legacyShortlink?: string;

  @ManyToOne(() => User, (user) => user.uploads)
  @JoinColumn({ name: 'userId' })
  user: User;
}
