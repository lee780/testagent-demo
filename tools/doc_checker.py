#!/usr/bin/env python3
"""
接口测试文档准入检查工具
用法：python3 tools/doc_checker.py <文档路径.docx>

开发同学在交付文档给测试之前，先跑一遍此工具自查。
全部通过后再交付，避免来回返工。
"""

import sys
import re
import os
from docx import Document

# ── ANSI 颜色 ────────────────────────────────────────────────
RESET  = '\033[0m'
BOLD   = '\033[1m'
RED    = '\033[91m'
GREEN  = '\033[92m'
YELLOW = '\033[93m'
CYAN   = '\033[96m'
GRAY   = '\033[90m'

PASS = f'{GREEN}✅ 通过{RESET}'
FAIL = f'{RED}❌ 不通过{RESET}'
WARN = f'{YELLOW}⚠️  警告{RESET}'

# ── 检查结果收集 ─────────────────────────────────────────────
results = []   # (status, category, item, detail)

def ok(cat, item, detail=''):
    results.append(('PASS', cat, item, detail))

def fail(cat, item, detail):
    results.append(('FAIL', cat, item, detail))

def warn(cat, item, detail):
    results.append(('WARN', cat, item, detail))

# ── 文本提取 ─────────────────────────────────────────────────
def load_text(path):
    doc = Document(path)
    lines = [p.text for p in doc.paragraphs]
    full  = '\n'.join(lines)
    return lines, full

def find_line(lines, keyword):
    """返回包含 keyword 的所有行"""
    return [l for l in lines if keyword in l]

def find_value(lines, keyword):
    """返回第一行包含 keyword 的那整行"""
    for l in lines:
        if keyword in l:
            return l.strip()
    return None

# ════════════════════════════════════════════════════════════
# 以下每个函数对应一个检查类别
# ════════════════════════════════════════════════════════════

def check_basic_info(lines, full):
    """第1类：接口调用基本信息"""
    cat = '接口调用基本信息'

    # 1-1 测试环境 URL
    urls = re.findall(r'https?://[\w\.\-:/]+', full)
    # 排除挡板/mock地址，找主接口地址
    main_urls = [u for u in urls if 'mock' not in u.lower() and '3458' not in u]
    if main_urls:
        ok(cat, '测试环境URL', main_urls[0])
    else:
        fail(cat, '测试环境URL', '未找到主接口 http(s):// 地址，请补充测试环境URL')

    # 1-2 调用协议/方法
    if re.search(r'HTTP\s*POST|POST\s*请求', full, re.IGNORECASE):
        ok(cat, '调用协议/方法', 'HTTP POST')
    elif re.search(r'HTTP\s*GET|GET\s*请求', full, re.IGNORECASE):
        warn(cat, '调用协议/方法', '检测到 HTTP GET，接口测试通常用 POST，请确认')
    else:
        fail(cat, '调用协议/方法', '未说明调用方法（HTTP POST/GET），请补充')

    # 1-3 Content-Type
    if 'application/xml' in full or 'text/xml' in full:
        ok(cat, 'Content-Type', 'application/xml')
    elif 'application/json' in full:
        warn(cat, 'Content-Type', 'application/json（文档其他地方用XML，请确认是否一致）')
    else:
        fail(cat, 'Content-Type', '未说明 Content-Type，请补充（如 application/xml）')

    # 1-4 认证方式
    if re.search(r'无需认证|不需要认证|无鉴权|无认证', full):
        ok(cat, '认证方式', '无需认证（已明确说明）')
    elif re.search(r'Authorization|token|Bearer|Basic\s*Auth|鉴权', full, re.IGNORECASE):
        ok(cat, '认证方式', '已说明认证方式（含关键字）')
    else:
        fail(cat, '认证方式', '未说明认证方式，请补充（无需认证 or token/Basic Auth）')

    # 1-5 超时时间
    if re.search(r'超时.*?(\d+\s*(ms|毫秒|s|秒))', full):
        ok(cat, '超时时间', re.search(r'超时.*?(\d+\s*(ms|毫秒|s|秒))', full).group(0)[:30])
    elif re.search(r'超时|timeout', full, re.IGNORECASE):
        warn(cat, '超时时间', '提到了超时但未给出具体数值（建议写明，如 30000ms），当前测试按默认处理')
    else:
        warn(cat, '超时时间', '未说明超时时间，测试将按默认处理，若调用耗时长可能影响判断')


