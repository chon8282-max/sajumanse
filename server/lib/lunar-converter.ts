import { createRequire } from 'module';
import { getLunarCalInfo } from './data-gov-kr-service.js';

// Node.js 환경에서 CommonJS 모듈을 사용하기 위한 require 생성
const require = createRequire(import.meta.url);

/**
 * 서버용 양력-음력 변환 함수 (정부 API 우선 사용)
 */
export async function convertSolarToLunarServer(date: Date): Promise<{ year: number; month: number; day: number; isLeapMonth: boolean }> {
  // 1. 먼저 korean-lunar-calendar 라이브러리 사용 (윤달 정보 정확)
  try {
    const KoreanLunarCalendar = require('korean-lunar-calendar');
    
    // 새로운 인스턴스 생성
    const cal = new KoreanLunarCalendar();
    
    // 양력 날짜 설정하면 자동으로 음력 계산됨
    cal.setSolarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
    
    // 음력 정보 가져오기
    const lunarInfo = cal.getLunarCalendar();
    
    console.log(`로컬 라이브러리: 양력 ${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} → 음력 ${lunarInfo.year}-${lunarInfo.month}-${lunarInfo.day} (윤달: ${lunarInfo.intercalation || false})`);
    
    return {
      year: lunarInfo.year,
      month: lunarInfo.month,
      day: lunarInfo.day,
      isLeapMonth: lunarInfo.intercalation || false
    };
    
  } catch (error) {
    console.error('Local lunar conversion error, trying government API:', error);
  }
  
  // 2. 로컬 라이브러리 실패 시 정부 공식 API 시도
  try {
    console.log(`정부 API로 양력 ${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 변환 시도`);
    
    const apiResult = await getLunarCalInfo(date.getFullYear(), date.getMonth() + 1, date.getDate());
    
    // API 응답에서 음력 정보 추출
    const lunarData = apiResult.response?.body?.items?.item;
    if (lunarData) {
      const result = {
        year: parseInt(lunarData.lunYear),
        month: parseInt(lunarData.lunMonth),
        day: parseInt(lunarData.lunDay),
        isLeapMonth: lunarData.lunLeapMonth === "윤"
      };
      
      console.log(`정부 API 성공: 양력 ${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} → 음력 ${result.year}-${result.month}-${result.day} (윤달: ${result.isLeapMonth})`);
      return result;
    }
  } catch (apiError: any) {
    console.log('정부 API 실패:', apiError?.message || apiError);
  }
  
  // 3. 최종 fallback: 입력 날짜 그대로 반환
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    isLeapMonth: false
  };
}

/**
 * 서버용 음력-양력 변환 함수 (정부 API 우선 사용)
 */
export async function convertLunarToSolarServer(year: number, month: number, day: number, isLeapMonth: boolean = false): Promise<Date> {
  // 1. 먼저 정부 공식 API 시도
  try {
    const { getSolarCalInfo } = await import('./data-gov-kr-service.js');
    
    console.log(`정부 API로 음력 ${year}-${month}-${day} (윤달: ${isLeapMonth}) 변환 시도`);
    
    const apiResult = await getSolarCalInfo(year, month, day, isLeapMonth);
    
    // API 응답에서 양력 정보 추출
    const solarData = apiResult.response?.body?.items?.item;
    if (solarData) {
      const solarDate = new Date(
        parseInt(solarData.solYear),
        parseInt(solarData.solMonth) - 1,  // JavaScript Date는 0-based month
        parseInt(solarData.solDay)
      );
      
      console.log(`정부 API 성공: 음력 ${year}-${month}-${day} → 양력 ${solarData.solYear}-${solarData.solMonth}-${solarData.solDay}`);
      return solarDate;
    }
  } catch (apiError: any) {
    console.log('정부 API 실패, 로컬 라이브러리로 fallback:', apiError?.message || apiError);
  }
  
  // 2. 정부 API 실패 시 korean-lunar-calendar 라이브러리 사용
  try {
    const KoreanLunarCalendar = require('korean-lunar-calendar');
    
    // 인스턴스 생성 후 음력 날짜 설정
    const cal = new KoreanLunarCalendar();
    cal.setLunarDate(year, month, day, isLeapMonth);
    
    // 양력 정보 가져오기
    const solarInfo = cal.getSolarCalendar();
    
    console.log(`로컬 라이브러리: 음력 ${year}-${month}-${day} → 양력 ${solarInfo.year}-${solarInfo.month}-${solarInfo.day}`);
    
    return new Date(solarInfo.year, solarInfo.month - 1, solarInfo.day);
    
  } catch (error) {
    console.error('Local lunar to solar conversion error:', error);
    // 최종 fallback: 입력 날짜 그대로 반환 (양력으로 간주)
    console.warn('Using input date as solar date fallback');
    return new Date(year, month - 1, day);
  }
}

