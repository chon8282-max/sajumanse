# 12절기 정확한 데이터 생성 (Python sxtwl)

## 📋 개요

공공데이터포털 API 복구를 기다리는 대신, **검증된 천문 계산 라이브러리 sxtwl**을 사용하여 1900-2100년 전체 **12절기(입기)** 데이터를 정확하게 생성합니다.

**12절기**: 소한, 입춘, 경칩, 청명, 입하, 망종, 소서, 입추, 백로, 한로, 입동, 대설 (사주명리 월주 계산용)

## 🔬 sxtwl 라이브러리

- **중국/동아시아 음양력·절기 계산** 전문 라이브러리
- 태양 황경, ΔT 보정, 역사적 표준시 등 천문 계산 포함
- 검증된 알고리즘으로 정확한 절기 시각 계산

## 🚀 사용 방법

### 1단계: Python 환경 설정

```bash
# 새 Python Repl 만들기 (또는 기존 환경)
pip install -r requirements.txt
```

### 2단계: 데이터 생성

```bash
# 1900-2100년 전체 데이터 생성 (KST 기준)
python build_calendar_db.py --start 1900 --end 2100 --tz Asia/Seoul
```

**진행 상황:**
```
Year 1900 done. Terms stored: 12
Year 1901 done. Terms stored: 12
...
Year 2100 done. Terms stored: 12
```

### 3단계: 결과 파일

생성된 파일:
- `east_asia_calendar_1900_2100.sqlite` - SQLite DB
- `lunar_calendar_1900_2100.csv` - 양력↔음력 일자별 데이터
- `solar_terms_12_1900_2100.csv` - **12절기 입절 일시 (KST)**

### 4단계: 데이터 검증

```bash
# 샘플 쿼리 실행하여 생성된 DB 확인
python sample_query.py
```

**출력 예시:**
```
✅ 2025년 입춘(立春) 일시:
(2025, '입춘', '2025-02-03T23:10:00+09:00')

✅ 2025년 12절기 (입기):
('소한', '2025-01-05T11:33:00+09:00')
('입춘', '2025-02-03T23:10:00+09:00')
...

✅ 2025년 2월 3일 음력 변환:
('2025-02-03', 2025, 2025, 1, 6, 0, '癸巳', '丁丑', '甲辰')
```

## 📊 CSV 데이터 구조

### solar_terms_12_1900_2100.csv

| 컬럼 | 설명 | 예시 |
|------|------|------|
| year | 연도 | 2024 |
| term_index | 절기 인덱스 (0,2,4...22) | 2 (입춘) |
| term_name_kr | 절기명(한글) | 입춘 |
| term_name_zh | 절기명(한자) | 立春 |
| ecliptic_longitude_deg | 황경(도) | 315.0 |
| utc_time | UTC 시각 | 2024-02-03T16:26:53+00:00 |
| local_time | KST 시각 | 2024-02-04T01:26:53+09:00 |

**12절기 인덱스**: 0(소한), 2(입춘), 4(경칩), 6(청명), 8(입하), 10(망종), 12(소서), 14(입추), 16(백로), 18(한로), 20(입동), 22(대설)

## 📥 PostgreSQL Import

### Node.js Import 스크립트

```typescript
// server/scripts/import-solar-terms-from-csv.ts
import { storage } from '../storage';
import * as fs from 'fs';
import * as csv from 'csv-parser';

async function importFromCSV() {
  const results: any[] = [];
  
  fs.createReadStream('solar_terms_12_1900_2100.csv')
    .pipe(csv())
    .on('data', (row) => results.push(row))
    .on('end', async () => {
      console.log(`📊 총 ${results.length}개 절기 데이터 발견`);
      
      for (const row of results) {
        const utcDate = new Date(row.utc_time);
        const localDate = new Date(row.local_time);
        
        await storage.createSolarTerm({
          year: parseInt(row.year),
          name: row.term_name_kr,
          date: utcDate,
          kstHour: localDate.getHours(),
          kstMinute: localDate.getMinutes(),
          source: 'sxtwl-python'
        });
      }
      
      console.log('✅ Import 완료!');
    });
}
```

실행:
```bash
tsx server/scripts/import-solar-terms-from-csv.ts
```

## 🔍 SQLite 데이터 검증

### Python으로 확인