def check_response_format(lines, full):
    """第2类：主接口响应报文格式"""
    cat = '主接口响应报文'

    # 2-1 准入成功样例
    if 'ADMIT' in full:
        ok(cat, '准入成功(ADMIT)响应样例', '文档中包含 ADMIT')
    else:
        fail(cat, '准入成功(ADMIT)响应样例', '未找到 ADMIT 响应样例，测试无法判断准入时的返回结构')

    # 2-2 不准入样例
    if 'REJECT' in full:
        ok(cat, '不准入(REJECT)响应样例', '文档中包含 REJECT')
    else:
        fail(cat, '不准入(REJECT)响应样例', '未找到 REJECT 响应样例，测试无法判断不准入时的返回结构')

    # 2-3 响应中额度字段名
    credit_fields = re.findall(r'<(\w*(?:credit|limit|额度|crgln|amount)\w*)>', full, re.IGNORECASE)
    if credit_fields:
        ok(cat, '响应额度字段名', f'检测到字段：{credit_fields[0]}')
    elif re.search(r'额度字段|credit_limit|crgln', full):
        ok(cat, '响应额度字段名', '已提及额度字段（请确认与实际响应一致）')
    else:
        fail(cat, '响应额度字段名', '响应报文中未见额度字段名，测试无法断言额度值')

    # 2-4 金额单位
    if re.search(r'单位.*?(元|分|万元)|（元）|（分）|单位为元|单位是元', full):
        ok(cat, '额度金额单位', '已说明单位（元/分/万元）')
    else:
        fail(cat, '额度金额单位', '未说明额度字段的金额单位（元？分？万元？），测试无法断言数值')

    # 2-5 响应错误码说明
    if re.search(r'(code|RESP_CODE).*?(\d{5,})', full):
        ok(cat, '响应code字段说明', '已出现 code/RESP_CODE 取值示例')
    else:
        warn(cat, '响应code字段说明', '未见 code 字段取值说明，测试需要知道成功/失败的 code 值')


def check_stub_config(lines, full):
    """第3类：外部接口挡板配置"""
    cat = '外部接口挡板配置'

    # 3-1 是否说明了挡板/Mock
    if re.search(r'挡板|[Mm]ock|[Ss]tub', full):
        ok(cat, '挡板/Mock说明', '文档中提到了挡板或Mock')
    else:
        fail(cat, '挡板/Mock说明',
             '未说明外部接口(A00110001/002/003)在测试环境走挡板还是真实调用，'
             '测试无法控制外部指标返回值')

    # 3-2 挡板管理API地址
    stub_urls = [u for u in re.findall(r'https?://[\w\.\-:/]+', full)
                 if any(k in u for k in ['3458', 'mock', 'stub', 'admin'])]
    if stub_urls:
        ok(cat, '挡板管理地址', stub_urls[0])
    elif re.search(r'挡板.*?(http|接口|API|地址)', full) or re.search(r'(http|接口|API|地址).*?挡板', full):
        warn(cat, '挡板管理地址', '提到了挡板但未给出管理API地址，测试无法自助切换场景')
    else:
        fail(cat, '挡板管理地址', '未提供挡板管理地址/API，测试无法切换外部接口返回场景')

    # 3-3 场景切换方式（PUT/DELETE）
    if re.search(r'PUT\s+http|DELETE\s+http', full):
        ok(cat, '挡板场景切换方式', '已提供 PUT/DELETE 接口示例')
    elif re.search(r'挡板.*?配置|配置.*?挡板', full):
        warn(cat, '挡板场景切换方式', '提到挡板配置但未给出操作示例（如 PUT 设置/DELETE 重置）')
    else:
        fail(cat, '挡板场景切换方式', '未说明如何切换挡板场景，测试无法自助配置')

    # 3-4 是否说明了挡板限制（全局 or 按user_id）
    if re.search(r'全局|不支持.*?user_id|per.*?user|user_id.*?区分', full):
        ok(cat, '挡板隔离限制说明', '已说明挡板是否支持按 user_id 区分场景')
    else:
        warn(cat, '挡板隔离限制说明',
             '未说明挡板是否支持按 user_id 区分（全局配置则同一时刻只能测一个场景），'
             '测试需要提前知道，以便安排串行/并行')

    # 3-5 各外部接口的正常场景默认返回值
    for tx in ['A00110001', 'A00110002', 'A00110003']:
        if tx in full:
            ok(cat, f'{tx} 默认返回说明', f'文档中包含 {tx}')
        else:
            fail(cat, f'{tx} 默认返回说明', f'未找到 {tx}，测试无法确认该外部接口的默认返回')


