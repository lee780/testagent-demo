#!/usr/bin/env python3
"""
设置测试前置条件的 API 调用脚本
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def setup_user_data(user_id, user_level, avg_balance, social_flag, monthly_salary):
    """
    为指定用户 ID 设置完整的测试数据
    """
    data = {
        "userId": user_id,
        "userLevel": user_level,
        "avg3mBalance": str(avg_balance),
        "socialSecurityFlag": social_flag,
        "monthlySalary": str(monthly_salary)
    }
    
    response = requests.post(f"{BASE_URL}/mock/setup", json=data, timeout=10)
    return response.json()

if __name__ == '__main__':
    # 定义所有测试用例的数据
    test_cases = [
        # Valid cases
        {"id": "TC_V01", "level": 3, "balance": 50000.00, "ss": 1, "salary": 30000.00},
        {"id": "TC_V02", "level": 5, "balance": 100000.00, "ss": 1, "salary": 100000.00},
        {"id": "TC_V03", "level": 1, "balance": 1000.00, "ss": 1, "salary": 10001.00},
        {"id": "TC_V04", "level": 3, "balance": 25000.00, "ss": 1, "salary": 20000.00},
        {"id": "TC_V05", "level": 2, "balance": 10000.00, "ss": 1, "salary": 15000.00},
        # Boundary cases
        {"id": "TC_B01", "level": 3, "balance": 50000.00, "ss": 1, "salary": 10001.00},
        {"id": "TC_B02", "level": 5, "balance": 100000.00, "ss": 1, "salary": 10000.00},
        {"id": "TC_B03", "level": 2, "balance": 0.01, "ss": 1, "salary": 20000.00},
        {"id": "TC_B04", "level": 3, "balance": 0.00, "ss": 1, "salary": 25000.00},
        {"id": "TC_B05", "level": 2, "balance": -0.01, "ss": 1, "salary": 20000.00},
        {"id": "TC_B06", "level": 1, "balance": 50000.00, "ss": 1, "salary": 30000.00},
        {"id": "TC_B07", "level": 5, "balance": 50000.00, "ss": 1, "salary": 30000.00},
        # Exception cases
        {"id": "TC_E01", "level": 5, "balance": 500000.00, "ss": 0, "salary": 50000.00},
        {"id": "TC_E02", "level": 5, "balance": 500000.00, "ss": 1, "salary": 5000.00},
        {"id": "TC_E03", "level": 5, "balance": -100000.00, "ss": 1, "salary": 50000.00},
        {"id": "TC_E05", "level": 3, "balance": 10000.00, "ss": 0, "salary": 8000.00},
        {"id": "TC_E06", "level": 2, "balance": 30000.00, "ss": 0, "salary": 15000.00},
        # Coefficient cases
        {"id": "TC_C01", "level": 1, "balance": 1000.00, "ss": 1, "salary": 10001.00},
        {"id": "TC_C02", "level": 2, "balance": -1000.00, "ss": 1, "salary": 15000.00},
        {"id": "TC_C03", "level": 2, "balance": 0.00, "ss": 1, "salary": 15000.00},
        # Combined cases
        {"id": "TC_G01", "level": 5, "balance": 200000.00, "ss": 1, "salary": 100000.00},
        {"id": "TC_G02", "level": 3, "balance": 1.00, "ss": 1, "salary": 12000.00},
        {"id": "TC_G03", "level": 5, "balance": -50000.00, "ss": 1, "salary": 80000.00},
        {"id": "TC_G04", "level": 1, "balance": 100.00, "ss": 1, "salary": 2000.00},
    ]
    
    print("="*70)
    print("设置测试前置条件数据")
    print("="*70)
    
    for tc in test_cases:
        result = setup_user_data(tc["id"], tc["level"], tc["balance"], tc["ss"], tc["salary"])
        status = "✓" if result.get("success") else "✗"
        print(f"{status} {tc['id']}: {result}")
    
    print("\n所有测试数据设置完成!")
