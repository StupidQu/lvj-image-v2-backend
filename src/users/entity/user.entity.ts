import { Upload } from 'src/upload/entity/upload.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  nameLower: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  salt: string;

  @Column()
  ips: string;

  @Column({ default: false })
  isBanned: boolean;

  @OneToMany(() => Upload, (upload) => upload.user)
  uploads: Upload[];
}