def check_data_tables(lines, full):
    """第4类：数据表关键规则"""
    cat = '数据表关键规则'

    # 4-1 salary_summary 月份查询规则
    salary_block = ''
    for i, l in enumerate(lines):
        if 'salary_summary' in l:
            salary_block = '\n'.join(lines[max(0,i-2):min(len(lines),i+15)])
            break

    if re.search(r'当前月|当月|最新.*?一条|ORDER BY month|取最新|最近一条', salary_block + full):
        ok(cat, 'salary_summary 月份查询规则',
           '已说明模型按什么月份查询工资（当前月/最新一条）')
    else:
        fail(cat, 'salary_summary 月份查询规则',
             'salary_summary 是按月存储的表，但文档未说明模型运行时取哪个月的数据。'
             '\n        → 未确认此项，测试数据中 month 字段写错则所有工资用例直接报错"工资信息不存在"')

    # 4-2 user_level 取值范围
    if re.search(r'user_level.*?1.*?5|取值.*?1~5|1~5.*?等级', full):
        ok(cat, 'user_level 取值范围', '已说明取值 1~5')
    else:
        warn(cat, 'user_level 取值范围', '未明确 user_level 是否只允许整数 1~5，测试边界值（0、6、小数）时需要')

    # 4-3 avg_3m_balance 可为负数
    if re.search(r'负资产|可为负|avg_3m_balance.*?负', full):
        ok(cat, 'avg_3m_balance 可为负数', '已说明可为负资产')
    else:
        warn(cat, 'avg_3m_balance 可为负数', '未明确说明 avg_3m_balance 可为负数，测试负资产场景时可能产生疑问')

    # 4-4 monthly_salary 无负数
    if re.search(r'monthly_salary.*?无正负|仅为收入|无负|只有正', full):
        ok(cat, 'monthly_salary 无负值说明', '已说明仅为收入金额、无负数')
    else:
        warn(cat, 'monthly_salary 无负值说明', '未明确 monthly_salary 是否可为负，建议说明')


def check_test_data(lines, full):
    """第5类：测试数据准备"""
    cat = '测试数据准备'

    # 5-1 数据写入方式
    if re.search(r'[☑✓✔][^\n]*?(开发|DB|权限)|□[^\n]*(已选|✓)', full):
        ok(cat, '数据写入方式', '已勾选数据写入方式')
    elif '数据写入方式' in full:
        fail(cat, '数据写入方式',
             '"数据写入方式"存在于文档中但选项未勾选（仍为□）。'
             '\n        → 请明确：开发提供账号 / 开发帮写入 / 测试自有DB权限')
    else:
        fail(cat, '数据写入方式', '未说明测试数据由谁来写入DB，测试无法准备数据')

    # 5-2 基础测试账号
    uid_lines = find_line(lines, 'user_id：')
    if uid_lines:
        val = uid_lines[0].strip()
        if re.search(r'user_id：\s*\S+', val):
            ok(cat, '基础测试账号 user_id', val[:60])
        else:
            fail(cat, '基础测试账号 user_id', '发现 user_id 行但值为空，请填写可用的测试账号')
    else:
        fail(cat, '基础测试账号 user_id', '未提供基础测试 user_id，测试无法发起请求')

    # 5-3 多场景账号覆盖度
    uid_count = len(re.findall(r'user_id[：:]\s*\S+', full))
    if uid_count >= 5:
        ok(cat, '多场景账号数量', f'检测到约 {uid_count} 个 user_id（满足多场景需求）')
    elif uid_count >= 2:
        warn(cat, '多场景账号数量',
             f'检测到 {uid_count} 个 user_id。'
             '\n        建议至少10个账号覆盖：user_level 1~5、资产4区间、工资边界值、数据缺失场景')
    else:
        fail(cat, '多场景账号数量',
             f'只有 {uid_count} 个 user_id，远不够覆盖所有测试场景。'
             '\n        需要：user_level(5种) × 资产区间(4种) × 工资边界(3种) + 数据缺失(4种) ≈ 至少10~15个账号')


