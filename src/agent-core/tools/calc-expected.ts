/**
 * calculate_value tool — 精确计算数学表达式，避免 LLM 自行运算引入误差。
 * Agent 在生成测试用例时，应调用此工具计算 expectedResult，而非自行心算。
 */

import { Type } from "@sinclair/typebox";
import type { AgentToolDef } from "./code-index.js";

const ALLOWED_PATTERN = /^[\d\s\+\-\*\/\(\)\.\,]+$/;

function safeEval(expression: string): number {
  // 白名单校验：只允许数字、四则运算符和括号
  if (!ALLOWED_PATTERN.test(expression)) {
    throw new Error(`不支持的表达式字符，仅允许数字和 + - * / ( ) 运算符`);
  }
  // eslint-disable-next-line no-new-func
  const result = new Function(`"use strict"; return (${expression})`)() as number;
  if (typeof result !== "number" || !isFinite(result)) {
    throw new Error(`计算结果非有效数字: ${result}`);
  }
  return result;
}

export function createCalcExpectedTool(): AgentToolDef {
  return {
    name: "calculate_value",
    label: "精确计算",
    description:
      "精确计算一个数学表达式并返回结果，精度到小数点后 2 位。" +
      "在生成测试用例的 expectedResult 字段前，必须调用此工具计算，不得自行估算。" +
      "示例：expression='2 * (1500/1000) * 10000 * 2.3' → 69000.00",
    parameters: Type.Object({
      expression: Type.String({
        description:
          "合法的数学表达式，仅支持数字和 + - * / ( ) 运算符。" +
          "例如：'3 * (1000/1000) * 20000 * 0.5'",
      }),
    }),
    async execute(_toolCallId, params: { expression: string }) {
      try {
        const result = safeEval(params.expression);
        const rounded = Math.max(0, result); // 负数归零（业务规则）
        const formatted = rounded.toFixed(2);
        return {
          content: [
            {
              type: "text" as const,
              text: `计算结果：${params.expression} = ${formatted}`,
            },
          ],
          details: { expression: params.expression, result: formatted },
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `计算失败：${err.message}`,
            },
          ],
          details: { error: err.message },
        };
      }
    },
  };
}
