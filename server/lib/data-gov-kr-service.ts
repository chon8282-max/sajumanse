import { DataGovKrLunarResponse, DataGovKrSolarResponse } from "@shared/schema";
import { parseString } from "xml2js";

// data.go.kr API 기본 설정
const BASE_URL = "http://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService";
const SERVICE_KEY = process.env.DATA_GOV_KR_API_KEY;

if (!SERVICE_KEY) {
  throw new Error("DATA_GOV_KR_API_KEY environment variable is required");
}

// API 공통 요청 함수
async function makeApiRequest(endpoint: string, params: Record<string, string>): Promise<any> {
  const urlParams = new URLSearchParams({
    serviceKey: SERVICE_KEY!,
    dataType: "XML", // XML 형식으로 요청
    ...params
  });

  const url = `${BASE_URL}${endpoint}?${urlParams}`;
  
  try {
    console.log(`Calling data.go.kr API: ${endpoint} with params:`, params);
    
    // AbortController로 2초 타임아웃 설정 (빠른 폴백)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2초 타임아웃
    
    const response = await fetch(url, { 
      signal: controller.signal,
      // 추가 설정으로 네트워크 타임아웃도 단축
      headers: {
        'Connection': 'close'
      }
    });
    
    clearTimeout(timeoutId); // 성공 시 타임아웃 정리
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const xmlData = await response.text();
    
    // XML을 JSON으로 변환
    const jsonData = await new Promise((resolve, reject) => {
      parseString(xmlData, { explicitArray: false }, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
    
    // API 응답 상태 확인
    const apiResponse = jsonData as any;
    if (apiResponse.response?.header?.resultCode !== "00") {
      throw new Error(`API Error: ${apiResponse.response?.header?.resultMsg || "Unknown error"}`);
    }
    
    return jsonData;
  } catch (error) {
    console.error(`data.go.kr API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// 음력일정보 조회 (양력 → 음력 변환)
export async function getLunarCalInfo(solYear: number, solMonth: number, solDay: number): Promise<DataGovKrLunarResponse> {
  const params = {
    solYear: solYear.toString(),
    solMonth: solMonth.toString().padStart(2, '0'),
    solDay: solDay.toString().padStart(2, '0'),
  };
  
  return makeApiRequest("/getLunCalInfo", params);
}

// 양력일정보 조회 (음력 → 양력 변환)
export async function getSolarCalInfo(lunYear: number, lunMonth: number, lunDay: number, lunLeapMonth?: boolean): Promise<DataGovKrSolarResponse> {
  const params: Record<string, string> = {
    lunYear: lunYear.toString(),
    lunMonth: lunMonth.toString().padStart(2, '0'),
    lunDay: lunDay.toString().padStart(2, '0'),
  };
  
  // 윤달 여부 추가 (옵셔널)
  if (lunLeapMonth !== undefined) {
    params.lunLeapMonth = lunLeapMonth ? "윤" : "평";
  }
  
  return makeApiRequest("/getSolCalInfo", params);
}

// 특정음력일정보 조회
export async function getSpecificLunarInfo(lunYear: number, lunMonth: number, lunDay: number): Promise<DataGovKrLunarResponse> {
  const params = {
    lunYear: lunYear.toString(),
    lunMonth: lunMonth.toString().padStart(2, '0'),
    lunDay: lunDay.toString().padStart(2, '0'),
  };
  
  return makeApiRequest("/getLunCalInfo", params);
}

// 율리우스적일정보 조회
export async function getJulianDayInfo(julianDay: number): Promise<any> {
  const params = {
    julianDay: julianDay.toString(),
  };
  
  return makeApiRequest("/getJulianDayInfo", params);
}

// 대량 데이터 수집을 위한 년도별 배치 함수
export async function getLunarDataForYear(year: number): Promise<DataGovKrLunarResponse[]> {
  const results: DataGovKrLunarResponse[] = [];
  
  console.log(`Fetching lunar data for year ${year}...`);
  
  // 각 월의 일수 (평년 기준)
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // 윤년 체크
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  if (isLeapYear) {
    daysInMonth[1] = 29; // 2월을 29일로 설정
  }
  
  for (let month = 1; month <= 12; month++) {
    const maxDay = daysInMonth[month - 1];
    
    for (let day = 1; day <= maxDay; day++) {
      try {
        const data = await getLunarCalInfo(year, month, day);
        results.push(data);
        
        // API 호출 제한을 고려한 딜레이 (초당 5회 제한)
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`Failed to fetch data for ${year}-${month}-${day}:`, error);
        // 실패한 경우 계속 진행
      }
    }
    
    console.log(`Completed month ${month}/${12} for year ${year}`);
  }
  
  console.log(`Completed fetching ${results.length} records for year ${year}`);
  return results;
}

// 대량 데이터 수집을 위한 년도 범위별 배치 함수
export async function getLunarDataForYearRange(startYear: number, endYear: number): Promise<DataGovKrLunarResponse[]> {
  const allResults: DataGovKrLunarResponse[] = [];
  
  console.log(`Starting batch collection from ${startYear} to ${endYear}`);
  
  for (let year = startYear; year <= endYear; year++) {
    try {
      const yearData = await getLunarDataForYear(year);
      allResults.push(...yearData);
      
      console.log(`Progress: ${year - startYear + 1}/${endYear - startYear + 1} years completed`);
      
      // 년도별 긴 딜레이 (API 부하 방지)
      if (year < endYear) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`Failed to fetch data for year ${year}:`, error);
    }
  }
  
  console.log(`Batch collection completed: ${allResults.length} total records`);
  return allResults;
}