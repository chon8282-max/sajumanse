import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertManseRyeokSchema, insertLunarSolarCalendarSchema } from "@shared/schema";
import { calculateSaju } from "../client/src/lib/saju-calculator";
import { 
  getLunarCalInfo, 
  getSolarCalInfo, 
  getLunarDataForYear, 
  getLunarDataForYearRange 
} from "./lib/data-gov-kr-service";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // 만세력 관련 API 라우트
  
  // 사주팔자 계산 API
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
      
      // 사주팔자 계산
      const sajuResult = calculateSaju(
        parseInt(year), 
        parseInt(month), 
        parseInt(day), 
        parseInt(hour),
        parseInt(minute) || 0, // minute 값 사용
        isLunarBool
      );

      res.json({
        success: true,
        data: sajuResult
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
