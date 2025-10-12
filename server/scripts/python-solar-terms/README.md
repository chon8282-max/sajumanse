# 24절기 정확한 데이터 생성 (Python sxtwl)

## 📋 개요

공공데이터포털 API 복구를 기다리는 대신, **검증된 천문 계산 라이브러리 sxtwl**을 사용하여 1900-2100년 전체 24절기 데이터를 정확하게 생성합니다.

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
Year 1900 done. Terms stored: 24
Year 1901 done. Terms stored: 24
...
Year 2100 done. Terms stored: 24
```

### 3단계: 결과 파일

생성된 파일:
- `east_asia_calendar_1900_2100.sqlite` - SQLite DB
- `lunar_calendar_1900_2100.csv` - 양력↔음력 일자별 데이터
- `solar_terms_24_1900_2100.csv` - **24절기 입절 일시 (KST)**

## 📊 CSV 데이터 구조

### solar_terms_24_1900_2100.csv

| 컬럼 | 설명 | 예시 |
|------|------|------|
| year | 연도 | 2024 |
| term_index | 절기 인덱스 (0-23) | 2 (입춘) |
| term_name_kr | 절기명(한글) | 입춘 |
| term_name_zh | 절기명(한자) | 立春 |
| ecliptic_longitude_deg | 황경(도) | 315.0 |
| utc_time | UTC 시각 | 2024-02-03T16:26:53+00:00 |
| local_time | KST 시각 | 2024-02-04T01:26:53+09:00 |

## 📥 PostgreSQL Import

### Node.js Import 스크립트

```typescript
// server/scripts/import-solar-terms-from-csv.ts
import { storage } from '../storage';
import * as fs from 'fs';
import * as csv from 'csv-parser';

async function importFromCSV() {
  const results: any[] = [];
  
  fs.createReadStream('solar_terms_24_1900_2100.csv')
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

## 🔍 데이터 검증

### 특정 연도 절기 확인

```sql
-- 2024년 입춘 시각 확인
SELECT * FROM solar_terms_24 
WHERE year=2024 AND term_name_kr='입춘';

-- 결과: 2024-02-04 01:26:53 (KST)
```

### 12절기(중기)만 필터링

```sql
-- 홀수 인덱스 = 중기 (우수, 춘분, 곡우...)
SELECT * FROM solar_terms_24
WHERE year=2025 AND (term_index % 2)=1
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

## 📝 24절기 인덱스

| Index | 절기 | 황경 | 양력 시기 |
|-------|------|------|-----------|
| 0 | 소한 | 285° | 1월 5-6일 |
| 1 | 대한 | 300° | 1월 20-21일 |
| 2 | **입춘** | 315° | 2월 3-5일 |
| 3 | 우수 | 330° | 2월 18-19일 |
| ... | ... | ... | ... |
| 23 | 동지 | 270° | 12월 21-22일 |

## 🎯 장점

✅ **API 의존성 제거**: 공공데이터 API 불필요  
✅ **정확한 시간**: 분 단위 정확한 입절 시각  
✅ **200년 범위**: 1900-2100년 전체 커버  
✅ **검증된 알고리즘**: sxtwl 라이브러리 사용  
✅ **오프라인 실행**: 인터넷 없이 생성 가능
