import {
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
  Descriptions,
  Drawer,
  Grid,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import type { AuditRecord } from "@share";
import { apiRequest } from "@/lib/api";

export function AuditPage() {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [selected, setSelected] = useState<AuditRecord>();
  const {
    data: auditRecords = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: ({ signal }) =>
      apiRequest<AuditRecord[]>("/admin/audit?limit=500", { signal }),
  });

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
      <ProTable<AuditRecord>
        className="audit-table"
        rowKey="id"
        columns={columns}
        dataSource={auditRecords}
        loading={isLoading}
        scroll={{ x: "max-content" }}
        options={{
          density: false,
          fullScreen: true,
          reload: () => void refetch(),
        }}
        search={{ labelWidth: "auto", defaultCollapsed: !screens.lg }}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        toolbar={{ title: "Events" }}
      />
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
