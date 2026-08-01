import { Field, ID, InputType, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Length, Min } from "class-validator";

export enum GraphqlDocumentScope {
  ALL = "all",
  SHARED = "shared",
  TRASH = "trash",
  RECENT = "recent",
  FAVORITES = "favorites",
}

registerEnumType(GraphqlDocumentScope, { name: "DocumentScope" });

const assignablePermissionRoles = ["VIEWER", "COMMENTER", "EDITOR"] as const;

@ObjectType()
export class PageInfoType {
  @Field()
  hasNextPage!: boolean;

  @Field(() => String, { nullable: true })
  endCursor!: string | null;
}

@ObjectType()
export class TagType {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  color!: string | null;
}

@ObjectType()
export class ViewerCapabilitiesType {
  @Field()
  canView!: boolean;

  @Field()
  canComment!: boolean;

  @Field()
  canEdit!: boolean;

  @Field()
  canShare!: boolean;

  @Field()
  canDelete!: boolean;
}

@ObjectType("DocumentVersion")
export class DocumentVersionType {
  @Field(() => ID)
  id!: string;

  @Field(() => Int)
  version!: number;

  @Field()
  versionLabel!: string;

  @Field()
  modifiedAt!: string;

  @Field()
  author!: string;

  @Field()
  size!: string;
}

@ObjectType("Document")
export class DocumentType {
  @Field(() => ID)
  id!: string;

  @Field(() => Int)
  version!: number;

  @Field()
  name!: string;

  @Field()
  type!: string;

  @Field()
  owner!: string;

  @Field()
  modifiedAt!: string;

  @Field()
  size!: string;

  @Field()
  status!: string;

  @Field()
  folderId!: string;

  @Field()
  shared!: boolean;

  @Field({ nullable: true })
  starred?: boolean;

  @Field(() => String, { nullable: true })
  deletedAt?: string;

  @Field(() => String, { nullable: true })
  permission?: string;

  @Field(() => [TagType])
  tags!: TagType[];

  @Field(() => ViewerCapabilitiesType)
  viewerCapabilities!: ViewerCapabilitiesType;

  @Field(() => [DocumentVersionType])
  versions!: DocumentVersionType[];
}

@ObjectType()
export class DocumentConnectionType {
  @Field(() => [DocumentType])
  nodes!: DocumentType[];

  @Field(() => PageInfoType)
  pageInfo!: PageInfoType;
}

@ObjectType()
export class FolderType {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  parentId?: string;

  @Field(() => Int, { nullable: true })
  count?: number;
}

@ObjectType()
export class DashboardMetricsType {
  @Field(() => Int)
  documents!: number;
  @Field(() => Int)
  folders!: number;
  @Field(() => Int)
  sharedWithMe!: number;
  @Field(() => Int)
  inReview!: number;
  @Field(() => Int)
  versions!: number;
}

@ObjectType()
export class DashboardStorageType {
  @Field()
  source!: string;
  @Field()
  usedBytes!: number;
  @Field()
  totalBytes!: number;
  @Field()
  freeBytes!: number;
  @Field()
  workspaceBytes!: number;
  @Field()
  documentsBytes!: number;
  @Field()
  versionsBytes!: number;
  @Field(() => Int)
  percent!: number;
  @Field(() => String, { nullable: true })
  measuredAt!: string | null;
}

@ObjectType()
export class ActivityType {
  @Field(() => ID)
  id!: string;
  @Field()
  actor!: string;
  @Field()
  action!: string;
  @Field()
  resource!: string;
  @Field()
  timestamp!: string;
  @Field()
  outcome!: string;
}

@ObjectType()
export class DashboardType {
  @Field(() => DashboardMetricsType)
  metrics!: DashboardMetricsType;
  @Field(() => DashboardStorageType)
  storage!: DashboardStorageType;
  @Field(() => [ActivityType])
  activities!: ActivityType[];
}

@ObjectType()
export class WorkspaceType {
  @Field(() => DashboardType)
  dashboard!: DashboardType;
  @Field(() => [FolderType])
  folders!: FolderType[];
  @Field(() => DocumentConnectionType)
  recentDocuments!: DocumentConnectionType;
}

@ObjectType()
export class PersonType {
  @Field(() => ID)
  id!: string;
  @Field()
  name!: string;
  @Field()
  email!: string;
  @Field(() => String, { nullable: true })
  department!: string | null;
}

@ObjectType()
export class SearchResultType {
  @Field(() => [DocumentType])
  documents!: DocumentType[];
  @Field(() => [FolderType])
  folders!: FolderType[];
  @Field(() => [PersonType])
  people!: PersonType[];
  @Field(() => PageInfoType)
  pageInfo!: PageInfoType;
}

@ObjectType()
export class MutationStatusType {
  @Field(() => ID)
  id!: string;

  @Field()
  status!: string;
}

@ObjectType()
export class TrashStatusType {
  @Field()
  status!: string;

  @Field(() => Int)
  count!: number;
}

@ObjectType()
export class PermissionEntryType {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field(() => String, { nullable: true })
  groupId?: string | null;

  @Field()
  kind!: string;

  @Field()
  role!: string;

  @Field()
  initials!: string;
}

@InputType()
export class UpdateDocumentInput {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  @Field(() => String, { nullable: true })
  name?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  folderId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, { nullable: true })
  expectedVersion?: number;
}

@InputType()
export class CreateFolderInput {
  @IsString()
  @Length(1, 255)
  @Field()
  name!: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  parentId?: string | null;
}

@InputType()
export class UpdateFolderInput {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  @Field(() => String, { nullable: true })
  name?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  parentId?: string | null;
}

@InputType()
export class CreateDocumentPermissionInput {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsString()
  @Field(() => String, { nullable: true })
  email?: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  groupId?: string;

  @IsIn(assignablePermissionRoles)
  @Field()
  role!: string;
}

@InputType()
export class UpdateDocumentPermissionInput {
  @IsIn(assignablePermissionRoles)
  @Field()
  role!: string;
}
