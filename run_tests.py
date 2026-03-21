#!/usr/bin/env python3
"""
执行 MODEL001 授信额度测算接口测试用例
支持直接从 YAML 套件文件解析并逐个执行测试
"""

import requests
import yaml
import json
import time
from datetime import datetime

# 配置
BASE_URL = "http://localhost:8000"
ENDPOINT = "/mock/model/score"
YAML_FILE = "./test_cases_model001/suite.yaml"

def setup_preconditions(preconditions):
    """设置测试前置条件（数据库数据）"""
    # 这里需要调用 API 设置数据库状态
    # 由于我们的测试环境已有固定的 mock 数据，我们需要使用已有的方式
    return True

def execute_test_case(test_case):
    """执行单个测试用例"""
    tc_id = test_case['id']
    tc_name = test_case['name']
    
    print(f"\n{'='*60}")
    print(f" executing: {tc_id} - {tc_name}")
    print(f"{'='*60}")
    
    # 准备请求
    headers = {'Content-Type': 'application/xml'}
    body = test_case['request']['body']
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}{ENDPOINT}",
            data=body,
            headers=headers,
            timeout=10
        )
        elapsed = (time.time() - start_time) * 1000
        
        # 解析响应
        resp_text = response.text
        status_code = response.status_code
        
        # 简单 XML 解析提取值
        def extract_xml_tag(xml_text, tag):
            import re
            pattern = f"<{tag}>([^<]*)</{tag}>"
            match = re.search(pattern, xml_text)
            return match.group(1) if match else None
        
        result_code = extract_xml_tag(resp_text, 'result_code')
        result_msg = extract_xml_tag(resp_text, 'result_msg')
        admit_flag = extract_xml_tag(resp_text, 'admit_flag')
        credit_limit = extract_xml_tag(resp_text, 'credit_limit')
        
        actual_result = {
            'status_code': status_code,
            'result_code': result_code,
            'result_msg': result_msg,
            'admit_flag': admit_flag,
            'credit_limit': credit_limit,
            'response_time_ms': round(elapsed, 2)
        }
        
        print(f"Response:")
        print(f"  Status Code: {status_code}")
        print(f"  Result Code: {result_code}")
        print(f"  Admit Flag: {admit_flag}")
        print(f"  Credit Limit: {credit_limit}")
        print(f"  Response Time: {elapsed:.2f}ms")
        
        # 验证断言
        all_passed = True
        assertions = test_case.get('assertions', [])
        for i, assertion in enumerate(assertions, 1):
            path = assertion['path']
            op = assertion['op']
            expected = assertion['value']
            desc = assertion['desc']
            
            # 映射 XPath 到实际字段
            field_map = {
                '//result_code': result_code,
                '//admit_flag': admit_flag,
                '//credit_limit': credit_limit,
                '//result_msg': result_msg
            }
            actual_value = field_map.get(path, '')
            
            # 执行比较操作
            passed = False
            if op == 'eq':
                passed = str(actual_value) == str(expected)
            elif op == 'ne':
                passed = str(actual_value) != str(expected)
            elif op == 'gt':
                passed = float(actual_value) > float(expected)
            elif op == 'lt':
                passed = float(actual_value) < float(expected)
            elif op == 'contains':
                passed = str(expected) in str(actual_value)
            
            status = "✓ PASS" if passed else "✗ FAIL"
            print(f"  Assertion[{i}]: {status} - {desc}")
            print(f"          Expected: {expected}, Actual: {actual_value}")
            
            if not passed:
                all_passed = False
        
        result_status = "PASS" if all_passed else "FAIL"
        print(f"  Overall: {result_status}")
        
        return {
            'test_id': tc_id,
            'test_name': tc_name,
            'category': test_case.get('category', ''),
            'priority': test_case.get('priority', 'P2'),
            'coverage_point': test_case.get('coverage_point', ''),
            'status': result_status,
            'duration_ms': round(elapsed, 2),
            'actual_result': actual_result,
            'all_assertions': [{'passed': p and s=='PASS', 'description': a['desc']} 
                              for a, s in zip(assertions, [r['Overall'] for r in [print(f'') or []]])]
        }
        
    except Exception as e:
        print(f"  ERROR: {str(e)}")
        return {
            'test_id': tc_id,
            'test_name': tc_name,
            'category': test_case.get('category', ''),
            'priority': test_case.get('priority', 'P2'),
            'coverage_point': test_case.get('coverage_point', ''),
            'status': 'ERROR',
            'error_message': str(e),
            'actual_result': {}
        }

def main():
    print("="*70)
    print("MODEL001 授信额度测算接口测试套件")
    print(f"执行时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)
    
    # 读取测试套件
    with open(YAML_FILE, 'r', encoding='utf-8') as f:
        suite = yaml.safe_load(f)
    
    print(f"\nSuite ID: {suite['suite']['id']}")
    print(f"Suite Name: {suite['suite']['name']}")
    print(f"Endpoint: {suite['suite']['endpoint']}")
    print(f"Method: {suite['suite']['method']}")
    
    test_cases = suite.get('test_cases', [])
    print(f"Total Test Cases: {len(test_cases)}")
    
    results = []
    
    # 执行每个测试用例
    for tc in test_cases:
        preconditions = tc.get('preconditions', {})
        db_setup = preconditions.get('db_setup', {})
        
        # 如果需要设置前置条件，这里应该调用设置数据的 API
        # 在我们的场景中，mock 数据是预置的，所以假设测试用例已经按顺序执行
        
        result = execute_test_case(tc)
        results.append(result)
        
        # 添加小延迟避免并发问题
        time.sleep(0.5)
    
    # 统计结果
    total = len(results)
    passed = sum(1 for r in results if r['status'] == 'PASS')
    failed = sum(1 for r in results if r['status'] == 'FAIL')
    errors = sum(1 for r in results if r['status'] == 'ERROR')
    
    print(f"\n{'='*70}")
    print("测试结果汇总")
    print(f"{'='*70}")
    print(f"总计: {total}")
    print(f"通过：{passed}")
    print(f"失败：{failed}")
    print(f"错误：{errors}")
    print(f"通过率：{(passed/total*100):.2f}%" if total > 0 else "N/A")
    
    # 输出 JSON 结果用于后续处理
    output = {
        'suite_info': suite['suite'],
        'execution_time': datetime.now().isoformat(),
        'summary': {
            'total': total,
            'passed': passed,
            'failed': failed,
            'errors': errors,
            'pass_rate': round(passed/total*100, 2) if total > 0 else 0
        },
        'results': results
    }
    
    with open('./test_results.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n详细结果已保存到：./test_results.json")
    
    return 0 if failed == 0 and errors == 0 else 1

if __name__ == '__main__':
    exit(main())
