import { IsArray, IsIn, IsString, IsUrl, Length } from "class-validator";

const supportedEvents = [
  "DOCUMENT_CREATED",
  "DOCUMENT_UPDATED",
  "DOCUMENT_SHARED",
  "DOCUMENT_DELETED",
  "COMMENT_CREATED",
  "USER_UPDATED",
] as const;

export class CreateWebhookDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsString()
  @Length(16, 255)
  secret!: string;

  @IsArray()
  @IsIn(supportedEvents, { each: true })
  events!: string[];
}
