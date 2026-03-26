import { format, parse, addMinutes, isBefore, isEqual } from "date-fns";
import type { Tables } from "@/lib/types/database";

interface TimeSlot {
  start_time: string;
  end_time: string;
}

type AvailabilitySlot = Pick<
  Tables<"availability_slots">,
  "day_of_week" | "start_time" | "end_time" | "is_active"
>;

type AvailabilityException = Pick<
  Tables<"availability_exceptions">,
  "date" | "is_closed" | "start_time" | "end_time"
>;

type Booking = Pick<Tables<"bookings">, "start_time" | "end_time" | "status">;

interface ServiceInfo {
  duration_minutes: number;
  max_concurrent: number;
}

export function getDayOfWeek(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00");
  const jsDay = date.getDay();
  // Convert JS Sunday=0 to our Monday=0 format
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function getAvailableSlots(
  dateStr: string,
  availabilitySlots: AvailabilitySlot[],
  exceptions: AvailabilityException[],
  existingBookings: Booking[],
  service?: ServiceInfo,
  slotIntervalMinutes: number = 30
): TimeSlot[] {
  const dayOfWeek = getDayOfWeek(dateStr);

  const exception = exceptions.find((e) => e.date === dateStr);
  if (exception?.is_closed) {
    return [];
  }

  let timeRanges: TimeSlot[];

  if (exception && exception.start_time && exception.end_time) {
    timeRanges = [{ start_time: exception.start_time, end_time: exception.end_time }];
  } else {
    timeRanges = availabilitySlots
      .filter((s) => s.day_of_week === dayOfWeek && s.is_active)
      .map((s) => ({ start_time: s.start_time, end_time: s.end_time }));
  }

  if (timeRanges.length === 0) {
    return [];
  }

  const duration = service?.duration_minutes ?? slotIntervalMinutes;
  const maxConcurrent = service?.max_concurrent ?? 1;
  const activeBookings = existingBookings.filter((b) => b.status !== "cancelled");

  const availableSlots: TimeSlot[] = [];

  for (const range of timeRanges) {
    const rangeStart = parse(range.start_time, "HH:mm:ss", new Date());
    const rangeEnd = parse(range.end_time, "HH:mm:ss", new Date());

    let current = rangeStart;

    while (true) {
      const slotEnd = addMinutes(current, duration);

      if (!isBefore(slotEnd, rangeEnd) && !isEqual(slotEnd, rangeEnd)) {
        break;
      }

      const slotStartStr = format(current, "HH:mm:ss");
      const slotEndStr = format(slotEnd, "HH:mm:ss");

      const overlapping = activeBookings.filter((booking) => {
        return booking.start_time < slotEndStr && booking.end_time > slotStartStr;
      });

      if (overlapping.length < maxConcurrent) {
        availableSlots.push({
          start_time: format(current, "HH:mm"),
          end_time: format(slotEnd, "HH:mm"),
        });
      }

      current = addMinutes(current, slotIntervalMinutes);
    }
  }

  return availableSlots;
}

export function formatTimeForDisplay(time: string): string {
  const parts = time.split(":");
  return `${parts[0]}:${parts[1]}`;
}

export function isSlotAvailable(
  startTime: string,
  endTime: string,
  existingBookings: Booking[],
  maxConcurrent: number = 1
): boolean {
  const activeBookings = existingBookings.filter((b) => b.status !== "cancelled");
  const overlapping = activeBookings.filter((booking) => {
    return booking.start_time < endTime && booking.end_time > startTime;
  });
  return overlapping.length < maxConcurrent;
}

export function getWeekDayName(dayOfWeek: number): string {
  const days = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
  return days[dayOfWeek] ?? "";
}
