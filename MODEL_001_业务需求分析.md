# 业务需求分析：MODEL_001 授信额度测算模型

## 一、输入参数清单

### 1.1 请求参数（HTTP Request）
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | String | 是 | 用户唯一标识 |
| model_id | String | 是 | 模型 ID（固定值：MODEL_001） |
| channel | Integer | 是 | 渠道编码（示例值：131） |
| business_params.sx_trace_id | String | 是 | 流水号/追踪 ID |
| business_params.person_idtype | String | 是 | 证件类型（示例值：1010） |
| business_params.person_name | String | 是 | 姓名 |
| ...其他业务参数 | - | - | 传参但不参与计算 |

### 1.2 数据库查询参数（通过 user_id 关联）
| 表名 | 字段 | 类型 | 取值范围/规则 |
|------|------|------|---------------|
| user_info | user_id | String | 主键 |
| user_info | user_level | Integer | **1~5**（用户等级乘数） |
| account_balance | user_id | String | 主键（与 user_info.user_id 关联） |
| account_balance | avg_3m_balance | Decimal | **月均余额**，可为负数 |
| cgs_social_security | user_id | String | 主键 |
| cgs_social_security | social_security_flag | Integer | **0=无社保，1=有社保** |
| salary_summary | user_id | String | 主键 |
| salary_summary | monthly_salary | Decimal | **月薪范围 1~10000000** |

---

## 二、业务规则

### 2.1 准入条件（Admission Rules）
**准入门槛（AND 关系，必须同时满足）：**
1. `monthly_salary > 10000` （**严格大于**10000 元，等于不准入）
2. `social_security_flag == 1` （必须有社保）

**判定逻辑：**
```
IF (monthly_salary > 10000 AND social_security_flag == 1):
    admit_flag = 1  # 准入
ELSE:
    admit_flag = 0  # 不准入
```

### 2.2 系数规则（Coefficient Rules）
根据准入状态和资产状况决定系数系数（coefficient）：
```
IF (admit_flag == 1):
    IF (avg_3m_balance > 0):
        coefficient = 2.3  # 准入且正资产
    ELSE:  # avg_3m_balance <= 0
        coefficient = 0.5  # 准入但非正资产
ELSE:  # admit_flag == 0
    coefficient = 0  # 不准入
```

### 2.3 额度计算公式（Credit Limit Formula）
```
credit_limit = user_level × (avg_3m_balance ÷ 1000) × monthly_salary × coefficient
```

**分步计算逻辑：**
1. 基础金额 = `user_level` × `(avg_3m_balance ÷ 1000)` × `monthly_salary` × `coefficient`
2. 如果 `credit_limit < 0`，则最终额度 = **0.00**（负数归零）
3. 如果 `admit_flag == 0`，直接设置 `credit_limit = 0.00`

---

## 三、边界值定义

| 参数 | 有效范围 | 边界值 | 临界点说明 |
|------|----------|--------|------------|
| user_level | 1~5 | 1, 5 | 最低等级、最高等级 |
| monthly_salary | ≥1 | 10000, 10001 | **准入门槛：>10000 才准入** |
| avg_3m_balance | 任意 decimal | 0, -0.01, 0.01 | **资产正负分界线** |
| social_security_flag | 0/1 | 0, 1 | 二元标志 |

---

## 四、响应结构（XML）

```xml
<RESPONSE>
  <result_code>0000</result_code>    # 0000=成功
  <admit_flag>1</admit_flag>          # 1=准入，0=不准入
  <credit_limit>517500.00</credit_limit>  # 授信额度（两位小数）
  <coefficient>2.3</coefficient>      # 使用的系数值
</RESPONSE>
```

---

## 五、典型场景与计算示例

### 场景 S01：正常准入 + 正资产
- **数据**：user_level=3, avg_3m_balance=5000, monthly_salary=15000, social_security_flag=1
- **准入判定**：15000 > 10000 ✓，有社保 ✓ → **准入**
- **系数**：balance>0 → **2.3**
- **额度计算**：3 × (5000÷1000) × 15000 × 2.3 = 3 × 5 × 15000 × 2.3 = **517500.00**

### 场景 S02：准入 + 负资产
- **数据**：user_level=1, avg_3m_balance=-5000, monthly_salary=15000, social_security_flag=1
- **准入判定**：15000 > 10000 ✓，有社保 ✓ → **准入**
- **系数**：balance≤0 → **0.5**
- **额度计算**：1 × (-5000÷1000) × 15000 × 0.5 = 1 × (-5) × 15000 × 0.5 = **-37500** → **归零 = 0.00**

### 场景 S03：工资恰好等于门槛（边界）
- **数据**：monthly_salary=10000
- **准入判定**：10000 **不大于** 10000 → **不准入**
- **系数**：0
- **额度**：0.00

---

## 六、风险区域识别

1. **负资产处理**：当 avg_3m_balance 为负数时，即使准入也需要将最终额度归零
2. **工资临界值**：monthly_salary=10000 是不准入的临界点（严格大于才准入）
3. **用户等级范围**：1~5 是合法范围，超出应视为异常（如 0、6 等）
4. **零余额情况**：avg_3m_balance=0 属于"非正资产"，系数取 0.5
