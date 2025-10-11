import type { Express } from "express";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertManseRyeokSchema, insertSajuRecordSchema, insertGroupSchema, insertLunarSolarCalendarSchema, insertAnnouncementSchema, TRADITIONAL_TIME_PERIODS } from "@shared/schema";
import { calculateSaju } from "../client/src/lib/saju-calculator";
import { convertSolarToLunarServer, convertLunarToSolarServer } from "./lib/lunar-converter";
import { 
  getLunarCalInfo, 
  getSolarCalInfo, 
  getLunarDataForYear, 
  getLunarDataForYearRange 
} from "./lib/data-gov-kr-service";
import { getSolarTermsForYear } from "./lib/solar-terms-service";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<void> {
  
  // ========================================
  // 인증 API 라우트
  // ========================================
  const authRouter = (await import('./auth')).default;
  app.use("/api/auth", authRouter);
  
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

      // 년월일이 모두 입력된 경우 음력 변환 시도 (생시 유무와 상관없이)
      if (validatedData.birthYear && validatedData.birthMonth && validatedData.birthDay) {
        try {
          // 음력 변환 (양력 입력인 경우)
          let lunarConversion = null;
          let sajuCalculationYear = validatedData.birthYear;
          let sajuCalculationMonth = validatedData.birthMonth;
          let sajuCalculationDay = validatedData.birthDay;
          
          if (validatedData.calendarType === "양력" || validatedData.calendarType === "ganji") {
            try {
              const birthDate = new Date(validatedData.birthYear, validatedData.birthMonth - 1, validatedData.birthDay);
              lunarConversion = await convertSolarToLunarServer(birthDate);
              console.log(`${validatedData.calendarType} → 양력 ${validatedData.birthYear}-${validatedData.birthMonth}-${validatedData.birthDay} → 음력 ${lunarConversion.year}-${lunarConversion.month}-${lunarConversion.day}`);
              
              // 사주 계산은 음력 날짜를 사용 (ganji는 제외 - 이미 간지로 계산됨)
              if (validatedData.calendarType === "양력") {
                sajuCalculationYear = lunarConversion.year;
                sajuCalculationMonth = lunarConversion.month;
                sajuCalculationDay = lunarConversion.day;
              }
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

          // 음력 정보 저장을 위한 기본 updateData 준비
          const updateData: any = {
            calendarType: validatedData.calendarType  // 원본 달력 타입 보존
          };

          // 음력 정보 저장
          if ((validatedData.calendarType === "양력" || validatedData.calendarType === "ganji") && lunarConversion) {
            // 양력/ganji 입력 시: 변환된 음력 정보 저장
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

          // 사주팔자 계산 (생시 유무와 관계없이 실행)
          try {
            let hour: number | undefined = undefined;
            let minute = 0;
            
            // 생시가 있는 경우에만 시간 파싱
            if (validatedData.birthTime) {
              // 전통 시간대 코드인지 확인 (예: "子時")
              const timePeriod = TRADITIONAL_TIME_PERIODS.find(p => p.code === validatedData.birthTime);
              if (timePeriod) {
                // 전통 시간대의 대표 시간 사용
                hour = timePeriod.hour;
                // 야자시는 23:31부터 시작하므로 minute을 31로 설정
                minute = timePeriod.code === "夜子時" ? 31 : 0;
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
            }

            console.log(`사주 계산 입력값: 음력(년월주)=${sajuCalculationYear}-${sajuCalculationMonth}-${sajuCalculationDay}, 양력(일시주)=${solarCalcYear}-${solarCalcMonth}-${solarCalcDay}, 시=${hour}:${minute}, 전월간지=${validatedData.usePreviousMonthPillar || false}`);
            const sajuResult = calculateSaju(
              sajuCalculationYear,      // 년월주는 음력
              sajuCalculationMonth,
              sajuCalculationDay,
              hour as any,  // undefined일 수 있음
              minute,
              validatedData.calendarType === "음력" || validatedData.calendarType === "윤달",
              solarCalcYear && solarCalcMonth && solarCalcDay ? { solarYear: solarCalcYear, solarMonth: solarCalcMonth, solarDay: solarCalcDay } : undefined,  // 일시주용 양력 날짜
              null,  // apiData - 로컬 계산만 사용하므로 null
              validatedData.usePreviousMonthPillar // 절입일 전월 간지 적용 여부
            );
            console.log(`사주 계산 결과: 년주=${sajuResult.year.sky}${sajuResult.year.earth}, 월주=${sajuResult.month.sky}${sajuResult.month.earth}, 일주=${sajuResult.day.sky}${sajuResult.day.earth}, 시주=${sajuResult.hour.sky}${sajuResult.hour.earth}`);

            // 사주팔자 정보 추가
            updateData.yearSky = sajuResult.year.sky;
            updateData.yearEarth = sajuResult.year.earth;
            updateData.monthSky = sajuResult.month.sky;
            updateData.monthEarth = sajuResult.month.earth;
            updateData.daySky = sajuResult.day.sky;
            updateData.dayEarth = sajuResult.day.earth;
            updateData.hourSky = sajuResult.hour.sky;
            updateData.hourEarth = sajuResult.hour.earth;

            const updatedRecord = await storage.updateSajuRecord(savedRecord.id, updateData);

            res.json({
              success: true,
              data: {
                record: updatedRecord,
                sajuInfo: sajuResult
              },
              message: validatedData.birthTime ? "사주 정보가 성공적으로 저장되었습니다." : "사주 정보가 저장되었습니다. (생시 미상)"
            });
          } catch (sajuError) {
            console.error('Saju calculation error:', sajuError);
            // 사주 계산 실패시에도 음력 정보는 저장
            const updatedRecord = await storage.updateSajuRecord(savedRecord.id, updateData);
            res.status(500).json({
              success: false,
              error: sajuError instanceof Error ? sajuError.message : '사주팔자 계산 중 오류가 발생했습니다.',
              details: '정확한 사주팔자 계산을 위해 API 연결이 필요합니다. 네트워크 상태를 확인하고 잠시 후 다시 시도해주세요.',
              data: { record: updatedRecord }
            });
          }
        } catch (conversionError) {
          console.error('Date conversion error:', conversionError);
          // 음력 변환 실패시에도 기본 정보는 저장됨
          res.json({
            success: true,
            data: { record: savedRecord },
            message: "사주 기본 정보가 저장되었습니다. (음력 변환 실패)"
          });
        }
      } else {
        // 생년월일이 불완전한 경우
        res.json({
          success: true,
          data: { record: savedRecord },
          message: "사주 기본 정보가 저장되었습니다. (생년월일 정보 불완전)"
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

      // 년월일이 변경된 경우 음력 변환 및 사주 재계산 (달력 타입은 기존 레코드에서 가져옴)
      if (validatedData.birthYear || validatedData.birthMonth || validatedData.birthDay) {
        // 기존 레코드 정보와 병합
        const finalYear = validatedData.birthYear || updatedRecord.birthYear;
        const finalMonth = validatedData.birthMonth || updatedRecord.birthMonth || 1;
        const finalDay = validatedData.birthDay || updatedRecord.birthDay || 1;
        const finalCalendarType = validatedData.calendarType || updatedRecord.calendarType;
        
        if (finalCalendarType) {
        try {
          // 음력 변환 (양력 입력인 경우)
          let lunarConversion = null;
          let sajuCalculationYear = finalYear;
          let sajuCalculationMonth = finalMonth;
          let sajuCalculationDay = finalDay;
          
          if (finalCalendarType === "양력" || finalCalendarType === "ganji") {
            try {
              const birthDate = new Date(finalYear, finalMonth - 1, finalDay);
              lunarConversion = await convertSolarToLunarServer(birthDate);
              console.log(`${finalCalendarType} → 양력 ${finalYear}-${finalMonth}-${finalDay} → 음력 ${lunarConversion.year}-${lunarConversion.month}-${lunarConversion.day}`);
              
              // 사주 계산은 음력 날짜를 사용 (ganji는 제외 - 이미 간지로 계산됨)
              if (finalCalendarType === "양력") {
                sajuCalculationYear = lunarConversion.year;
                sajuCalculationMonth = lunarConversion.month;
                sajuCalculationDay = lunarConversion.day;
              }
            } catch (lunarError) {
              console.error('Solar to lunar conversion error:', lunarError);
              // 음력 변환 실패시에도 사주 저장은 계속 진행 (양력으로 계산)
            }
          }

          // 최적화: 로컬 라이브러리만 사용 (즉시 처리)
          let solarCalcYear = finalYear;
          let solarCalcMonth = finalMonth; 
          let solarCalcDay = finalDay;
          
          if (finalCalendarType === "음력" || finalCalendarType === "윤달") {
            try {
              // 로컬 라이브러리로 즉시 변환 (API 호출 완전 제거)
              const isLeapMonth = finalCalendarType === "윤달";
              const solarDate = await convertLunarToSolarServer(sajuCalculationYear, sajuCalculationMonth, sajuCalculationDay, isLeapMonth);
              solarCalcYear = solarDate.getFullYear();
              solarCalcMonth = solarDate.getMonth() + 1;
              solarCalcDay = solarDate.getDate();
              console.log(`⚡ 빠른 변환: 음력 ${sajuCalculationYear}-${sajuCalculationMonth}-${sajuCalculationDay} → 양력 ${solarCalcYear}-${solarCalcMonth}-${solarCalcDay}`);
            } catch (localError) {
              console.error('로컬 변환 실패, 입력 날짜 사용:', localError);
            }
          }

          // 음력 정보 저장을 위한 기본 updateData 준비
          const updateData: any = {};

          // 음력 정보 저장
          if ((finalCalendarType === "양력" || finalCalendarType === "ganji") && lunarConversion) {
            // 양력/ganji 입력 시: 변환된 음력 정보 저장
            updateData.lunarYear = lunarConversion.year;
            updateData.lunarMonth = lunarConversion.month;
            updateData.lunarDay = lunarConversion.day;
            updateData.isLeapMonth = lunarConversion.isLeapMonth;
          } else if (finalCalendarType === "음력" || finalCalendarType === "윤달") {
            // 음력 입력 시: 입력된 음력 정보 그대로 저장하고, 변환된 양력 정보로 birthYear/Month/Day 업데이트
            updateData.lunarYear = finalYear;
            updateData.lunarMonth = finalMonth;
            updateData.lunarDay = finalDay;
            updateData.isLeapMonth = finalCalendarType === "윤달";
            // 변환된 양력 정보로 메인 생년월일 필드 업데이트
            updateData.birthYear = solarCalcYear;
            updateData.birthMonth = solarCalcMonth;
            updateData.birthDay = solarCalcDay;
          }

          // 생시가 있는 경우 사주팔자 계산 (validatedData 또는 기존 레코드에서)
          const finalBirthTime = validatedData.birthTime || updatedRecord.birthTime;
          if (finalBirthTime) {
            try {
              let hour = 0;
              let minute = 0;
              
              // 전통 시간대 코드인지 확인 (예: "子時")
              const timePeriod = TRADITIONAL_TIME_PERIODS.find(p => p.code === finalBirthTime);
              if (timePeriod) {
                // 전통 시간대의 대표 시간 사용
                hour = timePeriod.hour;
                minute = 0;
              } else {
                // 일반 시간 형식 파싱 (예: "22:00" 또는 "오후 10시")
                const timeStr = finalBirthTime;
                if (timeStr.includes(':')) {
                  hour = parseInt(timeStr.split(':')[0]) || 0;
                  minute = parseInt(timeStr.split(':')[1]) || 0;
                } else {
                  hour = parseInt(timeStr) || 0;
                }
              }

              const finalUsePreviousMonthPillar = validatedData.usePreviousMonthPillar ?? false;
              console.log(`사주 계산 입력값: 음력(년월주)=${sajuCalculationYear}-${sajuCalculationMonth}-${sajuCalculationDay}, 양력(일시주)=${solarCalcYear}-${solarCalcMonth}-${solarCalcDay}, 시=${hour}:${minute}`);
              const sajuResult = calculateSaju(
                sajuCalculationYear,      // 년월주는 음력
                sajuCalculationMonth,
                sajuCalculationDay,
                hour,
                minute,
                finalCalendarType === "음력" || finalCalendarType === "윤달",
                solarCalcYear && solarCalcMonth && solarCalcDay ? { solarYear: solarCalcYear, solarMonth: solarCalcMonth, solarDay: solarCalcDay } : undefined,  // 일시주용 양력 날짜
                null,  // apiData - 로컬 계산만 사용하므로 null
                finalUsePreviousMonthPillar // 절입일 전월 간지 적용 여부
              );
              console.log(`사주 계산 결과: 년주=${sajuResult.year.sky}${sajuResult.year.earth}, 월주=${sajuResult.month.sky}${sajuResult.month.earth}, 일주=${sajuResult.day.sky}${sajuResult.day.earth}, 시주=${sajuResult.hour.sky}${sajuResult.hour.earth}`);

              // 사주팔자 정보 추가
              updateData.yearSky = sajuResult.year.sky;
              updateData.yearEarth = sajuResult.year.earth;
              updateData.monthSky = sajuResult.month.sky;
              updateData.monthEarth = sajuResult.month.earth;
              updateData.daySky = sajuResult.day.sky;
              updateData.dayEarth = sajuResult.day.earth;
              updateData.hourSky = sajuResult.hour.sky;
              updateData.hourEarth = sajuResult.hour.earth;

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
              // 사주 계산 실패시에도 음력 정보는 저장
              updatedRecord = await storage.updateSajuRecord(id, updateData);
              res.json({
                success: true,
                data: updatedRecord,
                message: "기본 정보 및 음력 정보만 업데이트되었습니다. (사주 계산 오류)"
              });
            }
          } else {
            // 생시가 없는 경우: 음력 정보만 저장
            updatedRecord = await storage.updateSajuRecord(id, updateData);
            res.json({
              success: true,
              data: updatedRecord,
              message: "사주 기본 정보 및 음력 정보가 업데이트되었습니다. (생시 정보 없음으로 사주팔자 미계산)"
            });
          }
        } catch (conversionError) {
          console.error('Date conversion error:', conversionError);
          // 음력 변환 실패시에도 기본 업데이트 결과 반환
          res.json({
            success: true,
            data: updatedRecord,
            message: "기본 정보만 업데이트되었습니다. (음력 변환 실패)"
          });
        }
        } else {
          // finalCalendarType이 없는 경우 (달력 타입이 누락됨)
          res.json({
            success: true,
            data: updatedRecord,
            message: "기본 정보만 업데이트되었습니다. (달력 타입 정보 없음)"
          });
        }
      } else if (validatedData.birthTime) {
        // 생시만 변경하는 경우: 기존 레코드 정보를 사용해서 사주 재계산
        try {
          let hour = 0;
          let minute = 0;
          
          const timePeriod = TRADITIONAL_TIME_PERIODS.find(p => p.code === validatedData.birthTime);
          if (timePeriod) {
            hour = timePeriod.hour;
            minute = 0;
          } else {
            const timeStr = validatedData.birthTime;
            if (timeStr.includes(':')) {
              hour = parseInt(timeStr.split(':')[0]) || 0;
              minute = parseInt(timeStr.split(':')[1]) || 0;
            } else {
              hour = parseInt(timeStr) || 0;
            }
          }

          // 사주 계산을 위한 날짜 정보 (음력 우선, 없으면 양력)
          let sajuCalculationYear = updatedRecord.lunarYear || updatedRecord.birthYear;
          let sajuCalculationMonth = (updatedRecord.lunarMonth || updatedRecord.birthMonth) || 1;
          let sajuCalculationDay = (updatedRecord.lunarDay || updatedRecord.birthDay) || 1;
          
          const sajuResult = calculateSaju(
            sajuCalculationYear,
            sajuCalculationMonth,
            sajuCalculationDay,
            hour,
            minute,
            updatedRecord.calendarType === "음력" || updatedRecord.calendarType === "윤달",
            { solarYear: updatedRecord.birthYear, solarMonth: updatedRecord.birthMonth || 1, solarDay: updatedRecord.birthDay || 1 },
            null,
            false
          );

          const updateData = {
            yearSky: sajuResult.year.sky,
            yearEarth: sajuResult.year.earth,
            monthSky: sajuResult.month.sky,
            monthEarth: sajuResult.month.earth,
            daySky: sajuResult.day.sky,
            dayEarth: sajuResult.day.earth,
            hourSky: sajuResult.hour.sky,
            hourEarth: sajuResult.hour.earth
          };

          updatedRecord = await storage.updateSajuRecord(id, updateData);

          res.json({
            success: true,
            data: {
              record: updatedRecord,
              sajuInfo: sajuResult
            },
            message: "생시 및 사주 정보가 성공적으로 업데이트되었습니다."
          });
        } catch (sajuError) {
          console.error('Saju calculation error for birthTime only update:', sajuError);
          res.json({
            success: true,
            data: updatedRecord,
            message: "생시만 업데이트되었습니다. (사주 계산 오류)"
          });
        }
      } else {
        // 그 외의 경우 기본 업데이트만
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
      console.log('삭제 요청 받음 - ID:', id);
      const success = await storage.deleteSajuRecord(id);
      console.log('삭제 결과:', success);
      
      if (!success) {
        console.log('삭제 실패 - 기록 찾을 수 없음');
        return res.status(404).json({ 
          success: false,
          error: "해당 사주 기록을 찾을 수 없습니다." 
        });
      }

      console.log('삭제 성공!');
      res.json({
        success: true,
        message: "사주 기록이 삭제되었습니다."
      });
    } catch (error) {
      console.error('Delete saju record error:', error);
      res.status(500).json({ 
        success: false,
        error: "사주 기록 삭제 중 오류가 발생했습니다." 
      });
    }
  });

  // 사주 기록 부분 업데이트 (생시, 생년월일 변경 등)
  app.patch("/api/saju-records/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { birthTime, birthYear, birthMonth, birthDay } = req.body;
      
      // 기존 레코드 조회
      const existingRecord = await storage.getSajuRecord(id);
      if (!existingRecord) {
        return res.status(404).json({ 
          error: "해당 사주 기록을 찾을 수 없습니다." 
        });
      }

      // 업데이트할 데이터 준비
      const updateData: any = {};
      
      // 생시 업데이트인 경우
      if (birthTime !== undefined) {
        // 생시 검증
        if (typeof birthTime !== 'string' || birthTime.trim() === '') {
          return res.status(400).json({ 
            error: "유효한 생시를 입력해주세요." 
          });
        }

        // 전통 시간대 코드 검증
        const validTimePeriod = TRADITIONAL_TIME_PERIODS.find(p => p.code === birthTime);
        if (!validTimePeriod) {
          return res.status(400).json({ 
            error: "유효하지 않은 시간대 코드입니다." 
          });
        }
        
        updateData.birthTime = birthTime;
      }
      
      // 생년월일 업데이트인 경우
      if (birthYear !== undefined || birthMonth !== undefined || birthDay !== undefined) {
        // 년월일 검증
        if (birthYear !== undefined) {
          if (typeof birthYear !== 'number' || birthYear < 1900 || birthYear > 2100) {
            return res.status(400).json({ 
              error: "유효한 생년을 입력해주세요 (1900-2100)." 
            });
          }
          updateData.birthYear = birthYear;
        }
        
        if (birthMonth !== undefined) {
          if (typeof birthMonth !== 'number' || birthMonth < 1 || birthMonth > 12) {
            return res.status(400).json({ 
              error: "유효한 월을 입력해주세요 (1-12)." 
            });
          }
          updateData.birthMonth = birthMonth;
        }
        
        if (birthDay !== undefined) {
          if (typeof birthDay !== 'number' || birthDay < 1 || birthDay > 31) {
            return res.status(400).json({ 
              error: "유효한 일을 입력해주세요 (1-31)." 
            });
          }
          updateData.birthDay = birthDay;
        }
      }
      
      // 업데이트할 데이터가 없으면 에러
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ 
          error: "업데이트할 데이터가 없습니다." 
        });
      }

      // 사주 재계산이 필요한 경우 (생시 또는 생년월일 변경)
      const finalBirthYear = updateData.birthYear || existingRecord.birthYear;
      const finalBirthMonth = updateData.birthMonth || existingRecord.birthMonth;
      const finalBirthDay = updateData.birthDay || existingRecord.birthDay;
      const finalBirthTime = updateData.birthTime || existingRecord.birthTime;
      
      if (finalBirthYear && finalBirthMonth && finalBirthDay) {
        try {
          // 시간 계산
          let hour = 0;
          if (finalBirthTime) {
            const timePeriod = TRADITIONAL_TIME_PERIODS.find(p => p.code === finalBirthTime);
            if (timePeriod) {
              hour = timePeriod.hour;
            } else {
              const timeStr = finalBirthTime;
              if (timeStr.includes(':')) {
                hour = parseInt(timeStr.split(':')[0]) || 0;
              } else {
                hour = parseInt(timeStr) || 0;
              }
            }
          }

          // 음력 변환이 필요한 경우 처리
          let sajuCalculationYear = finalBirthYear;
          let sajuCalculationMonth = finalBirthMonth;
          let sajuCalculationDay = finalBirthDay;
          let isLunar = false;
          
          // 기존에 음력 정보가 있거나, 새로 생년월일이 업데이트된 경우 양력→음력 변환
          if (existingRecord.calendarType === 'lunar' || (birthYear !== undefined || birthMonth !== undefined || birthDay !== undefined)) {
            if (existingRecord.calendarType === 'lunar') {
              // 기존이 음력인 경우
              isLunar = true;
              sajuCalculationYear = existingRecord.lunarYear || finalBirthYear;
              sajuCalculationMonth = existingRecord.lunarMonth || finalBirthMonth;
              sajuCalculationDay = existingRecord.lunarDay || finalBirthDay;
            } else {
              // 양력인 경우 음력으로 변환
              const Solar = require('lunar-javascript').Solar;
              const solar = Solar.fromYmd(finalBirthYear, finalBirthMonth, finalBirthDay);
              const lunar = solar.getLunar();
              
              updateData.lunarYear = lunar.getYear();
              updateData.lunarMonth = lunar.getMonth();
              updateData.lunarDay = lunar.getDay();
              
              sajuCalculationYear = lunar.getYear();
              sajuCalculationMonth = lunar.getMonth();
              sajuCalculationDay = lunar.getDay();
              isLunar = true;
            }
          }
          
          const sajuResult = calculateSaju(
            sajuCalculationYear,
            sajuCalculationMonth,
            sajuCalculationDay,
            hour,
            0, // minute
            isLunar,
            {
              solarYear: finalBirthYear,
              solarMonth: finalBirthMonth,
              solarDay: finalBirthDay
            },
            null // apiData
          );

          // 사주팔자 정보 추가
          updateData.yearSky = sajuResult.year.sky;
          updateData.yearEarth = sajuResult.year.earth;
          updateData.monthSky = sajuResult.month.sky;
          updateData.monthEarth = sajuResult.month.earth;
          updateData.daySky = sajuResult.day.sky;
          updateData.dayEarth = sajuResult.day.earth;
          updateData.hourSky = sajuResult.hour.sky;
          updateData.hourEarth = sajuResult.hour.earth;

        } catch (sajuError) {
          console.error('Saju calculation error during update:', sajuError);
        }
      }

      const updatedRecord = await storage.updateSajuRecord(id, updateData);
      
      const message = birthTime !== undefined && (birthYear !== undefined || birthMonth !== undefined || birthDay !== undefined)
        ? "생시와 생년월일이 성공적으로 변경되었습니다."
        : birthTime !== undefined
        ? "생시가 성공적으로 변경되었습니다."
        : "생년월일이 성공적으로 변경되었습니다.";
      
      res.json({
        success: true,
        data: updatedRecord,
        message
      });
    } catch (error) {
      console.error('Patch saju record error:', error);
      res.status(500).json({ 
        error: "사주 기록 업데이트 중 오류가 발생했습니다." 
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

  // 정확한 대운수 계산 API (현재 미구현)
  // app.post("/api/fortune/daeun-number", async (req, res) => {
  //   try {
  //     const { preciseDaeunNumberRequestSchema } = await import('@shared/schema');
  //     
  //     // Zod 스키마를 사용한 입력 검증
  //     const validatedData = preciseDaeunNumberRequestSchema.parse(req.body);

  //     const { calculatePreciseDaeunNumber } = await import('./lib/solar-terms-service');
  //     
  //     // 정확한 대운수 계산
  //     const result = await calculatePreciseDaeunNumber(
  //       new Date(validatedData.birthDate),
  //       validatedData.gender,
  //       validatedData.yearSky
  //     );

  //     res.json({
  //       success: true,
  //       data: result
  //     });
  //   } catch (error) {
  //     if (error instanceof z.ZodError) {
  //       return res.status(400).json({ 
  //         error: "입력 데이터가 올바르지 않습니다.", 
  //         details: error.errors 
  //       });
  //     }
  //     console.error('Precise daeun number calculation error:', error);
  //     res.status(500).json({ 
  //       error: "대운수 계산 중 오류가 발생했습니다." 
  //     });
  //   }
  // });

  // 전체 운세 계산 API
  app.post("/api/fortune/calculate", async (req, res) => {
    try {
      const { fortuneCalculateRequestSchema } = await import('@shared/schema');
      
      // Zod 스키마를 사용한 입력 검증
      const validatedData = fortuneCalculateRequestSchema.parse(req.body);

      const { calculateFullFortune } = await import('@shared/fortune-calculator');
      
      // 전체 운세 계산
      const result = calculateFullFortune(
        validatedData.saju as any,
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
        calculationDate: new Date(validatedData.fortuneData.calculationDate),
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

      // convertSolarToLunarServer 함수 사용 (fallback 로직 포함)
      console.log(`Converting solar to lunar: ${solYear}-${solMonth}-${solDay}`);
      const solarDate = new Date(solYear, solMonth - 1, solDay);
      const lunarResult = await convertSolarToLunarServer(solarDate);
      
      // 결과를 데이터베이스 형식으로 변환
      const lunarData = {
        solYear: solYear,
        solMonth: solMonth,
        solDay: solDay,
        lunYear: lunarResult.year,
        lunMonth: lunarResult.month,
        lunDay: lunarResult.day,
        lunLeapMonth: lunarResult.isLeapMonth ? "윤" : null,
        lunWolban: null,
        lunSecha: null,
        lunGanjea: null,
        lunMonthDayCount: null,
        solSecha: null,
        solJeongja: null,
        julianDay: null,
      };

      // 데이터베이스에 저장
      const savedData = await storage.createLunarSolarData(lunarData);

      res.json({
        success: true,
        source: "converted",
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
      const { lunYear, lunMonth, lunDay, isLeapMonth } = req.body;
      
      if (!lunYear || !lunMonth || !lunDay) {
        return res.status(400).json({ 
          error: "필수 필드가 누락되었습니다: lunYear, lunMonth, lunDay" 
        });
      }

      // 로컬 라이브러리로 변환 (async 함수이므로 await 필요)
      const localResultDate = await convertLunarToSolarServer(
        lunYear,
        lunMonth,
        lunDay,
        isLeapMonth || false
      );

      if (!localResultDate) {
        throw new Error('음력→양력 변환 실패');
      }

      res.json({
        success: true,
        source: "local",
        data: {
          solYear: localResultDate.getFullYear(),
          solMonth: localResultDate.getMonth() + 1,  // 0-based to 1-based
          solDay: localResultDate.getDate(),
          lunYear: lunYear,
          lunMonth: lunMonth,
          lunDay: lunDay,
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

  // ========================================
  // 절기 관련 API 라우트
  // ========================================

  // 특정 년도의 절기 정보 조회
  app.get("/api/solar-terms/:year", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      
      if (!year || year < 1900 || year > 2100) {
        return res.status(400).json({ 
          error: "올바른 년도를 입력해주세요 (1900-2100)" 
        });
      }

      console.log(`Fetching solar terms for year: ${year}`);
      const solarTerms = await getSolarTermsForYear(year);
      
      res.json({
        success: true,
        data: solarTerms,
        year: year
      });
    } catch (error) {
      console.error('Solar terms retrieval error:', error);
      res.status(500).json({ 
        error: "절기 정보 조회 중 오류가 발생했습니다." 
      });
    }
  });

  // 특정 월의 절기 정보 조회
  app.get("/api/solar-terms/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (!year || !month || year < 1900 || year > 2100 || month < 1 || month > 12) {
        return res.status(400).json({ 
          error: "올바른 년도와 월을 입력해주세요 (년도: 1900-2100, 월: 1-12)" 
        });
      }

      console.log(`Fetching solar terms for ${year}-${month}`);
      const allSolarTerms = await getSolarTermsForYear(year);
      
      // 해당 월의 절기들 필터링 (해당 월에 시작하는 절기들)
      const monthSolarTerms = allSolarTerms.filter(term => {
        const termMonth = term.date.getMonth() + 1;
        return termMonth === month;
      });
      
      res.json({
        success: true,
        data: monthSolarTerms,
        year: year,
        month: month
      });
    } catch (error) {
      console.error('Monthly solar terms retrieval error:', error);
      res.status(500).json({ 
        error: "월별 절기 정보 조회 중 오류가 발생했습니다." 
      });
    }
  });

  // ========================================
  // 백업/복원 API 라우트
  // ========================================

  // 전체 데이터 백업 (Export)
  app.get("/api/backup/export", async (req, res) => {
    try {
      console.log("Exporting all data...");
      const data = await storage.exportAllData();
      
      // JSON 파일로 다운로드
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=saju-backup-${data.exportDate.split('T')[0]}.json`);
      res.json(data);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ 
        error: "데이터 백업 중 오류가 발생했습니다." 
      });
    }
  });

  // 전체 데이터 복원 (Import)
  app.post("/api/backup/import", async (req, res) => {
    try {
      console.log("Importing data...");
      const data = req.body;
      
      // 기본 데이터 유효성 검증
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ 
          error: "올바른 백업 데이터를 제공해주세요." 
        });
      }

      // 백업 파일 구조 검증
      if (!data.version || !data.exportDate) {
        return res.status(400).json({ 
          error: "올바른 백업 파일 형식이 아닙니다." 
        });
      }

      // 배열 타입 검증
      if (data.sajuRecords && !Array.isArray(data.sajuRecords)) {
        return res.status(400).json({ 
          error: "사주 기록 데이터 형식이 올바르지 않습니다." 
        });
      }

      if (data.groups && !Array.isArray(data.groups)) {
        return res.status(400).json({ 
          error: "그룹 데이터 형식이 올바르지 않습니다." 
        });
      }

      if (data.fortuneResults && !Array.isArray(data.fortuneResults)) {
        return res.status(400).json({ 
          error: "운세 결과 데이터 형식이 올바르지 않습니다." 
        });
      }

      const result = await storage.importAllData(data);
      
      res.json({
        success: true,
        imported: result.imported,
        sajuRecordsCount: result.sajuRecordsCount,
        groupsCount: result.groupsCount,
        fortuneResultsCount: result.fortuneResultsCount,
        errors: result.errors,
        message: `${result.sajuRecordsCount}개의 사주 기록을 성공적으로 복원했습니다.`
      });
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "데이터 복원 중 오류가 발생했습니다." 
      });
    }
  });

  // Google Drive 백업 업로드
  app.post("/api/backup/drive/upload", async (req: any, res) => {
    try {
      const userId = req.signedCookies.userId;
      
      if (!userId) {
        return res.status(401).json({ 
          error: "로그인이 필요합니다." 
        });
      }

      const data = await storage.exportAllData();
      const fileName = `saju-backup-${data.exportDate.split('T')[0]}.json`;
      const fileContent = JSON.stringify(data, null, 2);

      const { uploadBackupToDrive } = await import('./google-drive');
      const result = await uploadBackupToDrive(userId, fileName, fileContent);
      
      res.json({
        success: true,
        fileId: result.id,
        fileName: result.name,
        message: "Google Drive에 백업되었습니다."
      });
    } catch (error: any) {
      console.error('Google Drive upload error:', error);
      
      if (error.message === "AUTH_EXPIRED") {
        return res.status(401).json({ 
          error: "인증 만료",
          code: "AUTH_EXPIRED"
        });
      }
      
      res.status(500).json({ 
        error: "Google Drive 백업 중 오류가 발생했습니다." 
      });
    }
  });

  // Google Drive 백업 목록 조회
  app.post("/api/backup/drive/list", async (req: any, res) => {
    try {
      const userId = req.signedCookies.userId;
      
      if (!userId) {
        return res.status(401).json({ 
          error: "로그인이 필요합니다." 
        });
      }

      const { listBackupsFromDrive } = await import('./google-drive');
      const files = await listBackupsFromDrive(userId);
      
      res.json({
        success: true,
        files: files
      });
    } catch (error: any) {
      console.error('Google Drive list error:', error);
      
      if (error.message === "AUTH_EXPIRED") {
        return res.status(401).json({ 
          error: "인증 만료",
          code: "AUTH_EXPIRED"
        });
      }
      
      res.status(500).json({ 
        error: "Google Drive 목록 조회 중 오류가 발생했습니다." 
      });
    }
  });

  // Google Drive 백업 다운로드
  app.post("/api/backup/drive/download", async (req: any, res) => {
    try {
      const userId = req.signedCookies.userId;
      
      if (!userId) {
        return res.status(401).json({ 
          error: "로그인이 필요합니다." 
        });
      }

      const { fileId } = req.body;
      
      if (!fileId || typeof fileId !== 'string' || fileId.length === 0) {
        return res.status(400).json({ 
          error: "유효한 파일 ID가 필요합니다." 
        });
      }

      const { downloadBackupFromDrive } = await import('./google-drive');
      const data = await downloadBackupFromDrive(userId, fileId);
      
      res.json({
        success: true,
        data: data
      });
    } catch (error: any) {
      console.error('Google Drive download error:', error);
      
      if (error.message === "AUTH_EXPIRED") {
        return res.status(401).json({ 
          error: "인증 만료",
          code: "AUTH_EXPIRED"
        });
      }
      
      res.status(500).json({ 
        error: "Google Drive 다운로드 중 오류가 발생했습니다." 
      });
    }
  });

  // ========================================
  // 공지사항 API 라우트
  // ========================================

  // 공지사항 목록 조회
  app.get("/api/announcements", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const announcements = await storage.getAnnouncements(limit);
      
      res.json({
        success: true,
        data: announcements
      });
    } catch (error) {
      console.error('Get announcements error:', error);
      res.status(500).json({ 
        error: "공지사항 목록 조회 중 오류가 발생했습니다." 
      });
    }
  });

  // 특정 공지사항 조회
  app.get("/api/announcements/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const announcement = await storage.getAnnouncement(id);
      
      if (!announcement) {
        return res.status(404).json({ 
          error: "해당 공지사항을 찾을 수 없습니다." 
        });
      }

      res.json({
        success: true,
        data: announcement
      });
    } catch (error) {
      console.error('Get announcement error:', error);
      res.status(500).json({ 
        error: "공지사항 조회 중 오류가 발생했습니다." 
      });
    }
  });

  // 새 공지사항 작성 (마스터 전용)
  app.post("/api/announcements", async (req, res) => {
    try {
      const validatedData = insertAnnouncementSchema.parse(req.body);
      
      // 마스터 권한 확인 (authorId로 사용자 조회)
      const author = await storage.getUser(validatedData.authorId);
      if (!author || !author.isMaster) {
        return res.status(403).json({ 
          error: "공지사항 작성 권한이 없습니다." 
        });
      }

      const newAnnouncement = await storage.createAnnouncement(validatedData);
      
      res.json({
        success: true,
        data: newAnnouncement,
        message: "공지사항이 성공적으로 작성되었습니다."
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "입력 데이터가 올바르지 않습니다.", 
          details: error.errors 
        });
      }
      console.error('Create announcement error:', error);
      res.status(500).json({ 
        error: "공지사항 작성 중 오류가 발생했습니다." 
      });
    }
  });

  // 공지사항 수정 (마스터 전용)
  app.put("/api/announcements/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertAnnouncementSchema.partial().parse(req.body);
      
      // 기존 공지사항 조회
      const existing = await storage.getAnnouncement(id);
      if (!existing) {
        return res.status(404).json({ 
          error: "해당 공지사항을 찾을 수 없습니다." 
        });
      }

      // 마스터 권한 확인
      const author = await storage.getUser(existing.authorId);
      if (!author || !author.isMaster) {
        return res.status(403).json({ 
          error: "공지사항 수정 권한이 없습니다." 
        });
      }

      const updatedAnnouncement = await storage.updateAnnouncement(id, updateData);
      
      res.json({
        success: true,
        data: updatedAnnouncement,
        message: "공지사항이 성공적으로 수정되었습니다."
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "입력 데이터가 올바르지 않습니다.", 
          details: error.errors 
        });
      }
      console.error('Update announcement error:', error);
      res.status(500).json({ 
        error: "공지사항 수정 중 오류가 발생했습니다." 
      });
    }
  });

  // 공지사항 삭제 (마스터 전용)
  app.delete("/api/announcements/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // 기존 공지사항 조회
      const existing = await storage.getAnnouncement(id);
      if (!existing) {
        return res.status(404).json({ 
          error: "해당 공지사항을 찾을 수 없습니다." 
        });
      }

      // 마스터 권한 확인
      const author = await storage.getUser(existing.authorId);
      if (!author || !author.isMaster) {
        return res.status(403).json({ 
          error: "공지사항 삭제 권한이 없습니다." 
        });
      }

      const success = await storage.deleteAnnouncement(id);
      
      if (!success) {
        return res.status(404).json({ 
          error: "공지사항 삭제에 실패했습니다." 
        });
      }

      res.json({
        success: true,
        message: "공지사항이 삭제되었습니다."
      });
    } catch (error) {
      console.error('Delete announcement error:', error);
      res.status(500).json({ 
        error: "공지사항 삭제 중 오류가 발생했습니다." 
      });
    }
  });


  // ========================================
  // 테스트 엔드포인트 - API 응답 구조 확인
  // ========================================
  
  app.get("/api/test/lunar-api/:year/:month/:day", async (req, res) => {
    try {
      const { year, month, day } = req.params;
      
      console.log(`\n========== API 응답 구조 확인 ==========`);
      console.log(`날짜: ${year}-${month}-${day}`);
      
      const apiResponse = await getLunarCalInfo(parseInt(year), parseInt(month), parseInt(day));
      
      console.log(`\n전체 API 응답:`);
      console.log(JSON.stringify(apiResponse, null, 2));
      
      res.json({
        success: true,
        data: apiResponse
      });
    } catch (error) {
      console.error('테스트 API 호출 실패:', error);
      res.status(500).json({ 
        error: "테스트 API 호출 실패" 
      });
    }
  });

  // 라우트 등록만 수행 (서버는 index.ts에서 생성)
}
