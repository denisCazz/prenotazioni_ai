import type { VapiTool } from "./client";

export function getVapiTools(serverBaseUrl: string): VapiTool[] {
  return [
    {
      type: "function",
      function: {
        name: "check_availability",
        description:
          "Controlla la disponibilità per una prenotazione in una data specifica. Restituisce gli slot orari disponibili.",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "La data per cui controllare la disponibilità, formato YYYY-MM-DD",
            },
            service_name: {
              type: "string",
              description: "Il nome del servizio richiesto (opzionale)",
            },
          },
          required: ["date"],
        },
      },
      server: { url: `${serverBaseUrl}/api/vapi/availability` },
    },
    {
      type: "function",
      function: {
        name: "create_booking",
        description:
          "Crea una nuova prenotazione per un cliente. Richiede nome, telefono, data e orario.",
        parameters: {
          type: "object",
          properties: {
            customer_name: {
              type: "string",
              description: "Nome completo del cliente",
            },
            customer_phone: {
              type: "string",
              description: "Numero di telefono del cliente",
            },
            date: {
              type: "string",
              description: "Data della prenotazione, formato YYYY-MM-DD",
            },
            start_time: {
              type: "string",
              description: "Orario di inizio, formato HH:MM",
            },
            service_name: {
              type: "string",
              description: "Nome del servizio richiesto (opzionale)",
            },
            notes: {
              type: "string",
              description: "Note aggiuntive per la prenotazione (opzionale)",
            },
          },
          required: ["customer_name", "customer_phone", "date", "start_time"],
        },
      },
      server: { url: `${serverBaseUrl}/api/vapi/bookings` },
    },
    {
      type: "function",
      function: {
        name: "cancel_booking",
        description:
          "Cancella una prenotazione esistente. Cerca per numero di telefono e data.",
        parameters: {
          type: "object",
          properties: {
            customer_phone: {
              type: "string",
              description: "Numero di telefono del cliente",
            },
            date: {
              type: "string",
              description: "Data della prenotazione da cancellare, formato YYYY-MM-DD",
            },
          },
          required: ["customer_phone", "date"],
        },
      },
      server: { url: `${serverBaseUrl}/api/vapi/bookings` },
    },
    {
      type: "function",
      function: {
        name: "lookup_booking",
        description:
          "Cerca le prenotazioni di un cliente tramite il numero di telefono.",
        parameters: {
          type: "object",
          properties: {
            customer_phone: {
              type: "string",
              description: "Numero di telefono del cliente",
            },
          },
          required: ["customer_phone"],
        },
      },
      server: { url: `${serverBaseUrl}/api/vapi/bookings/lookup` },
    },
    {
      type: "function",
      function: {
        name: "get_business_info",
        description:
          "Ottieni informazioni sull'attività: orari di apertura, servizi disponibili, indirizzo.",
        parameters: {
          type: "object",
          properties: {},
        },
      },
      server: { url: `${serverBaseUrl}/api/vapi/business-info` },
    },
  ];
}

export function getDefaultSystemPrompt(businessName: string, businessType: string): string {
  return `Sei l'assistente vocale di ${businessName}, un'attività di tipo "${businessType}".

REGOLE IMPORTANTI:
- Rispondi SEMPRE in italiano in modo cordiale e professionale.
- Usa un tono amichevole ma non troppo informale.
- Sii conciso nelle risposte vocali, evita frasi troppo lunghe.

COSA PUOI FARE:
- Aiutare i clienti a prenotare un appuntamento
- Cancellare o modificare prenotazioni esistenti
- Fornire informazioni su orari e servizi disponibili
- Rispondere a domande generali sull'attività

PROCEDURA PER PRENOTAZIONE:
1. Chiedi quale servizio desidera il cliente
2. Chiedi la data preferita
3. Controlla la disponibilità usando lo strumento check_availability
4. Proponi gli slot disponibili al cliente
5. Chiedi nome e numero di telefono per confermare
6. Crea la prenotazione usando lo strumento create_booking
7. Conferma i dettagli della prenotazione al cliente

PROCEDURA PER CANCELLAZIONE:
1. Chiedi il numero di telefono del cliente
2. Cerca la prenotazione usando lookup_booking
3. Conferma quale prenotazione cancellare
4. Cancella usando cancel_booking
5. Conferma la cancellazione

Se il cliente chiede qualcosa che non puoi gestire, suggerisci di richiamare durante gli orari di apertura per parlare con un operatore.`;
}