def check_error_scenarios(lines, full):
    """第6类：异常场景说明"""
    cat = '异常场景响应码'

    # 6-1 有异常响应说明
    if re.search(r'(code|RESP_CODE).*?999|999.*?(code|RESP_CODE)|错误码|异常.*?返回|返回.*?异常', full):
        ok(cat, '异常响应码示例', '文档中包含异常场景响应码说明')
    else:
        fail(cat, '异常响应码示例', '未说明异常时的响应码（如用户不存在、字段缺失时返回什么）')

    # 6-2 user_id 不存在场景
    if re.search(r'(user_id|person_id|用户).*?(不存在|查无|找不到)', full):
        ok(cat, 'user_id不存在时的返回', '已说明用户不存在的错误返回')
    else:
        fail(cat, 'user_id不存在时的返回', '未说明 user_id/person_id 不存在时返回什么，测试需要验证此场景')

    # 6-3 必填字段缺失
    if re.search(r'(字段缺失|缺少字段|必填|XML.*?解析|解析.*?失败|必传)', full):
        ok(cat, '必填字段缺失时的返回', '已说明字段缺失的错误场景')
    else:
        warn(cat, '必填字段缺失时的返回', '未说明必填字段缺失时的返回，建议补充')

    # 6-4 外部接口异常
    if re.search(r'(外部接口|A00110).*?(超时|报错|异常|失败)|降级', full):
        ok(cat, '外部接口异常时的返回', '已说明外部接口异常场景的返回')
    else:
        fail(cat, '外部接口异常时的返回',
             '未说明 A00110001/002/003 超时/报错时 MODEL_001 返回什么，'
             '\n        测试需要验证此场景（挡板可以模拟超时）')


def check_consistency(lines, full):
    """第7类：文档内一致性检查"""
    cat = '文档内一致性'

    # 7-1 字段总数自洽：找"共N个字段"，再数实际列表项
    m = re.search(r'共\s*(\d+)\s*个字段', full)
    if m:
        claimed = int(m.group(1))
        # 粗略数 3.1 + 3.2 的条目数
        # 找到 3.1 和 3.2 之间的非空行
        in_31 = False; in_32 = False
        count_31 = 0; count_32 = 0
        for l in lines:
            if re.match(r'3\.1\s', l): in_31 = True; in_32 = False; continue
            if re.match(r'3\.2\s', l): in_32 = True; in_31 = False; continue
            if re.match(r'3\.3\s|4\.\s', l): in_32 = False; break
            if in_31 and l.strip() and not l.strip().startswith('3.'): count_31 += 1
            if in_32 and l.strip() and not l.strip().startswith('3.'): count_32 += 1
        actual = count_31 + count_32
        if actual > 0 and abs(actual - claimed) <= 1:
            ok(cat, f'字段总数自洽（共{claimed}个）', f'声称{claimed}个，粗略计数{actual}个，基本一致')
        elif actual > 0:
            fail(cat, f'字段总数自洽',
                 f'标题写"共{claimed}个字段"，但实际计数约{actual}个，两者不符，请修正标题')
    else:
        warn(cat, '字段总数声明', '未找到"共N个字段"声明，建议在第3节标题处注明总数')

    # 7-2 coefficient 分类问题
    coeff_in_db = False; coeff_labeled_code = False
    in_db_section = False
    for l in lines:
        if re.match(r'3\.1\s', l): in_db_section = True
        if re.match(r'3\.2\s|3\.3\s|4\.\s', l): in_db_section = False
        if 'coefficient' in l:
            if in_db_section: coeff_in_db = True
            if re.search(r'代码|实时计算|非DB|非数据库', l): coeff_labeled_code = True

    if coeff_in_db and coeff_labeled_code:
        warn(cat, 'coefficient 分类',
             'coefficient 被放在"数据库表提取指标"节下，但同行已标注"代码计算/非DB字段"，'
             '\n        分类标题与内容不符，建议单独列一个"代码计算指标"子节')
    elif coeff_in_db and not coeff_labeled_code:
        fail(cat, 'coefficient 分类',
             'coefficient 在"数据库表提取指标"节下，且未说明是否为DB字段还是代码计算，'
             '\n        请明确并修正分类')
    else:
        ok(cat, 'coefficient 分类', 'coefficient 分类无明显问题')

    # 7-3 同一字段值是否一致（以 bnk_no 为例）
    bnk_values = re.findall(r'bnk_no[：:>]\s*(\d+)', full)
    if len(set(bnk_values)) > 1:
        fail(cat, 'bnk_no 值一致性',
             f'bnk_no 在文档中出现了多个不同值：{set(bnk_values)}，请统一为正确值')
    elif bnk_values:
        ok(cat, 'bnk_no 值一致性', f'bnk_no 值一致：{bnk_values[0]}')
    # 没出现就不报错

    # 7-4 请求报文中是否有示例 user_id
    if re.search(r'<user_id>\s*[^<\s]+\s*</user_id>', full):
        ok(cat, '请求报文含示例 user_id', '请求报文中包含示例 user_id 值')
    else:
        warn(cat, '请求报文含示例 user_id', '请求报文示例中 user_id 为空或未填写，测试难以参照')


