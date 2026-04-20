import { supabase } from "@/lib/supabase";

export type AttendanceRecord = {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  duration: string | null;
};

export async function checkIn(userEmail: string): Promise<{ success: boolean; record?: AttendanceRecord; error?: string }> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const checkInTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Check if already checked in today
    const { data: existing } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userEmail)
      .eq("date", today)
      .single();

    if (existing) {
      return { success: false, error: "Already checked in today" };
    }

    // Insert new record
    const { data, error } = await supabase
      .from("attendance")
      .insert({
        user_id: userEmail,
        date: today,
        check_in: checkInTime,
      })
      .select()
      .single();

    if (error) {
      console.error("Check-in error:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      record: {
        id: data.id,
        date: data.date,
        checkIn: data.check_in,
        checkOut: null,
        duration: null,
      },
    };
  } catch (error) {
    console.error("Check-in error:", error);
    return { success: false, error: "Failed to check in" };
  }
}

export async function checkOut(userEmail: string): Promise<{ success: boolean; record?: AttendanceRecord; error?: string }> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const checkOutTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Get today's record
    const { data: existing } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userEmail)
      .eq("date", today)
      .single();

    if (!existing) {
      return { success: false, error: "No check-in record found for today" };
    }

    if (existing.check_out) {
      return { success: false, error: "Already checked out today" };
    }

    // Calculate duration
    const duration = calculateDuration(existing.check_in, checkOutTime);

    // Update record
    const { data, error } = await supabase
      .from("attendance")
      .update({
        check_out: checkOutTime,
        duration: duration,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Check-out error:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      record: {
        id: data.id,
        date: data.date,
        checkIn: data.check_in,
        checkOut: data.check_out,
        duration: data.duration,
      },
    };
  } catch (error) {
    console.error("Check-out error:", error);
    return { success: false, error: "Failed to check out" };
  }
}

export async function getTodayRecord(userEmail: string): Promise<AttendanceRecord | null> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userEmail)
      .eq("date", today)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      date: data.date,
      checkIn: data.check_in,
      checkOut: data.check_out,
      duration: data.duration,
    };
  } catch (error) {
    console.error("Get today record error:", error);
    return null;
  }
}

export async function getMonthlyRecords(userEmail: string, year: number, month: number): Promise<AttendanceRecord[]> {
  try {
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userEmail)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) {
      console.error("Get monthly records error:", error);
      return [];
    }

    return data.map((record: any) => ({
      id: record.id,
      date: record.date,
      checkIn: record.check_in,
      checkOut: record.check_out,
      duration: record.duration,
    }));
  } catch (error) {
    console.error("Get monthly records error:", error);
    return [];
  }
}

function calculateDuration(checkIn: string, checkOut: string): string {
  const [inHour, inMin, inPeriod] = checkIn.match(/(\d+):(\d+)\s*(AM|PM)/i)?.slice(1) || [];
  const [outHour, outMin, outPeriod] = checkOut.match(/(\d+):(\d+)\s*(AM|PM)/i)?.slice(1) || [];

  if (!inHour || !outHour) return "-";

  let inHour12 = parseInt(inHour);
  let outHour12 = parseInt(outHour);
  if (inPeriod?.toUpperCase() === "PM" && inHour12 !== 12) inHour12 += 12;
  if (inPeriod?.toUpperCase() === "AM" && inHour12 === 12) inHour12 = 0;
  if (outPeriod?.toUpperCase() === "PM" && outHour12 !== 12) outHour12 += 12;
  if (outPeriod?.toUpperCase() === "AM" && outHour12 === 12) outHour12 = 0;

  const inTotalMin = inHour12 * 60 + parseInt(inMin);
  const outTotalMin = outHour12 * 60 + parseInt(outMin);
  const durationMin = outTotalMin - inTotalMin;

  if (durationMin < 0) return "-";
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  return `${hours}h ${mins}m`;
}
