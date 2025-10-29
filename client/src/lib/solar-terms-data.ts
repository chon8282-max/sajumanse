// 절기 데이터 타입
interface SolarTerm {
  year: number;
  name: string;
  date: string; // ISO string (UTC)
  kst_hour: number;
  kst_minute: number;
  source: string;
}

// 절기 데이터 캐시
let solarTermsCache: SolarTerm[] | null = null;
let loadPromise: Promise<SolarTerm[]> | null = null;

/**
 * 절기 데이터 로드 (한 번만 로드하고 캐시)
 */
export async function loadSolarTerms(): Promise<SolarTerm[]> {
  if (solarTermsCache) {
    return solarTermsCache;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = fetch('/data/solar-terms.json')
    .then(res => res.json())
    .then(data => {
      solarTermsCache = data;
      return data;
    });

  return loadPromise;
}

/**
 * 특정 연도의 절기 데이터 가져오기
 */
export async function getSolarTermsForYear(year: number): Promise<SolarTerm[]> {
  const allTerms = await loadSolarTerms();
  return allTerms.filter(term => term.year === year);
}

/**
 * 특정 날짜가 절입일인지 확인 (KST 기준)
 */
export async function checkSolarTermDay(
  year: number,
  month: number,
  day: number
): Promise<{ isSolarTerm: boolean; termInfo?: { name: string; hour: number; minute: number } }> {
  try {
    const solarTerms = await getSolarTermsForYear(year);

    for (const term of solarTerms) {
      // UTC date에 9시간(KST offset)을 더해서 KST 날짜 계산
      const termDateUTC = new Date(term.date);
      const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
      const termDateKST = new Date(termDateUTC.getTime() + kstOffset);

      // KST 날짜 추출
      const kstYear = termDateKST.getUTCFullYear();
      const kstMonth = termDateKST.getUTCMonth() + 1;
      const kstDay = termDateKST.getUTCDate();

      // 입력 날짜와 절입일 KST 날짜가 정확히 일치하는지 확인
      if (kstYear === year && kstMonth === month && kstDay === day) {
        return {
          isSolarTerm: true,
          termInfo: {
            name: term.name,
            hour: term.kst_hour,
            minute: term.kst_minute,
          },
        };
      }
    }

    return { isSolarTerm: false };
  } catch (error) {
    console.error('절입일 체크 중 오류:', error);
    return { isSolarTerm: false };
  }
}

/**
 * calculateSaju에서 사용할 형식으로 절기 데이터 변환
 */
export async function getSolarTermsForCalculation(year: number): Promise<
  Array<{
    name: string;
    date: Date;
    month: number;
  }>
> {
  const terms = await getSolarTermsForYear(year);

  return terms.map((term) => {
    const termDate = new Date(term.date);
    const kstOffset = 9 * 60 * 60 * 1000;
    const termDateKST = new Date(termDate.getTime() + kstOffset);

    return {
      name: term.name,
      date: termDateKST,
      month: getSolarTermMonth(term.name),
    };
  });
}

/**
 * 절기 이름으로 월주 인덱스 가져오기
 */
function getSolarTermMonth(termName: string): number {
  const termMonthMap: Record<string, number> = {
    입춘: 0, 경칩: 1, 청명: 2, 입하: 3, 망종: 4, 소서: 5,
    입추: 6, 백로: 7, 한로: 8, 입동: 9, 대설: 10, 소한: 11,
  };
  return termMonthMap[termName] ?? -1;
}
