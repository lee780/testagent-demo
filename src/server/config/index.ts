import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN_HOURS: z.coerce.number().default(24),

  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),

  LLM_PROVIDER: z.string().default('anthropic'),
  LLM_MODEL_NAME: z.string().default('claude-sonnet-4-20250514'),
  LLM_API_KEY: z.string().default(''),

  STORAGE_ROOT: z.string().default('./storage'),
  WORKSPACE_DIR: z.string().default('.testagent/workspace'),
  AGENT_OUTPUT_DIR: z.string().default('.testagent/workspace/outputs'),

  LLM_BASE_URL: z.string().default(''),
  INTRANET_LLM_BASE_URL: z.string().default('http://10.252.167.50:8021'),
  INTRANET_LLM_TX_CODE: z.string().default('A4011LM01'),
  INTRANET_LLM_SEC_NODE_NO: z.string().default('400136'),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.format();
    throw new Error(`Invalid environment variables:\n${JSON.stringify(formatted, null, 2)}`);
  }

  const env = parsed.data;

  return {
    port: env.PORT,
    host: env.HOST,
    nodeEnv: env.NODE_ENV,
    isDev: env.NODE_ENV === 'development',
    isProd: env.NODE_ENV === 'production',

    database: {
      url: env.DATABASE_URL,
    },

    redis: {
      url: env.REDIS_URL,
    },

    jwt: {
      secret: env.JWT_SECRET,
      expiresInHours: env.JWT_EXPIRES_IN_HOURS,
    },

    cors: {
      origins: env.CORS_ORIGINS.split(',').map((s) => s.trim()),
    },

    llm: {
      provider: env.LLM_PROVIDER,
      modelName: env.LLM_MODEL_NAME,
      apiKey: env.LLM_API_KEY,
      baseUrl: env.LLM_BASE_URL,
    },

    intranet: {
      baseUrl: env.INTRANET_LLM_BASE_URL,
      txCode: env.INTRANET_LLM_TX_CODE,
      secNodeNo: env.INTRANET_LLM_SEC_NODE_NO,
    },

    storage: {
      root: env.STORAGE_ROOT,
    },

    workspace: {
      dir: env.WORKSPACE_DIR,
    },

    agentOutputDir: env.AGENT_OUTPUT_DIR,
  } as const;
}

export type AppConfig = ReturnType<typeof loadConfig>;

let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}
