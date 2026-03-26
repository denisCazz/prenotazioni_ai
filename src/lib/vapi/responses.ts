import { NextResponse } from "next/server";

function toSingleLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

type VapiBody = {
  functionCall?: {
    id?: string;
    name?: string;
    parameters?: Record<string, unknown>;
  };
  toolCall?: {
    id?: string;
    name?: string;
    arguments?: Record<string, unknown> | string;
    function?: {
      name?: string;
      arguments?: Record<string, unknown> | string;
      parameters?: Record<string, unknown>;
    };
  };
  toolCallList?: Array<{
    id?: string;
    name?: string;
    arguments?: Record<string, unknown> | string;
    function?: {
      name?: string;
      arguments?: Record<string, unknown> | string;
      parameters?: Record<string, unknown>;
    };
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
    customer?: {
      number?: string;
      name?: string;
    };
  };
  customer?: {
    number?: string;
    name?: string;
  };
  assistant?: {
    id?: string;
  };
  message?: {
    functionCall?: {
      id?: string;
      name?: string;
      parameters?: Record<string, unknown>;
    };
    toolCallList?: Array<{
      id?: string;
      name?: string;
      arguments?: Record<string, unknown> | string;
      function?: {
        name?: string;
        arguments?: Record<string, unknown> | string;
        parameters?: Record<string, unknown>;
      };
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
      customer?: {
        number?: string;
        name?: string;
      };
    };
    assistant?: {
      id?: string;
    };
    customer?: {
      number?: string;
      name?: string;
    };
  };
};

function getBodyMessage(body: unknown) {
  return body && typeof body === "object" ? (body as VapiBody).message : undefined;
}

function parseArguments(value: unknown): Record<string, unknown> | undefined {
  if (!value) return undefined;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return undefined; }
  }
  return undefined;
}

export function getToolContext(body: unknown) {
  const root = body && typeof body === "object" ? (body as VapiBody) : undefined;
  const message = getBodyMessage(body);
  const toolWithToolCall = message?.toolWithToolCallList?.[0]?.toolCall || root?.toolWithToolCallList?.[0]?.toolCall;
  const toolCall = message?.toolCallList?.[0] || root?.toolCallList?.[0] || root?.toolCall;
  const functionCall = message?.functionCall || root?.functionCall;
  const topLevelParameters =
    parseArguments(root?.toolCall?.function?.parameters) ||
    parseArguments(root?.toolCall?.function?.arguments) ||
    parseArguments(root?.toolCall?.arguments) ||
    parseArguments(root?.functionCall?.parameters);
  const rawBody = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  return {
    toolCallId:
      toolWithToolCall?.id ||
      toolCall?.id ||
      functionCall?.id ||
      message?.call?.id ||
      root?.call?.id ||
      "call_unknown",
    toolName:
      toolWithToolCall?.function?.name ||
      toolCall?.function?.name ||
      toolCall?.name ||
      functionCall?.name ||
      (typeof rawBody.name === "string" ? rawBody.name : undefined),
    parameters:
      parseArguments(toolWithToolCall?.function?.parameters) ||
      parseArguments(toolCall?.function?.arguments) ||
      parseArguments(toolCall?.function?.parameters) ||
      parseArguments(toolCall?.arguments) ||
      parseArguments(functionCall?.parameters) ||
      parseArguments(topLevelParameters) ||
      (typeof rawBody.parameters === "object" && rawBody.parameters ? (rawBody.parameters as Record<string, unknown>) : undefined) ||
      (typeof rawBody.arguments === "object" && rawBody.arguments ? (rawBody.arguments as Record<string, unknown>) : undefined) ||
      rawBody,
    assistantId:
      message?.call?.assistantId ||
      message?.call?.assistant?.id ||
      message?.assistant?.id ||
      root?.call?.assistantId ||
      root?.call?.assistant?.id ||
      root?.assistant?.id,
    callId: message?.call?.id || root?.call?.id,
    callerPhone:
      message?.customer?.number ||
      message?.call?.customer?.number ||
      root?.customer?.number ||
      root?.call?.customer?.number,
    callerName:
      message?.customer?.name ||
      message?.call?.customer?.name ||
      root?.customer?.name ||
      root?.call?.customer?.name,
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