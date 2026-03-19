# MODEL_001 授信额度测算 — 业务规则文档

**版本**: v1.0
**模型编号**: MODEL_001
**接口地址**: `POST http://localhost:8000/mock/model/score`
**Content-Type**: `application/xml`

---

## 1. 接口说明

根据用户的社保、工资、资产、用户等级等信息，判断是否准入并计算授信额度。

### 1.1 请求报文（XML）

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
    <person_idtype>1010</person_idtype>
    <person_id>441422197502193789</person_id>
    <person_name>张三</person_name>
    <bnk_no>111222333</bnk_no>
    <cp_code>8890</cp_code>
    <c_code>110110</c_code>
    <p_code>110000</p_code>
    <fr_psn_id>441422197505196889</fr_psn_id>
    <fr_psn_name>李四</fr_psn_name>
  </business_params>
</REQUEST>
```

> 仅 `user_id` 是必填业务字段，其余 `business_params` 为透传字段，不影响计算逻辑。

### 1.2 响应报文（XML）

```xml
<?xml version="1.0" encoding="utf-8"?>
<RESPONSE>
  <result_code>0000</result_code>
  <result_msg>success</result_msg>
  <admit_flag>1</admit_flag>
  <credit_limit>517500.00</credit_limit>
</RESPONSE>
```

| 字段 | 说明 | 取值 |
|------|------|------|
| result_code | 接口结果码 | `0000`=成功，`0001`=用户数据不存在，`9999`=参数错误 |
| result_msg | 结果描述 | 文字说明 |
| admit_flag | 准入标志 | `0`=不准入，`1`=准入 |
| credit_limit | 授信额度 | 格式 `"0.00"`，不准入时固定返回 `"0.00"` |

---

## 2. 数据表与字段

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

### 3.1 准入判断

必须**同时满足**以下两条，才算「准入」，否则「不准入」：

| 条件 | 规则 |
|------|------|
| 条件1 | `monthly_salary > 10000`（严格大于，等于10000不满足） |
| 条件2 | `social_security_flag = 1`（有社保） |

> 任意一条不满足 → `admit_flag = 0`，`credit_limit = 0.00`，直接返回

### 3.2 计算系数（coefficient）

仅在**准入**条件满足时计算系数：

| 条件 | 系数 |
|------|------|
| 准入 且 `avg_3m_balance > 0` | **2.3** |
| 准入 且 `avg_3m_balance <= 0`（含0和负数） | **0.5** |
| 不准入 | 0（不进入计算） |

### 3.3 授信额度计算公式

```
credit_limit = user_level × (avg_3m_balance ÷ 1000) × monthly_salary × coefficient
```

> ⚠️ 注意：`avg_3m_balance` 在公式中以**千元**为单位，存储值需除以 1000。
> 计算结果为负数时，返回 `0.00`（归零处理）。

### 3.4 计算示例

| user_level | avg_3m_balance | monthly_salary | social_flag | 结果 | credit_limit |
|---|---|---|---|---|---|
| 3 | 5000 | 15000 | 1 | 准入，系数2.3 | `3 × 5 × 15000 × 2.3 = 517500.00` |
| 1 | -5000 | 15000 | 1 | 准入，系数0.5 | `1 × (-5) × 15000 × 0.5 = -37500 → 0.00`（归零） |
| 2 | 10000 | 10000 | 1 | 不准入（≤10000） | `0.00` |
| 3 | 5000 | 20000 | 0 | 不准入（无社保） | `0.00` |
| 1 | 0 | 20000 | 1 | 准入，系数0.5 | `1 × 0 × 20000 × 0.5 = 0.00` |

---

## 4. 测试数据设计要点

1. **user_id 唯一性**：每条用例使用独立的 user_id，避免数据污染
2. **边界值覆盖**：monthly_salary 取 10000（临界-不准入）、10001（临界+准入）
3. **负数归零**：avg_3m_balance 取负值，验证额度归零逻辑
4. **user_level 全覆盖**：建议覆盖 1、3、5 三档典型等级
5. **系数双分支**：avg_3m_balance 分别取 >0 和 <=0 两种情况
