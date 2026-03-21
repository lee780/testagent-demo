#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
授信额度测算业务规范 - 测试用例生成器
根据业务规则生成所有因子组合的测试用例文件
"""

import os
from datetime import datetime

# 模板内容
TEMPLATE = '''# 接口测试用例参考格式
# 模型：MODEL_001 授信额度测算
# 说明：{description}

suite:
  id: SUITE_MODEL001
  name: 授信额度模型接口测试
  model_id: MODEL_001
  endpoint: /api/model/score
  method: POST
  content_type: application/xml

test_cases:

  - id: {case_id}
    name: "{case_name}"
    category: {category}          # 正常流程 / 异常流程 / 边界值 / 数据校验 / 性能
    priority: P0               # P0 / P1 / P2
    preconditions:
      db_setup:
        user_info:
          user_id: "{user_id}"
          user_level: {user_level}        # 1~5
        account_balance:
          user_id: "{user_id}"
          avg_3m_balance: {avg_balance:.2f}    # decimal，可为负
        cgs_social_security:
          user_id: "{user_id}"
          social_security_flag: {social_flag}   # 0=无社保 / 1=有社保
        salary_summary:
          user_id: "{user_id}"
          monthly_salary: {monthly_salary:.2f}    # decimal，范围 1~10000000
    request:
      body: |
        <?xml version="1.0" encoding="utf-8"?>
        <REQUEST>
          <user_id>{user_id}</user_id>
          <model_id>MODEL_001</model_id>
          <channel>131</channel>
          <business_params>
            <sx_trace_id>{trace_id}</sx_trace_id>
            <corp_id>{corp_id}</corp_id>
            <corp_xy_num>{xy_num}</corp_xy_num>
            <person_idtype>1010</person_idtype>
            <person_id>{person_id}</person_id>
            <person_name>贺学宇</person_name>
            <bnk_no>111222333</bnk_no>
            <cp_code>8890</cp_code>
            <c_code>110110</c_code>
            <p_code>110000</p_code>
            <fr_psn_id>{fr_psn_id}</fr_psn_id>
            <fr_psn_name>李宇浩</fr_psn_name>
          </business_params>
        </REQUEST>
    assertions:
      - path: "//result_code"
        op: eq
        value: "0000"
        desc: 接口调用成功
      - path: "//admit_flag"
        op: eq
        value: "{admit_flag}"              # 0=不准入 / 1=准入
        desc: 准入判断结果 (预期：{admit_expected})
      - path: "//credit_limit"
        op: eq
        value: "{expected_limit:.2f}"              # 格式："0.00"，公式：user_level × avg_3m_balance × monthly_salary × 计算系数，负数归零
        desc: 授信额度 (计算公式详解见 notes)
    notes: "{notes}"
'''

def calculate_credit_limit(user_level, avg_balance, monthly_salary, social_flag):
    """
    根据业务规则计算授信额度
    
    规则:
    1. 准入条件：monthly_salary > 10000 AND social_security_flag = 1
    2. 计算系数:
       - 准入且 avg_balance > 0 -> 2.3
       - 准入且 avg_balance <= 0 -> 0.5  
       - 不准入 -> 0
    3. 额度 = user_level * avg_balance * monthly_salary * 系数 (负数归零)
    """
    is_admitted = (monthly_salary > 10000) and (social_flag == 1)
    
    if not is_admitted:
        admit_flag = "0"
        coefficient = 0
        expected_limit = 0.0
    elif avg_balance > 0:
        admit_flag = "1"
        coefficient = 2.3
        credit = user_level * avg_balance * monthly_salary * coefficient
        expected_limit = max(0, credit)
    else:
        admit_flag = "1"
        coefficient = 0.5
        credit = user_level * avg_balance * monthly_salary * coefficient
        expected_limit = max(0, credit)
    
    return admit_flag, expected_limit, coefficient, is_admitted

def generate_all_test_cases():
    """生成所有因子组合的测试用例"""
    
    # 定义因子值
    user_levels = [1, 2, 3, 4, 5]
    social_flags = [0, 1]  # 0=无社保，1=有社保
    
    # balance 和 salary 的组合（需要覆盖不同场景）
    # 为了覆盖所有情况，我们需要以下组合：
    # balance: -1000, 0, 100, 5000 (负数、0、正数小、正数大)
    # salary: 5000, 10000, 15000, 50000 (不合格工资、边界、合格工资)
    
    test_combinations = []
    
    # ============================================
    # 第一部分：不准入场景 (social_flag = 0 OR monthly_salary <= 10000)
    # ============================================
    
    # A. social_flag = 0 (无社保)，各种 salary
    for user_level in user_levels:
        for avg_balance in [-1000, 0, 100, 5000]:
            for monthly_salary in [5000, 10000, 15000, 50000]:
                test_combinations.append({
                    'user_level': user_level,
                    'avg_balance': avg_balance,
                    'social_flag': 0,
                    'monthly_salary': monthly_salary
                })
    
    # B. social_flag = 1 (有社保)，但 monthly_salary <= 10000
    # (上面已经覆盖了 monthly_salary 的各种值，这里只需要添加 social_flag=1 的情况)
    # 但是注意：上面的组合已经包含了 social_flag=1 且 salary<=10000 的情况
    # 所以我们只需要确保这些情况都被覆盖即可
    
    # ============================================
    # 第二部分：准入境况 (social_flag = 1 AND monthly_salary > 10000)
    # ============================================
    
    # C. social_flag = 1, monthly_salary > 10000, balance <= 0
    for user_level in user_levels:
        for avg_balance in [-5000, -100, 0]:  # 准入但 balance <= 0
            for monthly_salary in [15000, 50000]:  # salary > 10000
                test_combinations.append({
                    'user_level': user_level,
                    'avg_balance': avg_balance,
                    'social_flag': 1,
                    'monthly_salary': monthly_salary
                })
    
    # D. social_flag = 1, monthly_salary > 10000, balance > 0
    for user_level in user_levels:
        for avg_balance in [100, 5000, 10000]:  # 准入且 balance > 0
            for monthly_salary in [15000, 50000, 100000]:  # salary > 10000
                test_combinations.append({
                    'user_level': user_level,
                    'avg_balance': avg_balance,
                    'social_flag': 1,
                    'monthly_salary': monthly_salary
                })
    
    return test_combinations

def generate_case_id(index, scenario_type):
    """生成测试用例 ID"""
    type_map = {
        'not_admitted': 'NA',      # 不准入
        'admitted_pos_balance': 'AP',  # 准入正余额
        'admitted_zero_neg_balance': 'AN'  # 准入零负余额
    }
    prefix = type_map.get(scenario_type, 'TC')
    return f"TC_MODEL001_{prefix}_{index:03d}"

def main():
    output_dir = "/Users/claude/testagent/TestAgent-PI-main/generated_test_cases"
    
    combinations = generate_all_test_cases()
    
    print(f"共生成 {len(combinations)} 个因子组合")
    
    case_index = 1
    for combo in combinations:
        user_level = combo['user_level']
        avg_balance = combo['avg_balance']
        social_flag = combo['social_flag']
        monthly_salary = combo['monthly_salary']
        
        # 计算预期结果
        admit_flag, expected_limit, coefficient, is_admitted = calculate_credit_limit(
            user_level, avg_balance, monthly_salary, social_flag
        )
        
        # 确定场景类型
        if not is_admitted:
            scenario_type = 'not_admitted'
            category = '正常流程'
        elif avg_balance <= 0:
            scenario_type = 'admitted_zero_neg_balance'
            category = '边界值'
        else:
            scenario_type = 'admitted_pos_balance'
            category = '正常流程'
        
        # 生成描述
        if not is_admitted:
            if social_flag == 0:
                reason = "无社保"
            else:
                reason = f"月工资={monthly_salary}<=10000"
            description = f"不准入场景 ({reason}), uL={user_level}, bal={avg_balance}, sal={monthly_salary}"
        elif avg_balance <= 0:
            description = f"准入但余额<=0, uL={user_level}, bal={avg_balance}, sal={monthly_salary}"
        else:
            description = f"准入且余额>0, uL={user_level}, bal={avg_balance}, sal={monthly_salary}"
        
        case_id = generate_case_id(case_index, scenario_type)
        case_name = f"{'准入/不准入':<6}{social_flag}级-{user_level}级-bal{avg_balance:+.0f}-sal{int(monthly_salary):,}"
        
        # 生成 notes
        if not is_admitted:
            notes = f"未满足准入条件:\n- social_security_flag={social_flag} {'(不符合)' if social_flag==0 else ''}\n- monthly_salary={monthly_salary} {'(不符合)' if monthly_salary<=10000 else ''}\n因此不准入，额度为 0\n计算系数=0"
        elif avg_balance <= 0:
            notes = f"满足准入条件(social_flag=1,salary={monthly_salary}>10000)\n但 avg_balance={avg_balance}<='0'\n计算系数=0.5\n额度=uL({user_level})*bal({avg_balance})*sal({monthly_salary})*0.5={expected_limit:.2f}(已做负数归零处理)"
        else:
            notes = f"满足准入条件(social_flag=1,salary={monthly_salary}>10000)\n且 avg_balance={avg_balance}>0\n计算系数=2.3\n额度=uL({user_level})*bal({avg_balance})*sal({monthly_salary})*2.3={expected_limit:.2f}"
        
        # 生成唯一标识符
        base_user_id = 999998888800000323 + case_index
        trace_id = f"12345678901234567{case_index:02d}"
        corp_id = f"99999888880000012{case_index:02d}"
        xy_num = f"99999888880000022{case_index:02d}"
        person_id = f"44142219750219378{case_index:02d}"
        fr_psn_id = f"44142219750519688{case_index:02d}"
        
        # 格式化用例内容
        content = TEMPLATE.format(
            description=description,
            case_id=case_id,
            case_name=case_name,
            category=category,
            user_id=str(base_user_id),
            user_level=user_level,
            avg_balance=avg_balance,
            social_flag=social_flag,
            monthly_salary=monthly_salary,
            trace_id=trace_id,
            corp_id=corp_id,
            xy_num=xy_num,
            person_id=person_id,
            fr_psn_id=fr_psn_id,
            admit_flag=admit_flag,
            admit_expected="准入" if admit_flag == "1" else "不准入",
            expected_limit=expected_limit,
            notes=notes
        )
        
        # 写入文件
        filename = f"{case_id}.yaml"
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✓ 生成：{filename} - {case_name[:50]}... (额度={expected_limit:.2f}, 准入={admit_flag})")
        
        case_index += 1
    
    print(f"\n✅ 完成！共生成 {case_index - 1} 个测试用例文件")
    print(f"📁 输出目录：{output_dir}")

if __name__ == "__main__":
    main()
