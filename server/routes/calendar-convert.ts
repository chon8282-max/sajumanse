import { Router } from "express";
import { db } from "../db";
import { lunarSolarCalendar } from "@shared/schema";
import { and, eq } from "drizzle-orm";

const router = Router();

// 음력 → 양력 변환
router.get("/lunar-to-solar", async (req, res) => {
  const { year, month, day, leapMonth } = req.query;
  try {
    const result = await db.select().from(lunarSolarCalendar).where(
      and(
        eq(lunarSolarCalendar.lunYear, Number(year)),
        eq(lunarSolarCalendar.lunMonth, Number(month)),
        eq(lunarSolarCalendar.lunDay, Number(day)),
        eq(lunarSolarCalendar.lunLeapMonth, leapMonth === "true" ? "윤" : "평")
      )
    ).limit(1);

    if (result.length > 0) {
      return res.json({
        success: true,
        solYear: result[0].solYear,
        solMonth: result[0].solMonth,
        solDay: result[0].solDay
      });
    }
    return res.json({ success: false });
  } catch (error) {
    return res.json({ success: false });
  }
});

// 양력 → 음력 변환
router.get("/solar-to-lunar", async (req, res) => {
  const { year, month, day } = req.query;
  try {
    const result = await db.select().from(lunarSolarCalendar).where(
      and(
        eq(lunarSolarCalendar.solYear, Number(year)),
        eq(lunarSolarCalendar.solMonth, Number(month)),
        eq(lunarSolarCalendar.solDay, Number(day))
      )
    ).limit(1);

    if (result.length > 0) {
      return res.json({
        success: true,
        lunYear: result[0].lunYear,
        lunMonth: result[0].lunMonth,
        lunDay: result[0].lunDay,
        isLeapMonth: result[0].lunLeapMonth === "윤"
      });
    }
    return res.json({ success: false });
  } catch (error) {
    return res.json({ success: false });
  }
});

export default router;