import { createAssistant, updateAssistant } from "./client";
import { getVapiTools } from "./tools";
import { getDefaultSystemPrompt } from "./tools";

export interface AssistantSetupConfig {
  businessName: string;
  businessType: string;
  serverBaseUrl: string;
  customSystemPrompt?: string;
  voiceId?: string;
  firstMessage?: string;
}

export async function setupVapiAssistant(config: AssistantSetupConfig) {
  const {
    businessName,
    businessType,
    serverBaseUrl,
    customSystemPrompt,
    voiceId = "IKne3meq5aSn9XLyUdCD", // ElevenLabs Italian voice
    firstMessage,
  } = config;

  const systemPrompt = customSystemPrompt || getDefaultSystemPrompt(businessName, businessType);
  const tools = getVapiTools(serverBaseUrl);

  const assistantConfig = {
    name: `Assistente ${businessName}`,
    model: {
      provider: "openai",
      model: "gpt-4o",
      systemMessage: systemPrompt,
      tools,
    },
    voice: {
      provider: "11labs",
      voiceId,
    },
    firstMessage:
      firstMessage ||
      `Buongiorno! Benvenuto a ${businessName}. Come posso aiutarla oggi?`,
    serverUrl: `${serverBaseUrl}/api/vapi/webhook`,
  };

  return createAssistant(assistantConfig);
}

export async function updateVapiAssistant(
  assistantId: string,
  config: Partial<AssistantSetupConfig>
) {
  const updates: Record<string, unknown> = {};

  if (config.customSystemPrompt || (config.businessName && config.businessType)) {
    updates.model = {
      systemMessage:
        config.customSystemPrompt ||
        getDefaultSystemPrompt(config.businessName!, config.businessType!),
    };
  }

  if (config.serverBaseUrl) {
    updates.model = {
      ...(updates.model as Record<string, unknown> || {}),
      tools: getVapiTools(config.serverBaseUrl),
    };
    updates.serverUrl = `${config.serverBaseUrl}/api/vapi/webhook`;
  }

  if (config.voiceId) {
    updates.voice = { provider: "11labs", voiceId: config.voiceId };
  }

  if (config.firstMessage) {
    updates.firstMessage = config.firstMessage;
  }

  return updateAssistant(assistantId, updates);
}
