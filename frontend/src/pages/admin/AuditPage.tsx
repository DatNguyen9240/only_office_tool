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
import { App, Button, Descriptions, Drawer, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import { auditRecords } from "@/data/sampleData";
import type { AuditRecord } from "@share";

export function AuditPage() {
  const { message } = App.useApp();
  const [selected, setSelected] = useState<AuditRecord>();

  const columns = useMemo<ProColumns<AuditRecord>[]>(
    () => [
      {
        title: "Time",
        dataIndex: "timestamp",
        valueType: "dateTimeRange",
        width: 190,
        render: (_, record) => record.timestamp,
      },
      {
        title: "Actor",
        dataIndex: "actor",
        copyable: true,
      },
      {
        title: "Action",
        dataIndex: "action",
        valueType: "select",
        fieldProps: {
          options: [...new Set(auditRecords.map((record) => record.action))].map((value) => ({
            label: value,
            value,
          })),
        },
      },
      {
        title: "Resource",
        dataIndex: "resource",
        ellipsis: true,
      },
      {
        title: "Outcome",
        dataIndex: "outcome",
        valueType: "select",
        fieldProps: {
          options: [
            { label: "Success", value: "Success" },
            { label: "Denied", value: "Denied" },
          ],
        },
        render: (_, record) => (
          <Tag color={record.outcome === "Success" ? "green" : "red"}>
            {record.outcome}
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
    [],
  );

  return (
    <PageContainer
      ghost
      title="Audit logs"
      subTitle="Review security and document events across the organization."
      extra={[
        <Button
          key="export"
          icon={<DownloadOutlined />}
          onClick={() => message.success("Filtered audit log exported")}
        >
          Export CSV
        </Button>,
      ]}
    >
      <div className="audit-assurance">
        <SafetyCertificateOutlined />
        <div>
          <Typography.Text strong>Immutable event history</Typography.Text>
          <Typography.Text type="secondary">
            Audit events are retained according to your organization policy.
          </Typography.Text>
        </div>
      </div>
      <ProTable<AuditRecord>
        rowKey="id"
        columns={columns}
        dataSource={auditRecords}
        options={{ density: false, fullScreen: true, reload: false }}
        search={{ labelWidth: "auto", defaultCollapsed: false }}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        toolbar={{ title: "Events" }}
      />
      <Drawer
        open={Boolean(selected)}
        title="Audit event details"
        width={460}
        onClose={() => setSelected(undefined)}
      >
        {selected && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Event ID">{selected.id}</Descriptions.Item>
            <Descriptions.Item label="Timestamp">{selected.timestamp}</Descriptions.Item>
            <Descriptions.Item label="Actor">{selected.actor}</Descriptions.Item>
            <Descriptions.Item label="Action">{selected.action}</Descriptions.Item>
            <Descriptions.Item label="Resource">{selected.resource}</Descriptions.Item>
            <Descriptions.Item label="Outcome">
              <Tag color={selected.outcome === "Success" ? "green" : "red"}>
                {selected.outcome}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="IP address">{selected.ip}</Descriptions.Item>
            <Descriptions.Item label="Device">{selected.device}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </PageContainer>
  );
}
