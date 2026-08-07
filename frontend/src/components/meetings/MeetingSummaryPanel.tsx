import React from "react";
import { MeetingAnalysis } from "@share";
import {
  FileTextOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  WarningOutlined,
  QuestionCircleOutlined,
  TagOutlined,
  CalendarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Tag as AntTag } from "antd";

interface MeetingSummaryPanelProps {
  analysis: MeetingAnalysis;
  onEvidenceClick: (segmentId: number) => void;
}

export const MeetingSummaryPanel: React.FC<MeetingSummaryPanelProps> = ({
  analysis,
  onEvidenceClick,
}) => {
  return (
    <div className="summary-panel-card">
      {/* Title & Summary */}
      <div className="summary-section summary-hero">
        <h3 className="summary-section-title">
          <FileTextOutlined className="summary-icon-accent" />
          {analysis.title || "Tóm tắt cuộc họp"}
        </h3>
        <p className="summary-hero-text">{analysis.summary}</p>
      </div>

      {/* Topics */}
      {analysis.topics && analysis.topics.length > 0 && (
        <div className="summary-section">
          <h4 className="summary-heading">
            <TagOutlined className="summary-heading-icon" />
            Chủ đề chính
          </h4>
          <div className="summary-grid">
            {analysis.topics.map((t, idx) => (
              <div key={idx} className="summary-item-card">
                <span className="summary-item-title">{t.title}</span>
                <span className="summary-item-desc">{t.summary}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decisions */}
      {analysis.decisions && analysis.decisions.length > 0 && (
        <div className="summary-section">
          <h4 className="summary-heading emerald">
            <CheckCircleOutlined />
            Quyết định ({analysis.decisions.length})
          </h4>
          <div className="summary-grid">
            {analysis.decisions.map((d) => (
              <div key={d.id} className="summary-item-card decision">
                <p className="summary-decision-text">{d.content}</p>
                {d.evidenceSegmentIds && d.evidenceSegmentIds.length > 0 && (
                  <div className="summary-evidence-row">
                    <span>Bằng chứng segment:</span>
                    {d.evidenceSegmentIds.map((segId) => (
                      <AntTag
                        key={segId}
                        color="cyan"
                        className="summary-tag-clickable"
                        onClick={() => onEvidenceClick(segId)}
                      >
                        #{segId}
                      </AntTag>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      {analysis.actionItems && analysis.actionItems.length > 0 && (
        <div className="summary-section">
          <h4 className="summary-heading indigo">
            <CheckSquareOutlined />
            Công việc cần làm ({analysis.actionItems.length})
          </h4>
          <div className="summary-grid">
            {analysis.actionItems.map((act) => (
              <div key={act.id} className="summary-item-card action">
                <p className="summary-action-task">{act.task}</p>
                <div className="summary-action-meta">
                  <div className="summary-action-assignee">
                    {act.assigneeName && (
                      <span className="summary-meta-item">
                        <UserOutlined className="summary-icon-accent" />
                        {act.assigneeName}
                      </span>
                    )}
                    {act.deadline && (
                      <span className="summary-meta-item">
                        <CalendarOutlined />
                        {act.deadline}
                      </span>
                    )}
                  </div>
                  {act.evidenceSegmentIds && act.evidenceSegmentIds.length > 0 && (
                    <AntTag
                      color="blue"
                      className="summary-tag-clickable"
                      onClick={() => onEvidenceClick(act.evidenceSegmentIds[0])}
                    >
                      Bằng chứng #{act.evidenceSegmentIds[0]}
                    </AntTag>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {analysis.risks && analysis.risks.length > 0 && (
        <div className="summary-section">
          <h4 className="summary-heading amber">
            <WarningOutlined />
            Rủi ro & Thách thức
          </h4>
          <div className="summary-grid">
            {analysis.risks.map((r) => (
              <div key={r.id} className="summary-item-card risk">
                <p className="summary-risk-title">{r.risk}</p>
                {r.mitigation && (
                  <p className="summary-risk-mitigation">Giải pháp: {r.mitigation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unanswered Questions */}
      {analysis.unansweredQuestions && analysis.unansweredQuestions.length > 0 && (
        <div className="summary-section">
          <h4 className="summary-heading purple">
            <QuestionCircleOutlined />
            Câu hỏi chưa giải quyết
          </h4>
          <div className="summary-grid">
            {analysis.unansweredQuestions.map((q) => (
              <div key={q.id} className="summary-item-card question">
                <p className="summary-question-text">{q.question}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

