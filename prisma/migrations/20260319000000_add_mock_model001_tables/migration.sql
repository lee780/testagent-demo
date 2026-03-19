-- Migration: add_mock_model001_tables
-- 被测系统 MODEL_001 授信额度测算所需的四张业务表

CREATE TABLE "mock_user_info" (
    "user_id" TEXT NOT NULL,
    "user_level" INTEGER NOT NULL,
    CONSTRAINT "mock_user_info_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "mock_account_balance" (
    "user_id" TEXT NOT NULL,
    "avg_3m_balance" DECIMAL(65,30) NOT NULL,
    CONSTRAINT "mock_account_balance_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "mock_social_security" (
    "user_id" TEXT NOT NULL,
    "social_security_flag" INTEGER NOT NULL,
    CONSTRAINT "mock_social_security_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "mock_salary_summary" (
    "user_id" TEXT NOT NULL,
    "monthly_salary" DECIMAL(65,30) NOT NULL,
    CONSTRAINT "mock_salary_summary_pkey" PRIMARY KEY ("user_id")
);
