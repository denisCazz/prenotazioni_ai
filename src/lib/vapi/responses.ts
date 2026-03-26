import { NextResponse } from "next/server";

function toSingleLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function getToolCallId(body: unknown) {
  const message = body && typeof body === "object" ? (body as { message?: { functionCall?: { id?: string }; call?: { id?: string } } }).message : undefined;
  return message?.functionCall?.id || message?.call?.id || "call_unknown";
}

export function createToolResponse(result: string, toolCallId: string, status = 200) {
  return NextResponse.json(
    {
      results: [
        {
          toolCallId,
          result: toSingleLine(result),
        },
      ],
    },
    { status }
  );
}