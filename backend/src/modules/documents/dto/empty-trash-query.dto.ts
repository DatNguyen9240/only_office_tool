import { Equals, IsString } from "class-validator";

export class EmptyTrashQueryDto {
  @IsString()
  @Equals("trash", {
    message: "DELETE /documents requires scope=trash",
  })
  scope!: string;
}
