# -*- coding: utf-8 -*-
import sqlite3, pandas as pd

DB = "east_asia_calendar_1900_2100.sqlite"

con = sqlite3.connect(DB)

print("=== 샘플1: 1963년 2월(양력) → 음력 매핑 10건 ===")
q1 = """
SELECT greg_year, greg_month, greg_day, lunar_year, lunar_month, lunar_day, is_leap_month
FROM lunar_calendar
WHERE greg_year=1963 AND greg_month=2
LIMIT 10
"""
print(pd.read_sql(q1, con))

print("\n=== 샘플2: 1963년 24절기 ===")
q2 = """
SELECT year, term_index, ecliptic_longitude_deg, utc_time
FROM solar_terms_24
WHERE year=1963
ORDER BY term_index
"""
print(pd.read_sql(q2, con))

con.close()
print("\nOK")
