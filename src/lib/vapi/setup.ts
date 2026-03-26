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
      messages: [
        {
          role: "system" as const,
          content: systemPrompt,
        },
      ],
      tools,
    },
    voice: {
      provider: "11labs",
      voiceId,
    },
    firstMessage:
      firstMessage ||
      `Grazie per aver chiamato ${businessName}. Sono Riley, la sua assistente virtuale per la gestione degli appuntamenti. Come posso aiutarla oggi?`,
    serverUrl: `${serverBaseUrl}/api/vapi/webhook`,
  };

  return createAssistant(assistantConfig);
}

export async function updateVapiAssistant(
  assistantId: string,
  config: Partial<AssistantSetupConfig>
) {
  const updates: Record<string, unknown> = {};
  let modelUpdates: Record<string, unknown> | null = null;

  if (config.customSystemPrompt || (config.businessName && config.businessType)) {
    modelUpdates = {
      ...(modelUpdates || {}),
      provider: "openai",
      model: "gpt-4o",
      messages: [
        {
          role: "system" as const,
          content:
            config.customSystemPrompt ||
            getDefaultSystemPrompt(config.businessName!, config.businessType!),
        },
      ],
    };
  }

  if (config.serverBaseUrl) {
    modelUpdates = {
      ...(modelUpdates || {}),
      provider: "openai",
      model: "gpt-4o",
      tools: getVapiTools(config.serverBaseUrl),
    };
    updates.serverUrl = `${config.serverBaseUrl}/api/vapi/webhook`;
  }

  if (modelUpdates) {
    updates.model = modelUpdates;
  }

  if (config.voiceId) {
    updates.voice = { provider: "11labs", voiceId: config.voiceId };
  }

  if (config.firstMessage) {
    updates.firstMessage = config.firstMessage;
  }

  return updateAssistant(assistantId, updates);
}
