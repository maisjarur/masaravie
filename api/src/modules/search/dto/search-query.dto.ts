import { IsOptional, IsString, IsBoolean, IsArray, IsInt, Min, Max, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class SearchQueryDto {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  services?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  onlineOnly?: boolean;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  pageSize?: number = 20;
}
