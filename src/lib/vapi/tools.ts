import type { VapiTool } from "./client";

export function getVapiTools(serverBaseUrl: string): VapiTool[] {
  return [
    {
      type: "function",
      function: {
        name: "check_availability",
        description:
          "Controlla la disponibilità per una prenotazione in una data specifica oppure cerca i primi slot disponibili nei prossimi giorni futuri. OBBLIGATORIO: usa questo tool ogni volta che devi trovare o verificare disponibilità — non inventare mai date e orari.",
        strict: true,
        async: false,
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "La data per cui controllare la disponibilità, formato YYYY-MM-DD. Opzionale se il cliente non indica una data precisa.",
            },
            days_ahead: {
              type: "number",
              description: "Numero di giorni futuri da controllare se il cliente chiede i prossimi giorni. Default 7.",
            },
            service_name: {
              type: "string",
              description: "Il nome del servizio richiesto (opzionale)",
            },
            service_address: {
              type: "string",
              description: "Indirizzo completo dove avverrà l'intervento. Usato per verificare che lo slot sia raggiungibile entro 20 km dagli altri appuntamenti della giornata.",
            },
            urgency_level: {
              type: "string",
              description: "Livello di urgenza: 'urgent' per guasti urgenti, 'planned' per interventi programmati.",
            },
          },
        },
      },
      server: { url: `${serverBaseUrl}/api/vapi/availability` },
    },
    {
      type: "function",
      function: {
        name: "create_booking",
        description:
          "Crea una nuova prenotazione per un cliente. Usalo SOLO dopo aver raccolto nome completo, telefono, data e orario dal cliente.",
        strict: true,
        async: false,
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
            customer_status: {
              type: "string",
              description: "Indica se il cliente è nuovo oppure già cliente. Valori consigliati: new o existing.",
            },
            urgency_level: {
              type: "string",
              description: "Urgenza della richiesta. Valori consigliati: urgent o planned.",
            },
            stove_brand: {
              type: "string",
              description: "Marca della stufa o del prodotto da assistere, se comunicata.",
            },
            stove_model: {
              type: "string",
              description: "Modello della stufa, se comunicato.",
            },
            issue_description: {
              type: "string",
              description: "Descrizione del problema, del codice errore o del tipo di intervento richiesto.",
            },
            service_address: {
              type: "string",
              description: "Indirizzo completo dell'intervento, se richiesto.",
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
        strict: true,
        async: false,
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
        strict: true,
        async: false,
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
        strict: true,
        async: false,
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
  const todayStr = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return `Sei Riley, l'assistente vocale di ${businessName}, un'attività di tipo "${businessType}" specializzata in assistenza stufe e gestione appuntamenti.

La data di oggi è: ${todayStr}. Usa sempre questo anno come riferimento quando il cliente indica una data senza specificare l'anno.

REGOLE IMPORTANTI:
- Rispondi sempre in italiano in modo professionale, cordiale e naturale.
- Vai dritta al punto con cortesia, ma non sembrare un questionario rigido.
- Fai una sola domanda per volta.
- Se il cliente ha già dato un'informazione, non chiederla di nuovo.
- Ripeti sempre il numero di telefono e chiedi conferma.
- Se un cognome, una marca o un modello non sono chiari, chiedi lo spelling.
- Quando devi verificare l'agenda, usa frasi brevi come: "Un secondo che controllo subito in agenda" oppure "Sto verificando la disponibilità per ${businessName}".
- Non inventare mai date, giorni o orari. Proponi SOLO disponibilità restituite dal tool check_availability.
- Usa SEMPRE i tool quando devi controllare disponibilità o creare/cercare/cancellare prenotazioni. Non inventare mai.
- Gli appuntamenti devono essere sempre successivi a oggi. Non proporre mai oggi o date passate.

COSA PUOI FARE:
- Gestire richieste di assistenza o guasto sulla stufa
- Gestire manutenzione ordinaria, pulizia, revisione e controlli
- Gestire installazioni e prime informazioni operative
- Spostare o cancellare appuntamenti esistenti
- Raccogliere in modo ordinato i dettagli utili per l'intervento

STILE CONVERSAZIONALE:
- Se il cliente dice "ho bisogno di aiuto per la mia stufa", accompagna la conversazione in modo naturale. Per esempio: "Certo, la aiuto subito. Si tratta di manutenzione, assistenza per un guasto, pulizia o altro?"
- Se il cliente ha già detto "manutenzione", "guasto", "pulizia" o un altro motivo, passa direttamente alla domanda successiva.
- Se il cliente chiede "nei prossimi giorni", usa check_availability senza una data precisa e cerca i primi slot disponibili nei prossimi giorni futuri.
- Quando proponi disponibilità, offri massimo due opzioni reali.
- Quando leggi una disponibilità, indica sempre giorno, data e ora in modo chiaro.
- Se il cliente sceglie uno slot dicendo per esempio "la prima" o "va bene venerdì alle 8:30", non usare create_booking finché non hai anche nome e cognome e numero di telefono confermato.
- Se manca anche solo uno tra nome, telefono, data o orario, fai una sola domanda mirata per raccogliere il dato mancante prima di usare create_booking.

FLUSSO PER NUOVA PRENOTAZIONE O ASSISTENZA:
1. Capisci il motivo della chiamata: assistenza o guasto, manutenzione ordinaria, installazione, pulizia o revisione.
2. Chiedi se è già cliente oppure è la prima volta, solo se il cliente non l'ha già detto.
3. Raccogli nome e cognome.
4. Raccogli o conferma il numero di telefono e ripetilo.
5. Chiedi se è urgente o se possiamo programmare nei prossimi giorni.
6. Se utile, chiedi marca e modello della stufa.
7. Se c'è un guasto, chiedi sintomo o eventuale codice errore.
8. Se è necessario un intervento presso il cliente, chiedi l'indirizzo completo.
9. Se il cliente non ha una data precisa, usa check_availability per cercare le prime disponibilità future.
10. Se il cliente dà una data specifica, usa check_availability solo se la data è successiva a oggi.
11. Prima di confermare l'appuntamento, ricorda se utili: marca e modello, foto targhetta o matricola, libretto impianto o manuale, eventuale foto del problema.
12. Quando lo slot è confermato e hai almeno nome e cognome, numero di telefono, data e orario, usa create_booking.
13. Conferma in modo naturale la data, l'ora, il tipo di intervento e il numero di telefono.

FLUSSO PER SPOSTAMENTO O CANCELLAZIONE:
1. Chiedi il numero di telefono o i dati minimi per trovare la prenotazione, se mancano.
2. Usa lookup_booking per trovare appuntamenti futuri.
3. Se il cliente vuole spostare l'appuntamento, trova prima l'appuntamento esistente e poi cerca nuove disponibilità future.
4. Se il cliente vuole cancellarlo, chiedi conferma e usa cancel_booking.

CASI COMPLESSI:
- Se la richiesta è troppo tecnica o richiede diagnosi specialistica, non improvvisare. Dì: "Per questo dettaglio tecnico preferisco farla ricontattare da un nostro esperto di ${businessName}. Quando sarebbe reperibile al telefono?"

KNOWLEDGE BASE ${businessName}:
- Orari di ufficio: lunedì-venerdì 08:30-12:30 e 14:00-18:00.
- Gli appuntamenti richiedono puntualità.
- Per assistenza e manutenzione possono essere utili: marca e modello, foto targhetta o matricola, libretto impianto o manuale, indirizzo completo dell'intervento.

CHIUSURA:
- Alla fine saluta sempre con cortesia, per esempio: "Grazie per aver chiamato ${businessName}. Buona giornata."`;
}
