import { User } from 'src/users/entity/user.entity';
import {
  Column,
  CreateDateColumn,
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

  @Column({ default: true })
  useShortlink: boolean;

  @ManyToOne(() => User, (user) => user.uploads)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
