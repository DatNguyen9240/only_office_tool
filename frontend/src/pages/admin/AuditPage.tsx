import {
  AppstoreOutlined,
  BarsOutlined,
  DownloadOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Grid,
  Input,
  Pagination,
  Segmented,
  Select,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import type { AuditRecord } from "@share";
import { apiRequest } from "@/lib/api";

interface AuditFilters {
  query: string;
  action?: string;
  outcome?: AuditRecord["outcome"];
}

export function AuditPage() {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [selected, setSelected] = useState<AuditRecord>();
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditFilters>({ query: "" });
  const {
    data: auditRecords = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: ({ signal }) =>
      apiRequest<AuditRecord[]>("/admin/audit?limit=500", { signal }),
  });
  const filteredAuditRecords = useMemo(
    () =>
      auditRecords.filter((record) => {
        const query = filters.query.trim().toLowerCase();
        return (
          (!query ||
            record.actor.toLowerCase().includes(query) ||
            record.resource.toLowerCase().includes(query) ||
            record.id.toLowerCase().includes(query)) &&
          (!filters.action || record.action === filters.action) &&
          (!filters.outcome || record.outcome === filters.outcome)
        );
      }),
    [auditRecords, filters],
  );
  const visibleAuditRecords = filteredAuditRecords.slice(
    (page - 1) * 10,
    page * 10,
  );

  const columns = useMemo<ProColumns<AuditRecord>[]>(
    () => [
      {
        title: "Time",
        dataIndex: "timestamp",
        valueType: "dateTime",
        width: 190,
        renderText: (value) => new Date(value).toLocaleString(),
      },
      {
        title: "Actor",
        dataIndex: "actor",
        width: 180,
        copyable: true,
      },
      {
        title: "Action",
        dataIndex: "action",
        width: 150,
        valueType: "select",
        fieldProps: {
          options: [...new Set(auditRecords.map((record) => record.action))].map(
            (value) => ({
              label: formatAction(value),
              value,
            }),
          ),
        },
        renderText: (value) => formatAction(value),
      },
      {
        title: "Resource",
        dataIndex: "resource",
        width: 200,
        ellipsis: true,
      },
      {
        title: "Outcome",
        dataIndex: "outcome",
        width: 110,
        valueType: "select",
        fieldProps: {
          options: [
            { label: "Success", value: "SUCCESS" },
            { label: "Denied", value: "DENIED" },
            { label: "Failed", value: "FAILED" },
          ],
        },
        render: (_, record) => (
          <Tag color={record.outcome === "SUCCESS" ? "green" : "red"}>
            {formatAction(record.outcome)}
          </Tag>
        ),
      },
      {
        title: "Event ID",
        dataIndex: "id",
        search: false,
        copyable: true,
        width: 120,
      },
      {
        title: "Details",
        valueType: "option",
        width: 72,
        render: (_, record) => [
          <Button
            key="view"
            type="text"
            icon={<EyeOutlined />}
            aria-label={`View ${record.id}`}
            onClick={() => setSelected(record)}
          />,
        ],
      },
    ],
    [auditRecords],
  );

  const exportCsv = () => {
    if (!auditRecords.length) {
      message.info("There are no audit events to export");
      return;
    }
    const rows = [
      [
        "Event ID",
        "Timestamp",
        "Actor",
        "Actor email",
        "Action",
        "Resource",
        "Outcome",
        "IP address",
        "Device",
      ],
      ...auditRecords.map((record) => [
        record.id,
        record.timestamp,
        record.actor,
        record.actorEmail ?? "",
        record.action,
        record.resource,
        record.outcome,
        record.ip ?? "",
        record.device ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `meridian-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    message.success(`Exported ${auditRecords.length} audit events`);
  };

  return (
    <PageContainer
      ghost
      title="Audit logs"
      subTitle="Review security and document events across the organization."
      extra={[
        <Button
          key="export"
          icon={<DownloadOutlined />}
          onClick={exportCsv}
          disabled={isLoading}
        >
          Export CSV
        </Button>,
      ]}
    >
      <div className="audit-assurance">
        <SafetyCertificateOutlined />
        <div>
          <Typography.Text strong>Recorded event history</Typography.Text>
          <Typography.Text type="secondary">
            Events shown here are loaded from the audit log database.
          </Typography.Text>
        </div>
      </div>
      <div className="admin-record-surface">
        <div className="admin-record-toolbar">
          <Typography.Text strong>Events</Typography.Text>
          <Segmented
            size="small"
            aria-label="Audit event view"
            value={viewMode}
            options={[
              { value: "table", icon: <BarsOutlined />, label: "Table" },
              { value: "card", icon: <AppstoreOutlined />, label: "Cards" },
            ]}
            onChange={(value) => {
              setViewMode(value as "table" | "card");
              setPage(1);
            }}
          />
        </div>
        <div
          className="admin-filter-bar audit-filter-bar"
          role="search"
          aria-label="Filter audit events"
        >
          <Input
            allowClear
            value={filters.query}
            placeholder="Search actor, resource, or event ID"
            onChange={(event) => {
              setFilters((current) => ({ ...current, query: event.target.value }));
              setPage(1);
            }}
          />
          <Select
            allowClear
            value={filters.action}
            placeholder="Action"
            options={[...new Set(auditRecords.map((record) => record.action))].map(
              (value) => ({ label: formatAction(value), value }),
            )}
            onChange={(value) => {
              setFilters((current) => ({ ...current, action: value }));
              setPage(1);
            }}
          />
          <Select
            allowClear
            value={filters.outcome}
            placeholder="Outcome"
            options={[
              { label: "Success", value: "SUCCESS" },
              { label: "Denied", value: "DENIED" },
              { label: "Failed", value: "FAILED" },
            ]}
            onChange={(value) => {
              setFilters((current) => ({ ...current, outcome: value }));
              setPage(1);
            }}
          />
          <Button
            type="text"
            disabled={!filters.query && !filters.action && !filters.outcome}
            onClick={() => {
              setFilters({ query: "" });
              setPage(1);
            }}
          >
            Clear
          </Button>
        </div>
        {viewMode === "table" ? (
          <ProTable<AuditRecord>
            className="audit-table"
            rowKey="id"
            columns={columns}
            dataSource={filteredAuditRecords}
            loading={isLoading}
            size="small"
            scroll={{ x: "max-content" }}
            options={{
              density: false,
              fullScreen: true,
              reload: () => void refetch(),
            }}
            search={false}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            toolbar={{ title: undefined }}
          />
        ) : (
          <>
            {isLoading ? (
              <div className="admin-card-loading">Loading events…</div>
            ) : visibleAuditRecords.length ? (
              <div className="admin-card-grid">
                {visibleAuditRecords.map((record) => (
                  <Card key={record.id} size="small" className="admin-record-card">
                    <div className="admin-card-heading">
                      <span className="admin-card-title">
                        <Typography.Text strong>{formatAction(record.action)}</Typography.Text>
                        <Typography.Text type="secondary">
                          {new Date(record.timestamp).toLocaleString()}
                        </Typography.Text>
                      </span>
                      <Tag color={record.outcome === "SUCCESS" ? "green" : "red"}>
                        {formatAction(record.outcome)}
                      </Tag>
                    </div>
                    <div className="admin-card-fields">
                      <span>
                        <Typography.Text type="secondary">Actor</Typography.Text>
                        <Typography.Text ellipsis>{record.actor}</Typography.Text>
                      </span>
                      <span>
                        <Typography.Text type="secondary">Resource</Typography.Text>
                        <Typography.Text ellipsis>{record.resource}</Typography.Text>
                      </span>
                      <span>
                        <Typography.Text type="secondary">Event ID</Typography.Text>
                        <Typography.Text copyable={{ text: record.id }} ellipsis>
                          {record.id}
                        </Typography.Text>
                      </span>
                    </div>
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => setSelected(record)}
                    >
                      View details
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No events found" />
            )}
            <Pagination
              className="admin-card-pagination"
              current={page}
              pageSize={10}
              total={filteredAuditRecords.length}
              showSizeChanger={false}
              hideOnSinglePage
              onChange={setPage}
            />
          </>
        )}
      </div>
      <Drawer
        open={Boolean(selected)}
        title="Audit event details"
        width={screens.sm ? 460 : "100%"}
        onClose={() => setSelected(undefined)}
      >
        {selected && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Event ID">
              {selected.id}
            </Descriptions.Item>
            <Descriptions.Item label="Timestamp">
              {new Date(selected.timestamp).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Actor">
              {selected.actor}
              {selected.actorEmail ? ` (${selected.actorEmail})` : ""}
            </Descriptions.Item>
            <Descriptions.Item label="Action">
              {formatAction(selected.action)}
            </Descriptions.Item>
            <Descriptions.Item label="Resource">
              {selected.resource}
            </Descriptions.Item>
            <Descriptions.Item label="Outcome">
              <Tag color={selected.outcome === "SUCCESS" ? "green" : "red"}>
                {formatAction(selected.outcome)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="IP address">
              {selected.ip ?? "Not captured"}
            </Descriptions.Item>
            <Descriptions.Item label="Device">
              {selected.device ?? "Not captured"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </PageContainer>
  );
}

function formatAction(value: string) {
  const normalized = value.replaceAll("_", " ").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
