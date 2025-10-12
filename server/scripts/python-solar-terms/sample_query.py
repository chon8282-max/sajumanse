import sqlite3

db = "east_asia_calendar_1900_2100.sqlite"
con = sqlite3.connect(db)

print("✅ 2025년 입춘(立春) 일시:")
for row in con.execute("""
    SELECT year, term_name_kr, local_time
    FROM solar_terms_12
    WHERE term_name_kr='입춘' AND year=2025
"""):
    print(row)

print("\n✅ 2025년 12절기 (입기):")
for row in con.execute("""
    SELECT term_name_kr, local_time
    FROM solar_terms_12
    WHERE year=2025
    ORDER BY term_index
"""):
    print(row)

print("\n✅ 2025년 2월 3일 음력 변환:")
for row in con.execute("""
    SELECT * FROM calendar_days WHERE gregorian_date='2025-02-03'
"""):
    print(row)

print("\n✅ 1900-2100년 입춘 변동 확인 (샘플):")
for row in con.execute("""
    SELECT year, term_name_kr, local_time
    FROM solar_terms_12
    WHERE term_name_kr='입춘' AND year IN (1900, 1950, 2000, 2050, 2100)
    ORDER BY year
"""):
    print(row)

con.close()
print("\n✅ 쿼리 테스트 완료!")
