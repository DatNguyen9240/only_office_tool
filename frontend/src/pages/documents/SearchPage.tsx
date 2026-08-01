import {
  FolderOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { PageContainer, ProCard } from "@ant-design/pro-components";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Avatar, Button, Empty, Input, List, Tabs, Typography } from "antd";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { DocumentItem } from "@share";
import { FileTable } from "@/components/file/Explorer/FileTable";
import { graphqlRequest } from "@/lib/graphql";
import searchQuery from "@/graphql/search.graphql?raw";

interface SearchResponse {
  documents: DocumentItem[];
  folders: Array<{ id: string; name: string; parentId: string | null }>;
  people: Array<{
    id: string;
    name: string;
    email: string;
    department: string | null;
  }>;
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

interface SearchGraphqlResponse {
  search: SearchResponse;
}

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [draft, setDraft] = useState(query);
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<
    SearchGraphqlResponse,
    Error,
    SearchResponse,
    readonly ["search", string],
    string | null
  >({
    queryKey: ["search", query] as const,
    initialPageParam: null,
    enabled: Boolean(query.trim()),
    queryFn: ({ pageParam, signal }) =>
      graphqlRequest<
        SearchGraphqlResponse,
        { query: string; first: number; after?: string | null }
      >(
        searchQuery,
        { query, first: 50, ...(pageParam ? { after: pageParam } : {}) },
        { operationName: "Search", signal },
      ),
    getNextPageParam: (lastPage) =>
      lastPage.search.pageInfo.hasNextPage
        ? lastPage.search.pageInfo.endCursor ?? undefined
        : undefined,
    select: (response) => ({
      documents: response.pages.flatMap((page) => page.search.documents),
      folders: response.pages.flatMap((page) => page.search.folders),
      people: response.pages.flatMap((page) => page.search.people),
      pageInfo: response.pages[response.pages.length - 1]?.search.pageInfo ?? {
        hasNextPage: false,
        endCursor: null,
      },
    }),
  });

  return (
    <PageContainer
      ghost
      title="Search"
      subTitle={query ? `Results for "${query}"` : "Find documents, folders, and people."}
    >
      <Input.Search
        allowClear
        size="large"
        prefix={<SearchOutlined />}
        value={draft}
        placeholder="Search documents, folders, and people"
        onChange={(event) => setDraft(event.target.value)}
        onSearch={(value) => setSearchParams(value.trim() ? { q: value.trim() } : {})}
      />
      <ProCard className="search-results-card">
        <Tabs
          items={[
            {
              key: "documents",
              label: `Documents (${data?.documents.length ?? 0})`,
              children: (
                <FileTable
                  compact
                  loading={isLoading}
                  documents={data?.documents ?? []}
                  onOpen={(document) => navigate(`/editor/${document.id}`)}
                />
              ),
            },
            {
              key: "folders",
              label: `Folders (${data?.folders.length ?? 0})`,
              children: (
                <List
                  loading={isLoading}
                  locale={{ emptyText: <Empty description="No folders found" /> }}
                  dataSource={data?.folders ?? []}
                  renderItem={(folder) => (
                    <List.Item
                      className="search-result-row"
                      onClick={() => navigate(`/documents?folderId=${folder.id}`)}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<FolderOutlined />} />}
                        title={folder.name}
                        description="Folder"
                      />
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: "people",
              label: `People (${data?.people.length ?? 0})`,
              children: (
                <List
                  loading={isLoading}
                  locale={{ emptyText: <Empty description="No people found" /> }}
                  dataSource={data?.people ?? []}
                  renderItem={(person) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} />}
                        title={person.name}
                        description={
                          <Typography.Text type="secondary">
                            {person.email}
                            {person.department ? ` - ${person.department}` : ""}
                          </Typography.Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              ),
            },
          ]}
        />
        {hasNextPage && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <Button
              loading={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              Load more
            </Button>
          </div>
        )}
      </ProCard>
    </PageContainer>
  );
}