# ════════════════════════════════════════════════════════════
# 主入口
# ════════════════════════════════════════════════════════════

def print_report():
    cat_order = [
        '接口调用基本信息',
        '主接口响应报文',
        '外部接口挡板配置',
        '数据表关键规则',
        '测试数据准备',
        '异常场景响应码',
        '文档内一致性',
    ]
    cat_icons = {
        '接口调用基本信息': '🔌',
        '主接口响应报文':   '📨',
        '外部接口挡板配置': '🎭',
        '数据表关键规则':   '🗄️',
        '测试数据准备':     '🧪',
        '异常场景响应码':   '🚨',
        '文档内一致性':     '🔍',
    }

    total = len(results)
    n_pass = sum(1 for r in results if r[0] == 'PASS')
    n_warn = sum(1 for r in results if r[0] == 'WARN')
    n_fail = sum(1 for r in results if r[0] == 'FAIL')

    print()
    print(f'{BOLD}{CYAN}{"═"*62}{RESET}')
    print(f'{BOLD}{CYAN}  接口测试文档准入检查报告{RESET}')
    print(f'{GRAY}  文件：{sys.argv[1]}{RESET}')
    print(f'{BOLD}{CYAN}{"═"*62}{RESET}')

    by_cat = {}
    for r in results:
        by_cat.setdefault(r[1], []).append(r)

    for cat in cat_order:
        if cat not in by_cat:
            continue
        icon = cat_icons.get(cat, '📌')
        print()
        print(f'{BOLD}【{icon} {cat}】{RESET}')
        for status, _, item, detail in by_cat[cat]:
            if status == 'PASS':
                marker = PASS
            elif status == 'WARN':
                marker = WARN
            else:
                marker = FAIL
            print(f'  {marker}  {item}')
            if detail and status != 'PASS':
                for line in detail.split('\n'):
                    print(f'         {GRAY}{line}{RESET}')

    print()
    print(f'{BOLD}{CYAN}{"═"*62}{RESET}')
    score_color = GREEN if n_fail == 0 and n_warn <= 2 else (YELLOW if n_fail == 0 else RED)
    print(f'{BOLD}  总计：{total}项检查  '
          f'{GREEN}{n_pass}通过{RESET}  '
          f'{YELLOW}{n_warn}警告{RESET}  '
          f'{RED}{n_fail}不通过{RESET}')
    print()
    if n_fail == 0 and n_warn == 0:
        print(f'{BOLD}{GREEN}  结论：✅ 全部通过，可以交付给测试！{RESET}')
    elif n_fail == 0:
        print(f'{BOLD}{YELLOW}  结论：⚠️  有{n_warn}项警告，建议处理后再交付。{RESET}')
        print(f'{YELLOW}         警告项不影响主流程测试，但可能导致局部场景无法覆盖。{RESET}')
    else:
        print(f'{BOLD}{RED}  结论：❌ 有{n_fail}项不通过，请补充后再交付！{RESET}')
        print(f'{RED}         不通过项会直接导致测试无法开展或测试数据准备失败。{RESET}')
    print(f'{BOLD}{CYAN}{"═"*62}{RESET}')
    print()


def main():
    if len(sys.argv) < 2:
        print(f'{RED}用法：python3 tools/doc_checker.py <文档路径.docx>{RESET}')
        sys.exit(1)

    path = sys.argv[1]
    if not os.path.exists(path):
        print(f'{RED}文件不存在：{path}{RESET}')
        sys.exit(1)

    if not path.endswith('.docx'):
        print(f'{RED}仅支持 .docx 格式{RESET}')
        sys.exit(1)

    print(f'{GRAY}正在读取文档...{RESET}')
    lines, full = load_text(path)

    check_basic_info(lines, full)
    check_response_format(lines, full)
    check_stub_config(lines, full)
    check_data_tables(lines, full)
    check_test_data(lines, full)
    check_error_scenarios(lines, full)
    check_consistency(lines, full)

    print_report()

    # 返回退出码：有 FAIL 则非0
    n_fail = sum(1 for r in results if r[0] == 'FAIL')
    sys.exit(1 if n_fail > 0 else 0)


if __name__ == '__main__':
    main()
