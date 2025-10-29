-- 일진 데이터를 정확하게 계산하여 채우는 SQL
-- 기준일: 1900.1.1 = 甲戌일 (60갑자 index=10)

WITH constants AS (
  SELECT 
    DATE '1900-01-01' AS base_date,
    10 AS base_index
),
cheongan AS (
  SELECT * FROM (VALUES 
    (0, '甲'), (1, '乙'), (2, '丙'), (3, '丁'), (4, '戊'),
    (5, '己'), (6, '庚'), (7, '辛'), (8, '壬'), (9, '癸')
  ) AS t(idx, char)
),
jiji AS (
  SELECT * FROM (VALUES
    (0, '子'), (1, '丑'), (2, '寅'), (3, '卯'), (4, '辰'), (5, '巳'),
    (6, '午'), (7, '未'), (8, '申'), (9, '酉'), (10, '戌'), (11, '亥')
  ) AS t(idx, char)
)
UPDATE lunar_solar_calendar lsc
SET sol_jeongja = (
  SELECT c.char || j.char
  FROM constants ct
  CROSS JOIN LATERAL (
    SELECT MAKE_DATE(lsc.sol_year, lsc.sol_month, lsc.sol_day) - ct.base_date AS days_diff
  ) diff
  CROSS JOIN LATERAL (
    SELECT MOD((ct.base_index + diff.days_diff)::INT, 60) AS day_index
  ) idx
  INNER JOIN cheongan c ON c.idx = MOD(idx.day_index, 10)
  INNER JOIN jiji j ON j.idx = MOD(idx.day_index, 12)
)
WHERE sol_jeongja IS NULL OR sol_jeongja = '';
