import { IsNotEmpty } from 'class-validator';

export class CreateSessionDto {
  @IsNotEmpty()
  sessionName: string;
}
