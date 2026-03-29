/**
 * save_summary_report tool — Agent 在测试执行完毕后调用，
 * 将 Markdown 格式的测试汇报正文写入 TestReport.summaryReport 字段。
 */

import { Type, type Static } from "@sinclair/typebox";
import { getPrisma } from "../../server/config/database.js";
import type { AgentToolDef } from "./code-index.js";

const Params = Type.Object({
  report_id: Type.String({
    description: "run_test_suite 返回的 report_id",
  }),
  content: Type.String({
    description: "Markdown 格式的测试汇报正文，包含测试概述、失败分析、风险评估、建议等章节",
  }),
});

export function createSaveSummaryReportTool(): AgentToolDef {
  return {
    name: "save_summary_report",
    label: "保存测试汇报",
    description:
      "将测试汇报（Markdown）保存到报告记录中，供报告详情页「测试汇报」Tab 展示。" +
      "必须在 run_test_suite 完成后调用，传入其返回的 report_id。",
    parameters: Params,
    async execute(_toolCallId, params: Static<typeof Params>) {
      const prisma = getPrisma();

      const report = await prisma.testReport.findUnique({
        where: { id: params.report_id },
        select: { id: true },
      });

      if (!report) {
        return {
          content: [{ type: "text" as const, text: `报告 ${params.report_id} 不存在` }],
          details: { error: "report_not_found" },
        };
      }

      await prisma.testReport.update({
        where: { id: params.report_id },
        data: { summaryReport: params.content },
      });

      return {
        content: [{ type: "text" as const, text: `测试汇报已保存到报告 ${params.report_id}` }],
        details: { report_id: params.report_id, saved: true },
      };
    },
  };
}
