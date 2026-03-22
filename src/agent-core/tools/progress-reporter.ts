/**
 * report_progress tool — lets the Agent broadcast named execution stages to the UI.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { AgentToolDef, AgentToolResult } from "./code-index.js";

const ReportProgressParams = Type.Object({
  stage: Type.String({
    description: 'Stage name shown in the progress panel, e.g. "分析文档", "生成用例", "执行测试", "生成报告"',
  }),
  status: Type.Union(
    [Type.Literal('started'), Type.Literal('done'), Type.Literal('failed')],
    { description: '"started" when beginning a stage, "done" on success, "failed" on error' },
  ),
  detail: Type.Optional(Type.String({
    description: 'Short detail line shown below the stage name, e.g. "已生成 24 条用例" or "通过率 92%"',
  })),
});

export function createProgressReporterTool(
  onStageUpdate: (stage: string, status: 'started' | 'done' | 'failed', detail?: string) => void,
): AgentToolDef {
  return {
    name: 'report_progress',
    label: 'Report Progress',
    description:
      'Report the current execution stage to the right-side progress panel. ' +
      'Call at the START of each major step (status="started") and again at the END (status="done" or "failed"). ' +
      'This is the only way the user can see real-time progress.',
    parameters: ReportProgressParams,
    execute: async (_id, params: Static<typeof ReportProgressParams>) => {
      onStageUpdate(params.stage, params.status, params.detail);
      return {
        content: [{ type: 'text', text: `Progress reported: ${params.stage} → ${params.status}` }],
        details: {},
      } as AgentToolResult;
    },
  };
}
