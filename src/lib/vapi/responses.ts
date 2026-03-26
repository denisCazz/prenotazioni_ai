import { NextResponse } from "next/server";

function toSingleLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

type VapiBody = {
  message?: {
    functionCall?: {
      id?: string;
      name?: string;
      parameters?: Record<string, unknown>;
    };
    toolCallList?: Array<{
      id?: string;
      name?: string;
      arguments?: Record<string, unknown>;
    }>;
    toolWithToolCallList?: Array<{
      toolCall?: {
        id?: string;
        function?: {
          name?: string;
          parameters?: Record<string, unknown>;
        };
      };
    }>;
    call?: {
      id?: string;
      assistantId?: string;
      assistant?: {
        id?: string;
      };
    };
    assistant?: {
      id?: string;
    };
  };
};

function getBodyMessage(body: unknown) {
  return body && typeof body === "object" ? (body as VapiBody).message : undefined;
}

export function getToolContext(body: unknown) {
  const message = getBodyMessage(body);
  const toolWithToolCall = message?.toolWithToolCallList?.[0]?.toolCall;
  const toolCall = message?.toolCallList?.[0];
  const functionCall = message?.functionCall;

  return {
    toolCallId: toolWithToolCall?.id || toolCall?.id || functionCall?.id || message?.call?.id || "call_unknown",
    toolName: toolWithToolCall?.function?.name || toolCall?.name || functionCall?.name,
    parameters:
      toolWithToolCall?.function?.parameters ||
      toolCall?.arguments ||
      functionCall?.parameters ||
      (body && typeof body === "object" ? (body as Record<string, unknown>) : {}),
    assistantId:
      message?.call?.assistantId ||
      message?.call?.assistant?.id ||
      message?.assistant?.id,
    callId: message?.call?.id,
  };
}

export function getToolCallId(body: unknown) {
  return getToolContext(body).toolCallId;
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
    { status: 200 }
  );
}