import { z } from "zod";

export const bookingSchema = z.object({
  business_id: z.string().uuid(),
  service_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().min(1, "Nome cliente obbligatorio"),
  customer_phone: z.string().min(6, "Numero di telefono non valido"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data non valido (YYYY-MM-DD)"),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Formato orario non valido (HH:MM)"),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Formato orario non valido (HH:MM)"),
  notes: z.string().optional(),
  source: z.enum(["phone_ai", "dashboard", "manual"]).default("manual"),
  call_id: z.string().optional(),
});

export const serviceSchema = z.object({
  business_id: z.string().uuid(),
  name: z.string().min(1, "Nome servizio obbligatorio"),
  duration_minutes: z.number().int().min(5).max(480),
  description: z.string().optional(),
  max_concurrent: z.number().int().min(1).default(1),
  active: z.boolean().default(true),
});

export const availabilitySlotSchema = z.object({
  business_id: z.string().uuid(),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Formato orario non valido"),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Formato orario non valido"),
  is_active: z.boolean().default(true),
});

export const availabilityExceptionSchema = z.object({
  business_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data non valido"),
  is_closed: z.boolean().default(true),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  reason: z.string().optional(),
});

export const businessUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  system_prompt: z.string().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type AvailabilitySlotInput = z.infer<typeof availabilitySlotSchema>;
export type AvailabilityExceptionInput = z.infer<typeof availabilityExceptionSchema>;
export type BusinessUpdateInput = z.infer<typeof businessUpdateSchema>;
