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
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-4 space-y-6 overflow-y-auto">
      {/* Title & Summary */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <FileTextOutlined className="text-indigo-400" />
          {analysis.title || "Tóm tắt cuộc họp"}
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Topics */}
      {analysis.topics && analysis.topics.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <TagOutlined className="text-indigo-400" />
            Chủ đề chính
          </h4>
          <div className="grid gap-2">
            {analysis.topics.map((t, idx) => (
              <div key={idx} className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-sm font-semibold text-white block mb-1">{t.title}</span>
                <span className="text-xs text-slate-400">{t.summary}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decisions */}
      {analysis.decisions && analysis.decisions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircleOutlined />
            Quyết định ({analysis.decisions.length})
          </h4>
          <div className="space-y-2">
            {analysis.decisions.map((d) => (
              <div key={d.id} className="bg-emerald-950/20 border border-emerald-800/40 p-3 rounded-lg">
                <p className="text-sm text-emerald-200 font-medium mb-2">{d.content}</p>
                {d.evidenceSegmentIds && d.evidenceSegmentIds.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <span>Bằng chứng segment:</span>
                    {d.evidenceSegmentIds.map((segId) => (
                      <AntTag
                        key={segId}
                        color="cyan"
                        className="cursor-pointer hover:opacity-80"
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
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <CheckSquareOutlined />
            Công việc cần làm ({analysis.actionItems.length})
          </h4>
          <div className="space-y-2">
            {analysis.actionItems.map((act) => (
              <div key={act.id} className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg">
                <p className="text-sm text-white font-medium mb-2">{act.task}</p>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    {act.assigneeName && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <UserOutlined className="text-indigo-400" />
                        {act.assigneeName}
                      </span>
                    )}
                    {act.deadline && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <CalendarOutlined />
                        {act.deadline}
                      </span>
                    )}
                  </div>
                  {act.evidenceSegmentIds && act.evidenceSegmentIds.length > 0 && (
                    <AntTag
                      color="blue"
                      className="cursor-pointer"
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
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <WarningOutlined />
            Rủi ro & Thách thức
          </h4>
          <div className="space-y-2">
            {analysis.risks.map((r) => (
              <div key={r.id} className="bg-amber-950/20 border border-amber-800/40 p-3 rounded-lg">
                <p className="text-sm text-amber-200 font-medium">{r.risk}</p>
                {r.mitigation && (
                  <p className="text-xs text-amber-400/80 mt-1">Giải pháp: {r.mitigation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unanswered Questions */}
      {analysis.unansweredQuestions && analysis.unansweredQuestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <QuestionCircleOutlined />
            Câu hỏi chưa giải quyết
          </h4>
          <div className="space-y-2">
            {analysis.unansweredQuestions.map((q) => (
              <div key={q.id} className="bg-purple-950/20 border border-purple-800/40 p-3 rounded-lg">
                <p className="text-sm text-purple-200">{q.question}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
