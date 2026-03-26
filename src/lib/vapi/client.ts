const VAPI_BASE_URL = "https://api.vapi.ai";

interface VapiRequestOptions {
  method?: string;
  body?: unknown;
}

async function vapiRequest<T>(endpoint: string, options: VapiRequestOptions = {}): Promise<T> {
  const { method = "GET", body } = options;
  const response = await fetch(`${VAPI_BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vapi API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function createAssistant(config: {
  name: string;
  model: {
    provider: string;
    model: string;
    systemMessage: string;
    tools: VapiTool[];
  };
  voice: {
    provider: string;
    voiceId: string;
  };
  firstMessage: string;
  serverUrl: string;
}) {
  return vapiRequest("/assistant", {
    method: "POST",
    body: config,
  });
}

export async function updateAssistant(assistantId: string, config: Record<string, unknown>) {
  return vapiRequest(`/assistant/${assistantId}`, {
    method: "PATCH",
    body: config,
  });
}

export async function getAssistant(assistantId: string) {
  return vapiRequest(`/assistant/${assistantId}`);
}

export async function listCalls(assistantId?: string) {
  const query = assistantId ? `?assistantId=${assistantId}` : "";
  return vapiRequest(`/call${query}`);
}

export async function getCall(callId: string) {
  return vapiRequest(`/call/${callId}`);
}

export interface VapiTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
  server?: {
    url: string;
  };
}
