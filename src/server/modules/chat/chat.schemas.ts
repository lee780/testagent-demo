import { z } from 'zod';

export const TEST_MODES = ['regression', 'systematic', 'exploratory', 'chaos'] as const;
export type TestMode = typeof TEST_MODES[number];

export const chatMessageSchema = z.object({
  message: z.string().min(1, '消息不能为空'),
  conversation_id: z.string().nullable().optional(),
  mode: z.enum(TEST_MODES).optional(),
});

export const interruptSchema = z.object({
  reply_id: z.string().min(1, '缺少 reply_id'),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type InterruptInput = z.infer<typeof interruptSchema>;
