import { createRequire } from 'module';

// Node.js 환경에서 CommonJS 모듈을 사용하기 위한 require 생성
const require = createRequire(import.meta.url);

/**
 * 서버용 양력-음력 변환 함수
 */
export function convertSolarToLunarServer(date: Date): { year: number; month: number; day: number; isLeapMonth: boolean } {
  try {
    const KoreanLunarCalendar = require('korean-lunar-calendar');
    
    // 새로운 인스턴스 생성
    const cal = new KoreanLunarCalendar();
    
    // 양력 날짜 설정하면 자동으로 음력 계산됨
    cal.setSolarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
    
    // 음력 정보 가져오기
    const lunarInfo = cal.getLunarCalendar();
    
    console.log(`양력 ${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} → 음력 ${lunarInfo.year}-${lunarInfo.month}-${lunarInfo.day}`);
    
    return {
      year: lunarInfo.year,
      month: lunarInfo.month,
      day: lunarInfo.day,
      isLeapMonth: lunarInfo.intercalation || false
    };
    
  } catch (error) {
    console.error('Solar to lunar conversion error:', error);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      isLeapMonth: false
    };
  }
}

/**
 * 서버용 음력-양력 변환 함수
 */
export function convertLunarToSolarServer(year: number, month: number, day: number, isLeapMonth: boolean = false): Date {
  try {
    const KoreanLunarCalendar = require('korean-lunar-calendar');
    
    const result = KoreanLunarCalendar.solarCalendarFromLunarCalendar(year, month, day, isLeapMonth);
    
    if (result && result.solar) {
      return new Date(result.solar.year, result.solar.month - 1, result.solar.day);
    } else {
      // 라이브러리 실패 시 fallback
      console.warn('Korean lunar calendar conversion failed, using fallback');
      return new Date(year, month - 1, day);
    }
  } catch (error) {
    console.error('Lunar to solar conversion error:', error);
    // 라이브러리 실패 시 기본 날짜 반환
    return new Date(year, month - 1, day);
  }
}

