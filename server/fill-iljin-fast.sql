-- 일진 데이터를 계산하여 채우는 SQL
-- 기준일: 1900.1.1 = 甲戌일 (60갑자 index=10)

UPDATE lunar_solar_calendar
SET sol_jeongja = (
  SELECT 
    CASE ((10 + (sol_year * 365 + sol_month * 30 + sol_day - (1900 * 365 + 1 * 30 + 1))) % 60) % 10
      WHEN 0 THEN '甲'
      WHEN 1 THEN '乙'
      WHEN 2 THEN '丙'
      WHEN 3 THEN '丁'
      WHEN 4 THEN '戊'
      WHEN 5 THEN '己'
      WHEN 6 THEN '庚'
      WHEN 7 THEN '辛'
      WHEN 8 THEN '壬'
      WHEN 9 THEN '癸'
    END ||
    CASE ((10 + (sol_year * 365 + sol_month * 30 + sol_day - (1900 * 365 + 1 * 30 + 1))) % 60) % 12
      WHEN 0 THEN '子'
      WHEN 1 THEN '丑'
      WHEN 2 THEN '寅'
      WHEN 3 THEN '卯'
      WHEN 4 THEN '辰'
      WHEN 5 THEN '巳'
      WHEN 6 THEN '午'
      WHEN 7 THEN '未'
      WHEN 8 THEN '申'
      WHEN 9 THEN '酉'
      WHEN 10 THEN '戌'
      WHEN 11 THEN '亥'
    END
)
WHERE sol_jeongja IS NULL OR sol_jeongja = '';
