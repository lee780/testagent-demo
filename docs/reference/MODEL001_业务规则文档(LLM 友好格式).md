# MODEL_001 授信额度测算 — 业务规则文档（LLM 友好格式）

**版本**: v2.0
**模型编号**: MODEL_001
**接口地址**: `POST http://localhost:8000/mock/model/score`
**Content-Type**: `application/xml`

---

## 1. 接口说明

根据用户的社保、工资、资产、用户等级，判断是否准入并计算授信额度。

### 1.1 指标来源说明

模型输入指标均来自本地数据库：

| 来源 | 指标 | 获取方式 |
|------|------|---------|
| 本地数据库 | user_level, avg_3m_balance, social_security_flag, monthly_salary | 从四张数据表读取 |

### 1.2 请求报文（XML）

```xml
<?xml version="1.0" encoding="utf-8"?>
<REQUEST>
  <user_id>999998888800000001</user_id>
  <model_id>MODEL_001</model_id>
  <channel>131</channel>
  <business_params>
    <sx_trace_id>123456789012345678</sx_trace_id>
    <corp_id>999998888800000123</corp_id>
    <corp_xy_num>999998888800000223</corp_xy_num>
    <cst_id>639410001001906824</cst_id>
    <id_type>1010</id_type>
    <person_id>441422197502193789</person_id>
    <person_name>张三</person_name>
    <bnk_no>111222333</bnk_no>
    <cp_code>8890</cp_code>
    <qd_cd>R00</qd_cd>
    <c_code>110110</c_code>
    <p_code>110000</p_code>
    <fr_psn_id>441422197505196889</fr_psn_id>
    <fr_psn_name>李四</fr_psn_name>
  </business_params>
</REQUEST>
```

> 仅 `user_id` 是必填业务字段，其余 `business_params` 为透传字段，不影响计算逻辑。

### 1.3 响应报文（XML）

```xml
<?xml version="1.0" encoding="utf-8"?>
<RESPONSE>
  <result_code>0000</result_code>
  <result_msg>success</result_msg>
  <admit_flag>1</admit_flag>
  <credit_limit>103500000.00</credit_limit>
</RESPONSE>
```

| 字段 | 说明 | 取值 |
|------|------|------|
| result_code | 接口结果码 | `0000`=成功，`0001`=用户数据不存在，`9999`=参数错误 |
| result_msg | 结果描述 | 文字说明 |
| admit_flag | 准入标志 | `0`=不准入，`1`=准入 |
| credit_limit | 授信额度 | 格式 `"0.00"`，不准入时固定返回 `"0.00"` |

---

## 2. 数据表与字段（本地数据库）

测试前需通过 `preconditions.db_setup` 向以下四张表写入测试数据：

| 表名（逻辑） | 字段 | 类型 | 说明 | 约束 |
|---|---|---|---|---|
| `user_info` | `user_id` | String | 用户ID（主键） | - |
| `user_info` | `user_level` | Integer | 用户等级 | 取值 1～5 |
| `account_balance` | `user_id` | String | 用户ID（主键） | - |
| `account_balance` | `avg_3m_balance` | Decimal | 近3个月月均资产（元） | 可为负 |
| `cgs_social_security` | `user_id` | String | 用户ID（主键） | - |
| `cgs_social_security` | `social_security_flag` | Integer | 社保标志 | `0`=无社保，`1`=有社保 |
| `salary_summary` | `user_id` | String | 用户ID（主键） | - |
| `salary_summary` | `monthly_salary` | Decimal | 近1个月工资总收入（元） | 范围：1～10,000,000 |

---

## 3. 业务规则

### 3.1 准入判断（2 条，全部满足才准入）

| 编号 | 条件 | 指标来源 |
|------|------|---------|
| 1 | `monthly_salary > 10000`（严格大于） | 本地DB |
| 2 | `social_security_flag = 1`（有社保） | 本地DB |

> 任意一条不满足 → `admit_flag = 0`，`credit_limit = 0.00`，直接返回

### 3.2 计算系数（coefficient）

仅在**全部准入条件满足**时计算，否则取 0：

| 条件 | 系数 |
|------|------|
| 准入 且 `avg_3m_balance > 1000` | **2.3** |
| 准入 且 `0 < avg_3m_balance ≤ 1000` | **0.5** |
| 准入 且 `avg_3m_balance ≤ 0`（含0和负数） | **0.2** |
| 不准入 | 0（不进入计算） |

### 3.3 授信额度计算公式

```
credit_limit = user_level × avg_3m_balance × monthly_salary × coefficient
```

> 计算结果为负数时，返回 `0.00`（归零处理）。

### 3.4 计算示例

| user_level | avg_3m_balance | monthly_salary | 系数 | credit_limit |
|---|---|---|---|---|
| 2 | 1500.00 | 15000 | 2.3（>1000） | `2×1500×15000×2.3=103500000.00` |
| 2 | 500.00 | 15000 | 0.5（0<≤1000） | `2×500×15000×0.5=7500000.00` |
| 1 | -5000.00 | 15000 | 0.2（≤0） | `1×(-5000)×15000×0.2=-1500000→0.00`（归零） |
| 2 | 5000.00 | 9000 | 不准入（工资≤10000） | `0.00` |
| 2 | 5000.00 | 15000 | 不准入（无社保） | `0.00` |

---

## 4. 测试数据设计要点

1. **user_id 唯一性**：每条用例使用独立的 user_id，避免数据污染
2. **两条准入条件逐一击穿**：每条准入条件单独设计不满足场景
3. **系数三分支全覆盖**：avg_3m_balance 分别取 >1000、0<≤1000、≤0 三档
4. **边界值**：monthly_salary 取 10000（不准入）和 10001（准入）；avg_3m_balance 取 0、1000、1001
5. **负数归零**：avg_3m_balance 取负值，验证额度归零
