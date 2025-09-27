import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertManseRyeokSchema, insertSajuRecordSchema, insertGroupSchema, insertLunarSolarCalendarSchema, TRADITIONAL_TIME_PERIODS } from "@shared/schema";
import { calculateSaju } from "../client/src/lib/saju-calculator";
import { convertSolarToLunarServer, convertLunarToSolarServer } from "./lib/lunar-converter";
import { 
  getLunarCalInfo, 
  getSolarCalInfo, 
  getLunarDataForYear, 
  getLunarDataForYearRange 
} from "./lib/data-gov-kr-service";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // ========================================
  // 그룹 관련 API 라우트
  // ========================================

  // 그룹 목록 조회
  app.get("/api/groups", async (req, res) => {
    try {
      // 기본 그룹 초기화 확인
      await storage.initializeDefaultGroups();
      
      const groups = await storage.getGroups();
      res.json({
        success: true,
        data: groups
      });
    } catch (error) {
      console.error('Get groups error:', error);
      res.status(500).json({ 
        error: "그룹 목록 조회 중 오류가 발생했습니다." 
      });
    }
  });

  // 새 그룹 생성
  app.post("/api/groups", async (req, res) => {
    try {
      const validatedData = insertGroupSchema.parse(req.body);
      const newGroup = await storage.createGroup(validatedData);
      
      res.json({
        success: true,
        data: newGroup,
        message: "그룹이 성공적으로 생성되었습니다."
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "입력 데이터가 올바르지 않습니다.", 
          details: error.errors 
        });
      }
      console.error('Create group error:', error);
      res.status(500).json({ 
        error: "그룹 생성 중 오류가 발생했습니다." 
      });
    }
  });

  // 그룹 수정
  app.put("/api/groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertGroupSchema.partial().parse(req.body);
      
      const updatedGroup = await storage.updateGroup(id, validatedData);
      
      if (!updatedGroup) {
        return res.status(404).json({ 
          error: "해당 그룹을 찾을 수 없습니다." 
        });
      }

      res.json({
        success: true,
        data: updatedGroup,
        message: "그룹이 성공적으로 수정되었습니다."
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "입력 데이터가 올바르지 않습니다.", 
          details: error.errors 
        });
      }
      console.error('Update group error:', error);
      res.status(500).json({ 
        error: "그룹 수정 중 오류가 발생했습니다." 
      });
    }
  });

  // 그룹 삭제
  app.delete("/api/groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteGroup(id);
      
      if (!success) {
        return res.status(404).json({ 
          error: "해당 그룹을 찾을 수 없거나 기본 그룹은 삭제할 수 없습니다." 
        });
      }

      res.json({
        success: true,
        message: "그룹이 삭제되었습니다."
      });
    } catch (error) {
      console.error('Delete group error:', error);
      res.status(500).json({ 
        error: "그룹 삭제 중 오류가 발생했습니다." 
      });
    }
  });

  // ========================================
  // 사주 기록 관련 API 라우트
  // ========================================

  // 사주 기록 저장
  app.post("/api/saju-records", async (req, res) => {
    try {
      // 입력 데이터 검증
      const validatedData = insertSajuRecordSchema.parse(req.body);
      
      // 사주 기록 저장 (사주팔자는 나중에 계산 후 업데이트)
      const savedRecord = await storage.createSajuRecord(validatedData);

      // 생시가 있고 년월일이 모두 입력된 경우 사주팔자 계산
      if (validatedData.birthTime && validatedData.birthYear && validatedData.birthMonth && validatedData.birthDay) {
        try {
          let hour = 0;
          let minute = 0;
          
          // 전통 시간대 코드인지 확인 (예: "子時")
          const timePeriod = TRADITIONAL_TIME_PERIODS.find(p => p.code === validatedData.birthTime);
          if (timePeriod) {
            // 전통 시간대의 대표 시간 사용
            hour = timePeriod.hour;
            minute = 0;
          } else {
            // 일반 시간 형식 파싱 (예: "22:00" 또는 "오후 10시")
            const timeStr = validatedData.birthTime;
            if (timeStr.includes(':')) {
              hour = parseInt(timeStr.split(':')[0]) || 0;
              minute = parseInt(timeStr.split(':')[1]) || 0;
            } else {
              hour = parseInt(timeStr) || 0;
            }
          }
          
          // 음력 변환 (양력 입력인 경우)
          let lunarConversion = null;
          let sajuCalculationYear = validatedData.birthYear;
          let sajuCalculationMonth = validatedData.birthMonth;
          let sajuCalculationDay = validatedData.birthDay;
          
          if (validatedData.calendarType === "양력") {
            try {
              const birthDate = new Date(validatedData.birthYear, validatedData.birthMonth - 1, validatedData.birthDay);
              lunarConversion = await convertSolarToLunarServer(birthDate);
              console.log(`양력 ${validatedData.birthYear}-${validatedData.birthMonth}-${validatedData.birthDay} → 음력 ${lunarConversion.year}-${lunarConversion.month}-${lunarConversion.day}`);
              
              // 사주 계산은 음력 날짜를 사용
              sajuCalculationYear = lunarConversion.year;
              sajuCalculationMonth = lunarConversion.month;
              sajuCalculationDay = lunarConversion.day;
            } catch (lunarError) {
              console.error('Solar to lunar conversion error:', lunarError);
              // 음력 변환 실패시에도 사주 저장은 계속 진행 (양력으로 계산)
            }
          }

          // 최적화: 로컬 라이브러리만 사용 (즉시 처리)
          let solarCalcYear = validatedData.birthYear;
          let solarCalcMonth = validatedData.birthMonth; 
          let solarCalcDay = validatedData.birthDay;
          
          if (validatedData.calendarType === "음력" || validatedData.calendarType === "윤달") {
            try {
              // 로컬 라이브러리로 즉시 변환 (API 호출 완전 제거)
              const isLeapMonth = validatedData.calendarType === "윤달";
              const solarDate = await convertLunarToSolarServer(sajuCalculationYear, sajuCalculationMonth, sajuCalculationDay, isLeapMonth);
              solarCalcYear = solarDate.getFullYear();
              solarCalcMonth = solarDate.getMonth() + 1;
              solarCalcDay = solarDate.getDate();
              console.log(`⚡ 빠른 변환: 음력 ${sajuCalculationYear}-${sajuCalculationMonth}-${sajuCalculationDay} → 양력 ${solarCalcYear}-${solarCalcMonth}-${solarCalcDay}`);
            } catch (localError) {
              console.error('로컬 변환 실패, 입력 날짜 사용:', localError);
            }
          }

          console.log(`사주 계산 입력값: 음력(년월주)=${sajuCalculationYear}-${sajuCalculationMonth}-${sajuCalculationDay}, 양력(일시주)=${solarCalcYear}-${solarCalcMonth}-${solarCalcDay}, 시=${hour}:${minute}`);
          const sajuResult = calculateSaju(
            sajuCalculationYear,      // 년월주는 음력
            sajuCalculationMonth,
            sajuCalculationDay,
            hour,
            minute,
            validatedData.calendarType === "음력" || validatedData.calendarType === "윤달",
            solarCalcYear && solarCalcMonth && solarCalcDay ? { solarYear: solarCalcYear, solarMonth: solarCalcMonth, solarDay: solarCalcDay } : undefined,  // 일시주용 양력 날짜
            null  // apiData - 로컬 계산만 사용하므로 null
          );
          console.log(`사주 계산 결과: 년주=${sajuResult.year.sky}${sajuResult.year.earth}, 월주=${sajuResult.month.sky}${sajuResult.month.earth}, 일주=${sajuResult.day.sky}${sajuResult.day.earth}, 시주=${sajuResult.hour.sky}${sajuResult.hour.earth}`);

          // 계산된 사주팔자와 음력 정보로 업데이트
          const updateData: any = {
            yearSky: sajuResult.year.sky,
            yearEarth: sajuResult.year.earth,
            monthSky: sajuResult.month.sky,
            monthEarth: sajuResult.month.earth,
            daySky: sajuResult.day.sky,
            dayEarth: sajuResult.day.earth,
            hourSky: sajuResult.hour.sky,
            hourEarth: sajuResult.hour.earth,
            calendarType: validatedData.calendarType  // 원본 달력 타입 보존
          };

          // 음력 정보 저장
          if (validatedData.calendarType === "양력" && lunarConversion) {
            // 양력 입력 시: 변환된 음력 정보 저장
            updateData.lunarYear = lunarConversion.year;
            updateData.lunarMonth = lunarConversion.month;
            updateData.lunarDay = lunarConversion.day;
            updateData.isLeapMonth = lunarConversion.isLeapMonth;
          } else if (validatedData.calendarType === "음력" || validatedData.calendarType === "윤달") {
            // 음력 입력 시: 입력된 음력 정보 그대로 저장하고, 변환된 양력 정보로 birthYear/Month/Day 업데이트
            updateData.lunarYear = validatedData.birthYear;
            updateData.lunarMonth = validatedData.birthMonth;
            updateData.lunarDay = validatedData.birthDay;
            updateData.isLeapMonth = validatedData.calendarType === "윤달";
            // 변환된 양력 정보로 메인 생년월일 필드 업데이트
            updateData.birthYear = solarCalcYear;
            updateData.birthMonth = solarCalcMonth;
            updateData.birthDay = solarCalcDay;
          }

          const updatedRecord = await storage.updateSajuRecord(savedRecord.id, updateData);

          res.json({
            success: true,
            data: {
              record: updatedRecord,
              sajuInfo: sajuResult
            },
            message: "사주 정보가 성공적으로 저장되었습니다."
          });
        } catch (sajuError) {
          console.error('Saju calculation error:', sajuError);
          // 사주 계산 실패시 사용자에게 명확한 오류 메시지 전달
          res.status(500).json({
            success: false,
            error: sajuError instanceof Error ? sajuError.message : '사주팔자 계산 중 오류가 발생했습니다.',
            details: '정확한 사주팔자 계산을 위해 API 연결이 필요합니다. 네트워크 상태를 확인하고 잠시 후 다시 시도해주세요.'
          });
        }
      } else {
        // 생시나 생년월일이 불완전한 경우
        res.json({
          success: true,
          data: { record: savedRecord },
          message: "사주 기본 정보가 저장되었습니다. (생시 정보 불완전으로 사주팔자 미계산)"
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "입력 데이터가 올바르지 않습니다.", 
          details: error.errors 
        });
      }
      console.error('Save saju record error:', error);
      res.status(500).json({ 
        error: "사주 정보 저장 중 오류가 발생했습니다." 
      });
    }
  });

  // 사주 기록 목록 조회 (검색/필터링 지원)
  app.get("/api/saju-records", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const searchText = req.query.search as string;
      const groupId = req.query.groupId as string;
      
      console.log(`사주 기록 조회 요청: limit=${limit}, searchText=${searchText}, groupId=${groupId}`);
      
      const records = await storage.getSajuRecords(limit, searchText, groupId);
      res.json({
        success: true,
        data: records
      });
    } catch (error) {
      console.error('Get saju records error:', error);
      res.status(500).json({ 
        error: "사주 기록 조회 중 오류가 발생했습니다." 
      });
    }
  });

  // 특정 사주 기록 조회
  app.get("/api/saju-records/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const record = await storage.getSajuRecord(id);
      
      if (!record) {
        return res.status(404).json({ 
          error: "해당 사주 기록을 찾을 수 없습니다." 
        });
      }

      res.json({
        success: true,
        data: record
      });
    } catch (error) {
      console.error('Get saju record error:', error);
      res.status(500).json({ 
        error: "사주 기록 조회 중 오류가 발생했습니다." 
      });
    }
  });

  // 사주 기록 업데이트
  app.put("/api/saju-records/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSajuRecordSchema.partial().parse(req.body);
      
      // 기본 업데이트 먼저 수행
      let updatedRecord = await storage.updateSajuRecord(id, validatedData);
      
      if (!updatedRecord) {
        return res.status(404).json({ 
          error: "해당 사주 기록을 찾을 수 없습니다." 
        });
      }

      // 생시와 생년월일이 모두 있고, 달력 타입이 변경된 경우 사주 재계산
      if (validatedData.birthTime && validatedData.birthYear && validatedData.birthMonth && validatedData.birthDay && validatedData.calendarType) {
        try {
          let hour = 0;
          let minute = 0;
          
          // 전통 시간대 코드인지 확인 (예: "子時")
          const timePeriod = TRADITIONAL_TIME_PERIODS.find(p => p.code === validatedData.birthTime);
          if (timePeriod) {
            // 전통 시간대의 대표 시간 사용
            hour = timePeriod.hour;
            minute = 0;
          } else {
            // 일반 시간 형식 파싱 (예: "22:00" 또는 "오후 10시")
            const timeStr = validatedData.birthTime;
            if (timeStr.includes(':')) {
              hour = parseInt(timeStr.split(':')[0]) || 0;
              minute = parseInt(timeStr.split(':')[1]) || 0;
            } else {
              hour = parseInt(timeStr) || 0;
            }
          }
          
          // 음력 변환 (양력 입력인 경우)
          let lunarConversion = null;
          let sajuCalculationYear = validatedData.birthYear;
          let sajuCalculationMonth = validatedData.birthMonth;
          let sajuCalculationDay = validatedData.birthDay;
          
          if (validatedData.calendarType === "양력") {
            try {
              const birthDate = new Date(validatedData.birthYear, validatedData.birthMonth - 1, validatedData.birthDay);
              lunarConversion = await convertSolarToLunarServer(birthDate);
              console.log(`양력 ${validatedData.birthYear}-${validatedData.birthMonth}-${validatedData.birthDay} → 음력 ${lunarConversion.year}-${lunarConversion.month}-${lunarConversion.day}`);
              
              // 사주 계산은 음력 날짜를 사용
              sajuCalculationYear = lunarConversion.year;
              sajuCalculationMonth = lunarConversion.month;
              sajuCalculationDay = lunarConversion.day;
            } catch (lunarError) {
              console.error('Solar to lunar conversion error:', lunarError);
              // 음력 변환 실패시에도 사주 저장은 계속 진행 (양력으로 계산)
            }
          }

          // 최적화: 로컬 라이브러리만 사용 (즉시 처리)
          let solarCalcYear = validatedData.birthYear;
          let solarCalcMonth = validatedData.birthMonth; 
          let solarCalcDay = validatedData.birthDay;
          
          if (validatedData.calendarType === "음력" || validatedData.calendarType === "윤달") {
            try {
              // 로컬 라이브러리로 즉시 변환 (API 호출 완전 제거)
              const isLeapMonth = validatedData.calendarType === "윤달";
              const solarDate = await convertLunarToSolarServer(sajuCalculationYear, sajuCalculationMonth, sajuCalculationDay, isLeapMonth);
              solarCalcYear = solarDate.getFullYear();
              solarCalcMonth = solarDate.getMonth() + 1;
              solarCalcDay = solarDate.getDate();
              console.log(`⚡ 빠른 변환: 음력 ${sajuCalculationYear}-${sajuCalculationMonth}-${sajuCalculationDay} → 양력 ${solarCalcYear}-${solarCalcMonth}-${solarCalcDay}`);
            } catch (localError) {
              console.error('로컬 변환 실패, 입력 날짜 사용:', localError);
            }
          }

          console.log(`사주 계산 입력값: 음력(년월주)=${sajuCalculationYear}-${sajuCalculationMonth}-${sajuCalculationDay}, 양력(일시주)=${solarCalcYear}-${solarCalcMonth}-${solarCalcDay}, 시=${hour}:${minute}`);
          const sajuResult = calculateSaju(
            sajuCalculationYear,      // 년월주는 음력
            sajuCalculationMonth,
            sajuCalculationDay,
            hour,
            minute,
            validatedData.calendarType === "음력" || validatedData.calendarType === "윤달",
            solarCalcYear && solarCalcMonth && solarCalcDay ? { solarYear: solarCalcYear, solarMonth: solarCalcMonth, solarDay: solarCalcDay } : undefined,  // 일시주용 양력 날짜
            null  // apiData - 로컬 계산만 사용하므로 null
          );
          console.log(`사주 계산 결과: 년주=${sajuResult.year.sky}${sajuResult.year.earth}, 월주=${sajuResult.month.sky}${sajuResult.month.earth}, 일주=${sajuResult.day.sky}${sajuResult.day.earth}, 시주=${sajuResult.hour.sky}${sajuResult.hour.earth}`);

          // 계산된 사주팔자와 음력 정보로 업데이트
          const updateData: any = {
            yearSky: sajuResult.year.sky,
            yearEarth: sajuResult.year.earth,
            monthSky: sajuResult.month.sky,
            monthEarth: sajuResult.month.earth,
            daySky: sajuResult.day.sky,
            dayEarth: sajuResult.day.earth,
            hourSky: sajuResult.hour.sky,
            hourEarth: sajuResult.hour.earth,
            calendarType: validatedData.calendarType  // 원본 달력 타입 보존
          };

          // 음력 정보 저장
          if (validatedData.calendarType === "양력" && lunarConversion) {
            // 양력 입력 시: 변환된 음력 정보 저장
            updateData.lunarYear = lunarConversion.year;
            updateData.lunarMonth = lunarConversion.month;
            updateData.lunarDay = lunarConversion.day;
            updateData.isLeapMonth = lunarConversion.isLeapMonth;
          } else if (validatedData.calendarType === "음력" || validatedData.calendarType === "윤달") {
            // 음력 입력 시: 입력된 음력 정보 그대로 저장하고, 변환된 양력 정보로 birthYear/Month/Day 업데이트
            updateData.lunarYear = validatedData.birthYear;
            updateData.lunarMonth = validatedData.birthMonth;
            updateData.lunarDay = validatedData.birthDay;
            updateData.isLeapMonth = validatedData.calendarType === "윤달";
            // 변환된 양력 정보로 메인 생년월일 필드 업데이트
            updateData.birthYear = solarCalcYear;
            updateData.birthMonth = solarCalcMonth;
            updateData.birthDay = solarCalcDay;
          }

          updatedRecord = await storage.updateSajuRecord(id, updateData);

          res.json({
            success: true,
            data: {
              record: updatedRecord,
              sajuInfo: sajuResult
            },
            message: "사주 정보가 성공적으로 업데이트되었습니다."
          });
        } catch (sajuError) {
          console.error('Saju calculation error:', sajuError);
          // 사주 계산 실패시 기본 업데이트 결과 반환
          res.json({
            success: true,
            data: updatedRecord,
            message: "기본 정보만 업데이트되었습니다. (사주 계산 오류)"
          });
        }
      } else {
        // 생시나 생년월일이 없는 경우 기본 업데이트만
        res.json({
          success: true,
          data: updatedRecord,
          message: "사주 기록이 성공적으로 업데이트되었습니다."
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "입력 데이터가 올바르지 않습니다.", 
          details: error.errors 
        });
      }
      console.error('Update saju record error:', error);
      res.status(500).json({ 
        error: "사주 기록 업데이트 중 오류가 발생했습니다." 
      });
    }
  });

  // 사주 기록 삭제
  app.delete("/api/saju-records/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteSajuRecord(id);
      
      if (!success) {
        return res.status(404).json({ 
          error: "해당 사주 기록을 찾을 수 없습니다." 
        });
      }

      res.json({
        success: true,
        message: "사주 기록이 삭제되었습니다."
      });
    } catch (error) {
      console.error('Delete saju record error:', error);
      res.status(500).json({ 
        error: "사주 기록 삭제 중 오류가 발생했습니다." 
      });
    }
  });

  // ========================================
  // 만세력 관련 API 라우트 (기존 호환성)
  // ========================================
  
  // 사주팔자 계산 API (API 간지 정보 활용)
  app.post("/api/saju/calculate", async (req, res) => {
    try {
      const { year, month, day, hour, minute = 0, isLunar } = req.body;
      
      // 입력 검증
      if (!year || !month || !day || hour === undefined) {
        return res.status(400).json({ 
          error: "필수 필드가 누락되었습니다: year, month, day, hour" 
        });
      }

      // isLunar 문자열을 올바르게 불린으로 변환
      const isLunarBool = isLunar === true || isLunar === "true";
      
      let apiData = null;
      let solarDateForCalculation = undefined;
      
      try {
        // 정확한 간지 정보를 위해 data.go.kr API 호출
        if (isLunarBool) {
          // 음력인 경우 양력 변환 + 간지 정보
          const solarInfo = await getSolarCalInfo(parseInt(year), parseInt(month), parseInt(day));
          apiData = solarInfo.response.body.items.item;
          solarDateForCalculation = {
            solarYear: parseInt(apiData.solYear),
            solarMonth: parseInt(apiData.solMonth), 
            solarDay: parseInt(apiData.solDay)
          };
          console.log(`API 음력→양력 변환: ${year}-${month}-${day} → ${apiData.solYear}-${apiData.solMonth}-${apiData.solDay}, 일진: ${apiData.solJeongja}`);
        } else {
          // 양력인 경우 직접 간지 정보 조회
          const lunarInfo = await getLunarCalInfo(parseInt(year), parseInt(month), parseInt(day));
          apiData = lunarInfo.response.body.items.item;
          solarDateForCalculation = {
            solarYear: parseInt(year),
            solarMonth: parseInt(month),
            solarDay: parseInt(day)
          };
          console.log(`API 양력 간지 조회: ${year}-${month}-${day}, 일진: ${apiData.solJeongja}`);
        }
      } catch (apiError) {
        console.error('data.go.kr API 호출 실패:', apiError);
        // API 실패 시 기존 방식으로 폴백
      }
      
      // 사주팔자 계산 (API 데이터 활용)
      const sajuResult = calculateSaju(
        parseInt(year), 
        parseInt(month), 
        parseInt(day), 
        parseInt(hour),
        parseInt(minute) || 0,
        isLunarBool,
        solarDateForCalculation,
        apiData // API 간지 정보 전달
      );

      res.json({
        success: true,
        data: {
          ...sajuResult,
          apiInfo: apiData ? {
            solJeongja: apiData.solJeongja, // 일진 정보
            lunSecha: apiData.lunSecha,     // 년간지 정보  
            lunWolban: apiData.lunWolban    // 요일 정보
          } : null
        }
      });
    } catch (error) {
      console.error('Saju calculation error:', error);
      res.status(500).json({ 
        error: "사주팔자 계산 중 오류가 발생했습니다." 
      });
    }
  });

  // 만세력 데이터 저장
  app.post("/api/manse", async (req, res) => {
    try {
      // 입력 데이터 검증
      const validatedData = insertManseRyeokSchema.parse(req.body);
      
      // 사주팔자 계산
      const sajuResult = calculateSaju(
        validatedData.birthYear,
        validatedData.birthMonth,
        validatedData.birthDay,
        validatedData.birthHour,
        0, // minute 기본값
        validatedData.isLunar === "true"
      );

      // 계산된 사주팔자와 함께 저장
      const savedManse = await storage.createManseRyeok({
        ...validatedData,
        // 계산된 사주팔자 추가
        yearSky: sajuResult.year.sky,
        yearEarth: sajuResult.year.earth,
        monthSky: sajuResult.month.sky,
        monthEarth: sajuResult.month.earth,
        daySky: sajuResult.day.sky,
        dayEarth: sajuResult.day.earth,
        hourSky: sajuResult.hour.sky,
        hourEarth: sajuResult.hour.earth,
      } as any);

      res.json({
        success: true,
        data: {
          id: savedManse.id,
          sajuInfo: sajuResult,
          manseData: savedManse
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "입력 데이터가 올바르지 않습니다.", 
          details: error.errors 
        });
      }
      console.error('Save manse error:', error);
      res.status(500).json({ 
        error: "만세력 데이터 저장 중 오류가 발생했습니다." 
      });
    }
  });

  // ========================================
  // 운세 계산 관련 API 라우트
  // ========================================

  // 정확한 대운수 계산 API
  app.post("/api/fortune/daeun-number", async (req, res) => {
    try {
      const { preciseDaeunNumberRequestSchema } = await import('@shared/schema');
      
      // Zod 스키마를 사용한 입력 검증
      const validatedData = preciseDaeunNumberRequestSchema.parse(req.body);

      const { calculatePreciseDaeunNumber } = await import('../lib/solar-terms-service');
      
      // 정확한 대운수 계산
      const result = await calculatePreciseDaeunNumber(
        new Date(validatedData.birthDate),
        validatedData.gender,
        validatedData.yearSky
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "입력 데이터가 올바르지 않습니다.", 
          details: error.errors 
        });
      }
      console.error('Precise daeun number calculation error:', error);
      res.status(500).json({ 
        error: "대운수 계산 중 오류가 발생했습니다." 
      });
    }
  });

  // 전체 운세 계산 API
  app.post("/api/fortune/calculate", async (req, res) => {
    try {
      const { fortuneCalculateRequestSchema } = await import('@shared/schema');
      
      // Zod 스키마를 사용한 입력 검증
      const validatedData = fortuneCalculateRequestSchema.parse(req.body);

      const { calculateFullFortune } = await import('@shared/fortune-calculator');
      
      // 전체 운세 계산
      const result = calculateFullFortune(
        validatedData.saju,
        new Date(validatedData.birthDate),
        validatedData.gender
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "입력 데이터가 올바르지 않습니다.", 
          details: error.errors 
        });
      }
      console.error('Full fortune calculation error:', error);
      res.status(500).json({ 
        error: "운세 계산 중 오류가 발생했습니다." 
      });
    }
  });

  // 운세 결과 저장 API
  app.post("/api/fortune/save", async (req, res) => {
    try {
      const { fortuneSaveRequestSchema } = await import('@shared/schema');
      
      // Zod 스키마를 사용한 입력 검증
      const validatedData = fortuneSaveRequestSchema.parse(req.body);

      // 운세 결과 저장
      const savedFortune = await storage.saveFortuneResult({
        sajuRecordId: validatedData.sajuRecordId,
        daeunNumber: validatedData.fortuneData.daeunNumber,
        daeunDirection: validatedData.fortuneData.daeunDirection,
        daeunStartAge: validatedData.fortuneData.daeunStartAge,
        daeunList: JSON.stringify(validatedData.fortuneData.daeunList),
        saeunStartYear: validatedData.fortuneData.saeunStartYear,
        calculationDate: validatedData.fortuneData.calculationDate,
        algorithmVersion: validatedData.fortuneData.algorithmVersion
      });

      res.json({
        success: true,
        data: savedFortune
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "입력 데이터가 올바르지 않습니다.", 
          details: error.errors 
        });
      }
      console.error('Fortune save error:', error);
      res.status(500).json({ 
        error: "운세 결과 저장 중 오류가 발생했습니다." 
      });
    }
  });

  // 운세 결과 조회 API
  app.get("/api/fortune/:sajuRecordId", async (req, res) => {
    try {
      const { sajuRecordId } = req.params;
      
      const fortuneResult = await storage.getFortuneResult(sajuRecordId);
      
      if (!fortuneResult) {
        return res.status(404).json({ 
          error: "해당 운세 결과를 찾을 수 없습니다." 
        });
      }

      // JSON 문자열을 파싱하여 반환
      const parsedResult = {
        ...fortuneResult,
        daeunList: JSON.parse(fortuneResult.daeunList || '[]')
      };

      res.json({
        success: true,
        data: parsedResult
      });
    } catch (error) {
      console.error('Fortune retrieval error:', error);
      res.status(500).json({ 
        error: "운세 결과 조회 중 오류가 발생했습니다." 
      });
    }
  });

  // 저장된 만세력 조회
  app.get("/api/manse", async (req, res) => {
    try {
      const manseList = await storage.getManseRyeoksByUser();
      res.json({
        success: true,
        data: manseList
      });
    } catch (error) {
      console.error('Get manse list error:', error);
      res.status(500).json({ 
        error: "만세력 데이터 조회 중 오류가 발생했습니다." 
      });
    }
  });

  // 특정 만세력 조회
  app.get("/api/manse/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const manseData = await storage.getManseRyeok(id);
      
      if (!manseData) {
        return res.status(404).json({ 
          error: "해당 만세력 데이터를 찾을 수 없습니다." 
        });
      }

      res.json({
        success: true,
        data: manseData
      });
    } catch (error) {
      console.error('Get manse error:', error);
      res.status(500).json({ 
        error: "만세력 데이터 조회 중 오류가 발생했습니다." 
      });
    }
  });

  // 만세력 삭제
  app.delete("/api/manse/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteManseRyeok(id);
      
      if (!success) {
        return res.status(404).json({ 
          error: "해당 만세력 데이터를 찾을 수 없습니다." 
        });
      }

      res.json({
        success: true,
        message: "만세력 데이터가 삭제되었습니다."
      });
    } catch (error) {
      console.error('Delete manse error:', error);
      res.status(500).json({ 
        error: "만세력 데이터 삭제 중 오류가 발생했습니다." 
      });
    }
  });

  // ========================================
  // 음양력 변환 API 라우트
  // ========================================

  // 양력 → 음력 변환
  app.post("/api/lunar-solar/convert/lunar", async (req, res) => {
    try {
      const { solYear, solMonth, solDay } = req.body;
      
      if (!solYear || !solMonth || !solDay) {
        return res.status(400).json({ 
          error: "필수 필드가 누락되었습니다: solYear, solMonth, solDay" 
        });
      }

      // 먼저 오프라인 데이터 확인
      const offlineData = await storage.getLunarSolarData(solYear, solMonth, solDay);
      if (offlineData) {
        return res.json({
          success: true,
          source: "offline",
          data: offlineData
        });
      }

      // 오프라인 데이터가 없으면 API 호출
      console.log(`Calling data.go.kr API for ${solYear}-${solMonth}-${solDay}`);
      const apiData = await getLunarCalInfo(solYear, solMonth, solDay);
      
      // API 응답을 데이터베이스 형식으로 변환
      const item = apiData.response.body.items.item;
      const lunarData = {
        solYear: parseInt(item.solYear),
        solMonth: parseInt(item.solMonth),
        solDay: parseInt(item.solDay),
        lunYear: parseInt(item.lunYear),
        lunMonth: parseInt(item.lunMonth),
        lunDay: parseInt(item.lunDay),
        lunLeapMonth: item.lunLeapMonth || null,
        lunWolban: item.lunWolban || null,
        lunSecha: item.lunSecha || null,
        lunGanjea: item.lunGanjea || null,
        lunMonthDayCount: item.lunMonthDayCount ? parseInt(item.lunMonthDayCount) : null,
        solSecha: item.solSecha || null,
        solJeongja: item.solJeongja || null,
        julianDay: item.julianDay ? parseInt(item.julianDay) : null,
      };

      // 데이터베이스에 저장
      const savedData = await storage.createLunarSolarData(lunarData);

      res.json({
        success: true,
        source: "api",
        data: savedData
      });
    } catch (error) {
      console.error('Lunar conversion error:', error);
      res.status(500).json({ 
        error: "음력 변환 중 오류가 발생했습니다." 
      });
    }
  });

  // 음력 → 양력 변환
  app.post("/api/lunar-solar/convert/solar", async (req, res) => {
    try {
      const { lunYear, lunMonth, lunDay, lunLeapMonth } = req.body;
      
      if (!lunYear || !lunMonth || !lunDay) {
        return res.status(400).json({ 
          error: "필수 필드가 누락되었습니다: lunYear, lunMonth, lunDay" 
        });
      }

      console.log(`Calling data.go.kr API for lunar ${lunYear}-${lunMonth}-${lunDay} (leap: ${lunLeapMonth})`);
      const apiData = await getSolarCalInfo(lunYear, lunMonth, lunDay, lunLeapMonth);
      
      const item = apiData.response.body.items.item;
      
      res.json({
        success: true,
        source: "api",
        data: {
          solYear: parseInt(item.solYear),
          solMonth: parseInt(item.solMonth),
          solDay: parseInt(item.solDay),
          lunYear: parseInt(item.lunYear),
          lunMonth: parseInt(item.lunMonth),
          lunDay: parseInt(item.lunDay),
          lunLeapMonth: item.lunLeapMonth,
          lunWolban: item.lunWolban,
          lunSecha: item.lunSecha,
        }
      });
    } catch (error) {
      console.error('Solar conversion error:', error);
      res.status(500).json({ 
        error: "양력 변환 중 오류가 발생했습니다." 
      });
    }
  });

  // 특정 년도 배치 데이터 수집
  app.post("/api/lunar-solar/batch/year", async (req, res) => {
    try {
      const { year } = req.body;
      
      if (!year) {
        return res.status(400).json({ 
          error: "필수 필드가 누락되었습니다: year" 
        });
      }

      // 이미 데이터가 있는지 확인
      const exists = await storage.checkDataExists(year);
      if (exists) {
        return res.json({
          success: true,
          message: `${year}년 데이터가 이미 존재합니다.`,
          skipped: true
        });
      }

      console.log(`Starting batch collection for year ${year}...`);
      
      // API에서 년도별 데이터 수집
      const apiResults = await getLunarDataForYear(year);
      
      // 데이터베이스 형식으로 변환
      const dataToSave = apiResults.map(result => {
        const item = result.response.body.items.item;
        return {
          solYear: parseInt(item.solYear),
          solMonth: parseInt(item.solMonth),
          solDay: parseInt(item.solDay),
          lunYear: parseInt(item.lunYear),
          lunMonth: parseInt(item.lunMonth),
          lunDay: parseInt(item.lunDay),
          lunLeapMonth: item.lunLeapMonth || null,
          lunWolban: item.lunWolban || null,
          lunSecha: item.lunSecha || null,
          lunGanjea: item.lunGanjea || null,
          lunMonthDayCount: item.lunMonthDayCount ? parseInt(item.lunMonthDayCount) : null,
          solSecha: item.solSecha || null,
          solJeongja: item.solJeongja || null,
          julianDay: item.julianDay ? parseInt(item.julianDay) : null,
        };
      });

      // 대량 저장
      const savedData = await storage.bulkCreateLunarSolarData(dataToSave);

      res.json({
        success: true,
        message: `${year}년 데이터 ${savedData.length}건이 성공적으로 저장되었습니다.`,
        year: year,
        count: savedData.length
      });
    } catch (error) {
      console.error('Batch year collection error:', error);
      res.status(500).json({ 
        error: "년도별 데이터 수집 중 오류가 발생했습니다." 
      });
    }
  });

  // 년도 범위 배치 데이터 수집
  app.post("/api/lunar-solar/batch/range", async (req, res) => {
    try {
      const { startYear, endYear } = req.body;
      
      if (!startYear || !endYear) {
        return res.status(400).json({ 
          error: "필수 필드가 누락되었습니다: startYear, endYear" 
        });
      }

      if (endYear - startYear > 10) {
        return res.status(400).json({ 
          error: "한 번에 최대 10년치 데이터만 수집할 수 있습니다." 
        });
      }

      console.log(`Starting batch collection from ${startYear} to ${endYear}...`);
      
      // API에서 년도 범위 데이터 수집
      const apiResults = await getLunarDataForYearRange(startYear, endYear);
      
      // 데이터베이스 형식으로 변환
      const dataToSave = apiResults.map(result => {
        const item = result.response.body.items.item;
        return {
          solYear: parseInt(item.solYear),
          solMonth: parseInt(item.solMonth),
          solDay: parseInt(item.solDay),
          lunYear: parseInt(item.lunYear),
          lunMonth: parseInt(item.lunMonth),
          lunDay: parseInt(item.lunDay),
          lunLeapMonth: item.lunLeapMonth || null,
          lunWolban: item.lunWolban || null,
          lunSecha: item.lunSecha || null,
          lunGanjea: item.lunGanjea || null,
          lunMonthDayCount: item.lunMonthDayCount ? parseInt(item.lunMonthDayCount) : null,
          solSecha: item.solSecha || null,
          solJeongja: item.solJeongja || null,
          julianDay: item.julianDay ? parseInt(item.julianDay) : null,
        };
      });

      // 대량 저장
      const savedData = await storage.bulkCreateLunarSolarData(dataToSave);

      res.json({
        success: true,
        message: `${startYear}-${endYear}년 데이터 ${savedData.length}건이 성공적으로 저장되었습니다.`,
        startYear,
        endYear,
        count: savedData.length
      });
    } catch (error) {
      console.error('Batch range collection error:', error);
      res.status(500).json({ 
        error: "년도 범위 데이터 수집 중 오류가 발생했습니다." 
      });
    }
  });

  // 특정 년도 데이터 존재 확인
  app.get("/api/lunar-solar/check/:year", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      
      if (!year || year < 1000 || year > 3000) {
        return res.status(400).json({ 
          error: "올바른 년도를 입력해주세요 (1000-3000)" 
        });
      }

      const exists = await storage.checkDataExists(year);
      
      res.json({
        success: true,
        year,
        exists
      });
    } catch (error) {
      console.error('Check data existence error:', error);
      res.status(500).json({ 
        error: "데이터 확인 중 오류가 발생했습니다." 
      });
    }
  });

  // 오프라인 데이터 조회
  app.get("/api/lunar-solar/offline/:year/:month/:day", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const day = parseInt(req.params.day);
      
      if (!year || !month || !day) {
        return res.status(400).json({ 
          error: "올바른 날짜를 입력해주세요" 
        });
      }

      const data = await storage.getLunarSolarData(year, month, day);
      
      if (!data) {
        return res.status(404).json({ 
          error: "해당 날짜의 오프라인 데이터를 찾을 수 없습니다." 
        });
      }

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Offline data retrieval error:', error);
      res.status(500).json({ 
        error: "오프라인 데이터 조회 중 오류가 발생했습니다." 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
