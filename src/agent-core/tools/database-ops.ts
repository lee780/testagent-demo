/**
 * Database operations tools — connect, query schema, execute SQL.
 * Ported from Python database_ops.py → TypeScript AgentTool.
 *
 * NOTE: Currently uses mock implementations (same as the Python version).
 * Real DB drivers can be plugged in later.
 */

import { Type, type Static } from "@sinclair/typebox";
import { createHash } from "node:crypto";
import type { AgentToolDef, AgentToolResult } from "./code-index.js";

// ── Types ────────────────────────────────────────────────

type DatabaseType = "mysql" | "postgresql" | "oracle" | "h2";

interface ConnectionInfo {
  connection_id: string;
  db_type: DatabaseType;
  database: string;
  connected_at: string;
}

// ── State ────────────────────────────────────────────────

const connectionPool = new Map<string, ConnectionInfo>();

// ── Helpers ──────────────────────────────────────────────

function textResult(data: unknown): AgentToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

const BLOCKED_KEYWORDS = ["prod", "production", "live", "prd"];

function parseDatabase(connectionString: string, dbType: DatabaseType): string {
  if (dbType === "h2") {
    const match = connectionString.match(/h2:(?:mem:)?(\w+)/);
    return match?.[1] ?? "unknown";
  }
  try {
    const url = new URL(connectionString);
    return url.pathname.replace(/^\//, "") || "unknown";
  } catch {
    return "unknown";
  }
}

// ── Tool Definitions ─────────────────────────────────────

const ConnectDatabaseParams = Type.Object({
  connection_string: Type.String({ description: "Database connection string (e.g. mysql://user:pass@host:3306/db)" }),
  db_type: Type.Optional(Type.String({ description: "Database type: mysql | postgresql | oracle | h2 (default: mysql)" })),
  timeout: Type.Optional(Type.Number({ description: "Connection timeout in seconds (default: 30)" })),
});

const QueryTableStructureParams = Type.Object({
  table_name: Type.String({ description: "Name of the table to inspect" }),
  connection_id: Type.Optional(Type.String({ description: "Connection ID from connect_database" })),
  include_constraints: Type.Optional(Type.Boolean({ description: "Include keys, indexes (default: true)" })),
});

const ExecuteSqlParams = Type.Object({
  sql: Type.String({ description: "SQL statement to execute" }),
  connection_id: Type.Optional(Type.String({ description: "Connection ID from connect_database" })),
  operation_type: Type.Optional(Type.String({ description: "Operation type: query | insert | update | delete (default: query)" })),
  expect_affected_rows: Type.Optional(Type.Number({ description: "Expected affected rows (-1 to skip check)" })),
});

export function createDatabaseTools(): AgentToolDef[] {
  const connectDatabase: AgentToolDef<Static<typeof ConnectDatabaseParams>> = {
    name: "connect_database",
    label: "Connect Database",
    description: "Establish a database connection. Blocks production connection strings for safety.",
    parameters: ConnectDatabaseParams,
    execute: async (_id, params) => {
      const connStr = params.connection_string;
      const lower = connStr.toLowerCase();

      // Safety: block production connections
      if (BLOCKED_KEYWORDS.some((kw) => lower.includes(kw))) {
        return textResult({ status: "error", error: "Production database connections are blocked" });
      }

      const dbType = (params.db_type ?? "mysql") as DatabaseType;
      const hash = createHash("md5").update(connStr).digest("hex").slice(0, 8);
      const connectionId = `conn_${hash}`;
      const database = parseDatabase(connStr, dbType);

      const info: ConnectionInfo = {
        connection_id: connectionId,
        db_type: dbType,
        database,
        connected_at: new Date().toISOString(),
      };
      connectionPool.set(connectionId, info);

      return textResult({
        status: "success",
        ...info,
        server_version: "mock",
        warning: "This is a mock connection. Real database drivers are not yet implemented.",
      });
    },
  };

  const queryTableStructure: AgentToolDef<Static<typeof QueryTableStructureParams>> = {
    name: "query_table_structure",
    label: "Query Table Structure",
    description: "Retrieve table schema including columns, types, constraints, and indexes",
    parameters: QueryTableStructureParams,
    execute: async (_id, params) => {
      if (params.connection_id && !connectionPool.has(params.connection_id)) {
        return textResult({ status: "error", error: `Unknown connection: ${params.connection_id}` });
      }

      const includeConstraints = params.include_constraints ?? true;

      // Mock table structure (same as Python version)
      const columns = [
        { name: "LOAN_ID", type: "VARCHAR(32)", nullable: false, default: null, comment: "Loan ID (PK)", is_primary_key: true },
        { name: "CUSTOMER_ID", type: "VARCHAR(32)", nullable: false, default: null, comment: "Customer ID (FK)" },
        { name: "AMOUNT", type: "DECIMAL(18,2)", nullable: false, default: null, comment: "Loan amount" },
        { name: "LOAN_TYPE", type: "VARCHAR(20)", nullable: false, default: null, comment: "Loan type", enum_values: ["PERSONAL", "MORTGAGE", "BUSINESS", "AUTO"] },
        { name: "STATUS", type: "VARCHAR(20)", nullable: false, default: "PENDING_REVIEW", comment: "Loan status", enum_values: ["PENDING_REVIEW", "APPROVED", "REJECTED", "DISBURSED"] },
        { name: "CREATE_TIME", type: "DATETIME", nullable: false, default: "CURRENT_TIMESTAMP", comment: "Creation time" },
      ];

      const result: any = { status: "ok", table_name: params.table_name, columns };
      if (includeConstraints) {
        result.primary_key = ["LOAN_ID"];
        result.foreign_keys = [{ column: "CUSTOMER_ID", ref_table: "CUSTOMER", ref_column: "CUSTOMER_ID" }];
        result.indexes = [
          { name: "idx_customer_id", columns: ["CUSTOMER_ID"], unique: false },
          { name: "idx_status", columns: ["STATUS"], unique: false },
        ];
      }

      return textResult(result);
    },
  };

  const executeSql: AgentToolDef<Static<typeof ExecuteSqlParams>> = {
    name: "execute_sql",
    label: "Execute SQL",
    description: "Execute SQL with safety checks. Blocks DROP/TRUNCATE/ALTER and UPDATE/DELETE without WHERE.",
    parameters: ExecuteSqlParams,
    execute: async (_id, params) => {
      const sql = params.sql;
      const upper = sql.toUpperCase().trim();
      const opType = params.operation_type ?? "query";
      const expectRows = params.expect_affected_rows ?? -1;

      // Safety checks
      if (/\b(DROP|TRUNCATE|ALTER|GRANT|REVOKE)\b/.test(upper)) {
        return textResult({ status: "error", error_code: "DANGEROUS_OPERATION", error: "DROP/TRUNCATE/ALTER/GRANT/REVOKE operations are blocked" });
      }
      if (/\b(UPDATE|DELETE)\b/.test(upper) && !/\bWHERE\b/.test(upper)) {
        return textResult({ status: "error", error_code: "UNSAFE_OPERATION", error: "UPDATE/DELETE without WHERE clause is blocked" });
      }

      if (params.connection_id && !connectionPool.has(params.connection_id)) {
        return textResult({ status: "error", error: `Unknown connection: ${params.connection_id}` });
      }

      // Mock execution results
      const executionTimeMs = Math.floor(Math.random() * 50) + 5;

      if (opType === "query") {
        return textResult({
          status: "ok",
          operation: "query",
          row_count: 1,
          columns: ["LOAN_ID", "AMOUNT", "STATUS"],
          rows: [{ LOAN_ID: "TEST001", AMOUNT: 1500000.00, STATUS: "PENDING_REVIEW" }],
          execution_time_ms: executionTimeMs,
        });
      }

      if (opType === "insert") {
        const loanIdMatch = sql.match(/['"]([A-Z]+\d+)['"]/);
        return textResult({
          status: "ok",
          operation: "insert",
          affected_rows: 1,
          generated_keys: loanIdMatch ? { LOAN_ID: loanIdMatch[1] } : {},
          execution_time_ms: executionTimeMs,
        });
      }

      // update / delete
      const affected = upper.includes("TEST") ? 1 : 0;
      const result: any = {
        status: "ok",
        operation: opType,
        affected_rows: affected,
        execution_time_ms: executionTimeMs,
      };
      if (expectRows >= 0 && affected !== expectRows) {
        result.warning = `Expected ${expectRows} affected rows, got ${affected}`;
      }
      return textResult(result);
    },
  };

  return [connectDatabase, queryTableStructure, executeSql];
}
