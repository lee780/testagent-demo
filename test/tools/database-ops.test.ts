import { describe, it, expect } from "vitest";
import { createDatabaseTools } from "../../src/agent-core/tools/database-ops.js";

const tools = createDatabaseTools();
const connectDb = tools.find((t) => t.name === "connect_database")!;
const queryStructure = tools.find((t) => t.name === "query_table_structure")!;
const executeSql = tools.find((t) => t.name === "execute_sql")!;

describe("connect_database", () => {
  it("should connect and return connection_id", async () => {
    const result = await connectDb.execute("tc1", {
      connection_string: "mysql://user:pass@localhost:3306/testdb",
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("success");
    expect(data.connection_id).toMatch(/^conn_/);
    expect(data.database).toBe("testdb");
  });

  it("should block production connection strings", async () => {
    const result = await connectDb.execute("tc2", {
      connection_string: "mysql://user:pass@prod-db:3306/production_db",
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("error");
    expect(data.error).toContain("Production");
  });

  it("should block connection strings containing 'prd'", async () => {
    const result = await connectDb.execute("tc3", {
      connection_string: "mysql://user:pass@prd-server:3306/mydb",
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("error");
  });
});

describe("query_table_structure", () => {
  it("should return mock table structure", async () => {
    const result = await queryStructure.execute("tc4", {
      table_name: "LOAN_APPLICATION",
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("ok");
    expect(data.columns).toHaveLength(6);
    expect(data.primary_key).toEqual(["LOAN_ID"]);
  });

  it("should omit constraints when include_constraints is false", async () => {
    const result = await queryStructure.execute("tc5", {
      table_name: "LOAN_APPLICATION",
      include_constraints: false,
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.primary_key).toBeUndefined();
    expect(data.foreign_keys).toBeUndefined();
  });
});

describe("execute_sql", () => {
  it("should block DROP statements", async () => {
    const result = await executeSql.execute("tc6", { sql: "DROP TABLE users" });
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("error");
    expect(data.error_code).toBe("DANGEROUS_OPERATION");
  });

  it("should block DELETE without WHERE", async () => {
    const result = await executeSql.execute("tc7", { sql: "DELETE FROM users" });
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("error");
    expect(data.error_code).toBe("UNSAFE_OPERATION");
  });

  it("should allow DELETE with WHERE", async () => {
    const result = await executeSql.execute("tc8", {
      sql: "DELETE FROM users WHERE id = 'TEST001'",
      operation_type: "delete",
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("ok");
    expect(data.operation).toBe("delete");
  });

  it("should execute mock query", async () => {
    const result = await executeSql.execute("tc9", {
      sql: "SELECT * FROM LOAN_APPLICATION WHERE LOAN_ID = 'TEST001'",
      operation_type: "query",
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("ok");
    expect(data.row_count).toBe(1);
    expect(data.rows).toHaveLength(1);
  });

  it("should warn on affected rows mismatch", async () => {
    const result = await executeSql.execute("tc10", {
      sql: "DELETE FROM LOAN_APPLICATION WHERE LOAN_ID = 'NONEXISTENT'",
      operation_type: "delete",
      expect_affected_rows: 1,
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe("ok");
    expect(data.warning).toBeDefined();
  });
});
