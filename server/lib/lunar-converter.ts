import { storage } from '../storage.js';

/**
 * 서버용 양력-음력 변환 함수 (천문연 DB 데이터 직접 사용)
 */
export async function convertSolarToLunarServer(date: Date): Promise<{ year: number; month: number; day: number; isLeapMonth: boolean }> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  console.log(`[양력→음력] ${year}-${month}-${day} 변환 시도 (천문연 DB)`);
  
  try {
    const data = await storage.getLunarSolarData(year, month, day);
    
    if (data) {
      console.log(`✓ DB 데이터 발견: 양력 ${year}-${month}-${day} → 음력 ${data.lunYear}-${data.lunMonth}-${data.lunDay} (윤달: ${data.lunLeapMonth})`);
      return {
        year: data.lunYear,
        month: data.lunMonth,
        day: data.lunDay,
        isLeapMonth: data.lunLeapMonth === '윤'
      };
    }
    
    console.warn(`⚠ DB에 데이터 없음: ${year}-${month}-${day}`);
  } catch (error) {
    console.error('DB 조회 오류:', error);
  }
  
  // Fallback: 입력 날짜 그대로 반환
  return {
    year,
    month,
    day,
    isLeapMonth: false
  };
}

/**
 * 서버용 음력-양력 변환 함수 (천문연 DB 데이터 직접 사용)
 */
export async function convertLunarToSolarServer(year: number, month: number, day: number, isLeapMonth: boolean = false): Promise<Date> {
  const lunLeapMonth = isLeapMonth ? '윤' : '평';
  
  console.log(`[음력→양력] ${year}-${month}-${day} (${lunLeapMonth}) 변환 시도 (천문연 DB)`);
  
  try {
    const data = await storage.getSolarFromLunar(year, month, day, lunLeapMonth);
    
    if (data) {
      console.log(`✓ DB 데이터 발견: 음력 ${year}-${month}-${day} → 양력 ${data.solYear}-${data.solMonth}-${data.solDay}`);
      return new Date(data.solYear, data.solMonth - 1, data.solDay);
    }
    
    console.warn(`⚠ DB에 데이터 없음: 음력 ${year}-${month}-${day} (${lunLeapMonth})`);
  } catch (error) {
    console.error('DB 조회 오류:', error);
  }
  
  // Fallback: 입력 날짜를 양력으로 간주
  console.warn('입력 날짜를 양력으로 간주하여 반환');
  return new Date(year, month - 1, day);
}
