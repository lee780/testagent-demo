# 授信额度测算测试用例索引

## 不准入场景 (NA) - 80 个

### user_level = 1 (16 个)
TC_MODEL001_NA_001 ~ TC_MODEL001_NA_016: social_flag=0, balance=-1000/0/100/5000, salary=5000/10000/15000/50000

### user_level = 2 (16 个)  
TC_MODEL001_NA_017 ~ TC_MODEL001_NA_032: social_flag=0, balance=-1000/0/100/5000, salary=5000/10000/15000/50000

### user_level = 3 (16 个)
TC_MODEL001_NA_033 ~ TC_MODEL001_NA_048: social_flag=0, balance=-1000/0/100/5000, salary=5000/10000/15000/50000

### user_level = 4 (16 个)
TC_MODEL001_NA_049 ~ TC_MODEL001_NA_064: social_flag=0, balance=-1000/0/100/5000, salary=5000/10000/15000/50000

### user_level = 5 (16 个)
TC_MODEL001_NA_065 ~ TC_MODEL001_NA_080: social_flag=0, balance=-1000/0/100/5000, salary=5000/10000/15000/50000

---

## 准入但余额≤0场景 (AN) - 30 个

### user_level = 1 (6 个)
TC_MODEL001_AN_081 ~ TC_MODEL001_AN_086: social_flag=1, balance=-5000/-100/0, salary=15000/50000

### user_level = 2 (6 个)
TC_MODEL001_AN_087 ~ TC_MODEL001_AN_092: social_flag=1, balance=-5000/-100/0, salary=15000/50000

### user_level = 3 (6 个)
TC_MODEL001_AN_093 ~ TC_MODEL001_AN_098: social_flag=1, balance=-5000/-100/0, salary=15000/50000

### user_level = 4 (6 个)
TC_MODEL001_AN_099 ~ TC_MODEL001_AN_104: social_flag=1, balance=-5000/-100/0, salary=15000/50000

### user_level = 5 (6 个)
TC_MODEL001_AN_105 ~ TC_MODEL001_AN_110: social_flag=1, balance=-5000/-100/0, salary=15000/50000

---

## 准入且余额>0场景 (AP) - 45 个

### user_level = 1 (15 个)
TC_MODEL001_AP_111 ~ TC_MODEL001_AP_113: balance=100, salary=15000/50000/100000
TC_MODEL001_AP_114 ~ TC_MODEL001_AP_116: balance=5000, salary=15000/50000/100000
TC_MODEL001_AP_117 ~ TC_MODEL001_AP_119: balance=10000, salary=15000/50000/100000

### user_level = 2 (15 个)
TC_MODEL001_AP_120 ~ TC_MODEL001_AP_155: 同上组合

