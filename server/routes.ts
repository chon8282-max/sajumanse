import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertManseRyeokSchema } from "@shared/schema";
import { calculateSaju } from "../client/src/lib/saju-calculator";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // 만세력 관련 API 라우트
  
  // 사주팔자 계산 API
  app.post("/api/saju/calculate", async (req, res) => {
    try {
      const { year, month, day, hour, isLunar } = req.body;
      
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

  const httpServer = createServer(app);
  return httpServer;
}
