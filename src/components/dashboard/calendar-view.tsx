"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  source: string;
  services?: { name: string } | null;
}

interface CalendarViewProps {
  businessId: string;
  services: { id: string; name: string }[];
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

export function CalendarView({ businessId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const startDate = format(days[0], "yyyy-MM-dd");
    const endDate = format(days[6], "yyyy-MM-dd");

    const params = new URLSearchParams();
    params.set("date_from", startDate);
    params.set("date_to", endDate);
    params.set("limit", "200");

    try {
      const res = await fetch(`/api/bookings?${params}`);
      const json = await res.json();
      setBookings(json.data || []);
    } catch {
      setBookings([]);
    }
    setLoading(false);
  }, [days[0].getTime()]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  function getBookingsForDay(date: Date) {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.filter((b) => b.date === dateStr && b.status !== "cancelled");
  }

  function getTopPosition(time: string) {
    const [h, m] = time.split(":").map(Number);
    return ((h - 7) * 60 + m) * (64 / 60);
  }

  function getHeight(start: string, end: string) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const minutes = (eh * 60 + em) - (sh * 60 + sm);
    return Math.max(minutes * (64 / 60), 20);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">
            {format(weekStart, "d MMMM", { locale: it })} -{" "}
            {format(addDays(weekStart, 6), "d MMMM yyyy", { locale: it })}
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(new Date())}
        >
          Oggi
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
                <div className="border-r p-2" />
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "border-r p-2 text-center text-sm",
                      isSameDay(day, new Date()) && "bg-primary/5"
                    )}
                  >
                    <div className="font-medium">
                      {format(day, "EEE", { locale: it })}
                    </div>
                    <div
                      className={cn(
                        "mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm",
                        isSameDay(day, new Date()) &&
                          "bg-primary text-primary-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative grid grid-cols-[60px_repeat(7,1fr)]">
                <div className="border-r">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="h-16 border-b px-2 text-right text-xs text-muted-foreground leading-none pt-1"
                    >
                      {String(hour).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>

                {days.map((day) => {
                  const dayBookings = getBookingsForDay(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "relative border-r",
                        isSameDay(day, new Date()) && "bg-primary/5"
                      )}
                    >
                      {HOURS.map((hour) => (
                        <div key={hour} className="h-16 border-b" />
                      ))}

                      {dayBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className={cn(
                            "absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 text-xs overflow-hidden cursor-pointer transition-opacity hover:opacity-80",
                            booking.source === "phone_ai"
                              ? "bg-blue-100 border-l-2 border-blue-500 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                              : "bg-green-100 border-l-2 border-green-500 text-green-900 dark:bg-green-950 dark:text-green-100"
                          )}
                          style={{
                            top: `${getTopPosition(booking.start_time)}px`,
                            height: `${getHeight(booking.start_time, booking.end_time)}px`,
                          }}
                          title={`${booking.customer_name}\n${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`}
                        >
                          <div className="font-medium truncate">
                            {booking.customer_name}
                          </div>
                          <div className="truncate opacity-75">
                            {booking.start_time.slice(0, 5)}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