```bash
python sample_query.py
```

### SQL 직접 쿼리

```sql
-- 2024년 입춘 시각 확인
SELECT * FROM solar_terms_12
WHERE year=2024 AND term_name_kr='입춘';

-- 결과: 2024-02-04 01:26:53 (KST)
```

```sql
-- 2025년 전체 12절기 조회
SELECT term_name_kr, local_time
FROM solar_terms_12
WHERE year=2025
ORDER BY term_index;
```

## 📈 데이터 정확도

- **천문 계산**: 태양 황경 15° 간격 정확 계산
- **시간대 보정**: KST(UTC+9) 자동 변환
- **역사적 표준시**: ΔT 보정 포함
- **검증 범위**: 1900-2100년 (200년)

## 🔄 기존 데이터 교체

```typescript
// 기존 부정확한 근사치 데이터 삭제 후 import
await storage.deleteSolarTermsBySource('approximation');
await importFromCSV();
```

## 📝 12절기 인덱스 (사주명리 월주 계산용)

| Index | 절기 | 황경 | 양력 시기 | 비고 |
|-------|------|------|-----------|------|
| 0 | 소한 | 285° | 1월 5-6일 | 자월(子月) 시작 |
| 2 | **입춘** | 315° | 2월 3-5일 | **인월(寅月) 시작** |
| 4 | 경칩 | 345° | 3월 5-6일 | 묘월(卯月) 시작 |
| 6 | 청명 | 15° | 4월 4-5일 | 진월(辰月) 시작 |
| 8 | 입하 | 45° | 5월 5-6일 | 사월(巳月) 시작 |
| 10 | 망종 | 75° | 6월 5-6일 | 오월(午月) 시작 |
| 12 | 소서 | 105° | 7월 7-8일 | 미월(未月) 시작 |
| 14 | 입추 | 135° | 8월 7-8일 | 신월(申月) 시작 |
| 16 | 백로 | 165° | 9월 7-8일 | 유월(酉月) 시작 |
| 18 | 한로 | 195° | 10월 8-9일 | 술월(戌月) 시작 |
| 20 | 입동 | 225° | 11월 7-8일 | 해월(亥月) 시작 |
| 22 | 대설 | 255° | 12월 7-8일 | 축월(丑月) 시작 |

## 🎯 장점

✅ **API 의존성 제거**: 공공데이터 API 불필요  
✅ **정확한 시간**: 분 단위 정확한 입절 시각  
✅ **200년 범위**: 1900-2100년 전체 커버  
✅ **검증된 알고리즘**: sxtwl 라이브러리 사용  
✅ **오프라인 실행**: 인터넷 없이 생성 가능

## ⚠️ 주의사항 (정확도/관행)

### 시각 오차 가능성
절기 시각은 **천문연산 결과**라서 다음 요인에 따라 **분 단위 오차**가 발생할 수 있습니다:
- 연산 소스(라이브러리) 차이
- ΔT(델타T) 보정 값 차이  
- 시간대 처리 방식 차이

### 공인 연감/관보와의 차이 처리
**100% 초단위 일치**가 필요한 경우 권장 방법:

1. **생성 결과를 표준과 1회 대조**
   - 공인 연감 또는 관보의 절기 시각과 비교
   - 차이가 있는 연도·절기 기록

2. **Patch 테이블 방식**
   ```sql
   CREATE TABLE solar_terms_patch (
     year INTEGER,
     term_index INTEGER,
     corrected_local_time TEXT,
     source TEXT,  -- '기상청_관보', '천문연감' 등
     PRIMARY KEY (year, term_index)
   );
   ```

3. **조회 시 우선순위**
   ```sql
   -- Patch 데이터 우선, 없으면 계산 데이터 사용
   SELECT COALESCE(p.corrected_local_time, s.local_time) AS local_time
   FROM solar_terms_12 s
   LEFT JOIN solar_terms_patch p USING (year, term_index)
   WHERE year=2025 AND term_name_kr='입춘';
   ```

### 로컬연도 기준 저장
현재 스크립트는 절기를 **"로컬연도"에 속한 값만 저장**합니다 (실무에서 보통 이렇게 사용).

예: 2025년 소한(1월 5일 11:33 KST) → 2025년 테이블에 저장

필요시 **UTC-year 기준** 옵션 추가 가능합니다.
