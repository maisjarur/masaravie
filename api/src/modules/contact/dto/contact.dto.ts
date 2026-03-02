import { IsString, IsNotEmpty, IsEmail, MaxLength } from 'class-validator';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class ContactDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @Field()
  @IsEmail()
  @MaxLength(200)
  email: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
