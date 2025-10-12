# 24절기 데이터 수집 가이드

## 📋 개요

정확한 24절기 데이터를 수집하여 DB에 저장하는 2가지 방법을 제공합니다.

## 🚨 현재 상황

- **공공데이터포털 API**: 서버 화재로 서비스 중단 (2025년 기준)
- **현재 데이터**: 근사치 계산 사용 중 (부정확, 예: 1983년 입하 4-25 → 실제 5-6)
- **해결 방법**: ✅ Python sxtwl 라이브러리 (천문 계산) 또는 API 복구 대기

---

## 🎯 방법 선택 가이드

### 방법 A: Python sxtwl (✅ **권장**)
- ✅ **즉시 사용 가능** (API 복구 불필요)
- ✅ **천문 계산**: 태양 황경, ΔT 보정 등 정확한 계산
- ✅ **시간 정보**: 분 단위 정확한 입절 시각
- ✅ **200년 범위**: 1900-2100년 전체 커버
- 📂 위치: `server/scripts/python-solar-terms/`

### 방법 B: 공공데이터포털 API
- ⏳ API 복구 대기 필요
- ⚠️ 시간 정보 미제공 (날짜만)
- 📂 위치: `server/scripts/collect-all-solar-terms.ts`

---

## 🐍 방법 A: Python sxtwl로 정확한 데이터 생성 (권장)

### 1단계: Python 환경 준비

```bash
cd server/scripts/python-solar-terms/
pip install -r requirements.txt
```

### 2단계: CSV 데이터 생성

```bash
python build_calendar_db.py --start 1900 --end 2100 --tz Asia/Seoul
```

**결과 파일:**
- `solar_terms_24_1900_2100.csv` - 24절기 입절 일시 (KST)
- `east_asia_calendar_1900_2100.sqlite` - SQLite DB
- `lunar_calendar_1900_2100.csv` - 양력↔음력 데이터

### 3단계: PostgreSQL로 Import

```bash
# CSV를 현재 디렉토리로 복사
cp solar_terms_24_1900_2100.csv ../../

# Node.js import 스크립트 실행
tsx server/scripts/import-solar-terms-from-csv.ts solar_terms_24_1900_2100.csv
```

**Import 결과:**
```
✅ Import 완료!
   총 저장: 4,800개
   교체됨: 2,400개 (근사치→sxtwl)
   출처: sxtwl-python (천문 계산 라이브러리)
```

### 데이터 정확도
- ✅ **천문 계산**: 태양 황경 15° 간격
- ✅ **시간 정보**: 분 단위 정확한 입절 시각 (예: 2024-02-04 01:26:53 KST)
- ✅ **ΔT 보정**: 역사적 시간 보정 포함
- ✅ **검증 범위**: 1900-2100년

### CSV 데이터 구조
```csv
year,term_index,term_name_kr,term_name_zh,ecliptic_longitude_deg,utc_time,local_time
2024,2,입춘,立春,315.0,2024-02-03T16:26:53+00:00,2024-02-04T01:26:53+09:00
```

---

## 🌐 방법 B: 공공데이터포털 API (복구 후)

## 🔍 1단계: API 상태 확인

API가 복구되었는지 확인:

```bash
tsx server/scripts/check-api-status.ts
```

**성공 시 출력:**
```
✅ API 정상 작동 중!
   테스트: 2024년 절기 24개 수신
   예시: 입춘 (20240204)

🚀 전체 데이터 수집을 시작할 수 있습니다.
```

**실패 시 출력:**
```
❌ API 아직 복구 안됨
   오류: HTTP error! status: 503

⏳ API 복구를 기다려주세요.
```

## 🚀 2단계: 전체 데이터 수집

API 복구 확인 후 실행:

```bash
tsx server/scripts/collect-all-solar-terms.ts
```

**수집 범위:**
- 1900년 ~ 2100년 (200년)
- 연도당 24절기 = 총 4,800개 절기 데이터

**처리 방식:**
- 10년 단위 배치 처리
- 각 배치 후 1초 대기 (API 부하 방지)
- 기존 근사치 데이터는 자동으로 API 데이터로 교체

**예상 소요 시간:**
- 약 20-30분 (API 응답 속도에 따라 변동)

## 📊 수집 결과 예시

```
🚀 공공데이터포털 API 전체 절기 데이터 수집 시작

📅 1900~1909년 처리 중...
📅 1910~1919년 처리 중...
...
📅 2090~2099년 처리 중...
📅 2100년 처리 중...

✅ 전체 수집 완료!
   총 수집: 4,800개
   교체됨: 2,400개

⚠️ 실패한 연도 (10개):
   1900, 1901, 1902... (API 미지원 연도)
```

## ⚙️ 기술 상세

### 데이터 소스 우선순위

1. **공공데이터포털 API** (최우선)
   - 정확한 날짜 정보
   - 시간 정보 미제공 (0시 0분 기본값)

2. **holidays.dist.be API** (2006-2025년)
   - 정확한 날짜 + 시간
   - 이미 수집 완료 (456개)

3. **근사치 계산** (최후 수단)
   - 부정확함
   - API 데이터로 교체 필요

### 데이터 저장 방식

- **UTC 시간 저장**: KST 시간 - 9시간
- **중복 처리**: 연도 + 절기명으로 기존 데이터 덮어쓰기
- **출처 표시**: `source` 필드로 데이터 출처 기록
  - `data.go.kr`: 공공데이터포털
  - `holidays.dist.be`: holidays API  
  - `approximation`: 근사치 계산

## 🔄 주기적 업데이트

매년 새로운 절기 데이터 추가:

```bash
# 특정 연도만 수집 (스크립트 수정 필요)
tsx server/scripts/collect-all-solar-terms.ts
```

## 🐛 문제 해결

### API 호출 실패

```
❌ API 아직 복구 안됨
```
→ API 복구 대기 또는 관리자 문의

### 일부 연도 실패

```
⚠️ 실패한 연도: 1900, 1901...
```
→ 정상 (API 미지원 연도, 근사치 데이터 유지)

### DB 연결 오류

```
❌ Database connection failed
```
→ DATABASE_URL 환경변수 확인
