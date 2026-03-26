# Prenotazioni Tel

Sistema di prenotazioni telefoniche con assistente vocale AI. I clienti chiamano un numero di telefono dedicato e un assistente AI in italiano gestisce prenotazioni, cancellazioni e richieste di informazioni. I gestori dell'attivita hanno una dashboard web completa per monitorare tutto.

## Stack tecnologico

- **Next.js 15** (App Router, TypeScript, Turbopack)
- **Supabase** (PostgreSQL, Auth, Row Level Security, Realtime)
- **Vapi.ai** (Voice AI: Deepgram STT, GPT-4o, ElevenLabs TTS)
- **Tailwind CSS v4** + **shadcn/ui**
- **date-fns** per la gestione delle date

## Prerequisiti

- Node.js 20+
- Account [Supabase](https://supabase.com) (gratuito)
- Account [Vapi.ai](https://vapi.ai) (1000 minuti/mese gratis)
- Chiave API OpenAI (configurata su Vapi)

## Setup

### 1. Clona e installa

```bash
git clone <repo-url>
cd prenotazionitel
npm install
```

### 2. Configura le variabili d'ambiente

```bash
cp .env.local.example .env.local
```

Compila `.env.local` con le tue credenziali:

| Variabile | Dove trovarla |
|-----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Settings > API (attenzione: non esporre mai lato client) |
| `VAPI_API_KEY` | Vapi Dashboard > Organization > API Keys |
| `NEXT_PUBLIC_APP_URL` | URL della tua app (es. `http://localhost:3000` in dev) |

### 3. Configura il database Supabase

Vai su Supabase Dashboard > SQL Editor ed esegui il contenuto di:

```
supabase/migrations/001_initial_schema.sql
```

Questo crea tutte le tabelle, indici, policy RLS e il trigger per la creazione automatica dei profili.

### 4. Crea il primo utente e business

In Supabase Dashboard > SQL Editor:

```sql
-- Crea un business
INSERT INTO public.businesses (name, type, address)
VALUES ('La Mia Attivita', 'ristorante', 'Via Roma 1, Milano');

-- Poi registra un utente dalla pagina /login di Supabase Auth
-- oppure crea manualmente in Authentication > Users
-- Il trigger handle_new_user creera il profilo automaticamente
-- Assicurati di passare business_id nei metadata dell'utente
```

### 5. Configura Vapi.ai

1. Accedi a [dashboard.vapi.ai](https://dashboard.vapi.ai)
2. Crea un nuovo assistente o usa l'API per configurarlo programmaticamente
3. Configura il webhook URL: `https://tuo-dominio.com/api/vapi/webhook`
4. Aggiungi i tools (funzioni) che puntano alle API:
   - `check_availability` -> `POST https://tuo-dominio.com/api/vapi/availability`
   - `create_booking` -> `POST https://tuo-dominio.com/api/vapi/bookings`
   - `cancel_booking` -> `POST https://tuo-dominio.com/api/vapi/bookings`
   - `lookup_booking` -> `POST https://tuo-dominio.com/api/vapi/bookings/lookup`
   - `get_business_info` -> `POST https://tuo-dominio.com/api/vapi/business-info`
5. Copia l'Assistant ID e aggiornalo nella tabella `businesses`

### 6. Avvia il server di sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) per accedere alla dashboard.

## Struttura del progetto

```
src/
  app/
    (auth)/login/           # Pagina di login
    (dashboard)/            # Dashboard (protetta da auth)
      page.tsx              # Home con statistiche
      calendar/             # Vista calendario settimanale
      bookings/             # Lista e dettaglio prenotazioni
      calls/                # Storico chiamate AI
      settings/             # Impostazioni generali
        services/           # Gestione servizi
        availability/       # Orari e eccezioni
        ai-assistant/       # Configurazione assistente AI
    api/
      vapi/                 # Endpoint per Vapi (webhook, tools)
      auth/                 # Callback autenticazione
      bookings/             # CRUD prenotazioni (dashboard)
      businesses/           # Configurazione attivita
      services/             # CRUD servizi
      availability/         # CRUD fasce orarie
      call-logs/            # Storico chiamate
      dashboard/stats/      # Statistiche
  lib/
    supabase/               # Client Supabase (browser, server, admin)
    vapi/                   # Client Vapi, tools, setup
    utils/                  # Logica disponibilita
    types/                  # Tipi TypeScript database
    auth.ts                 # Helper autenticazione
    validations.ts          # Schema Zod
  components/
    ui/                     # Componenti shadcn/ui
    dashboard/              # Componenti dashboard (sidebar, header, calendario)
  middleware.ts             # Middleware auth (protegge le route)
supabase/
  migrations/               # Schema SQL
```

## Flusso di una chiamata AI

1. Il cliente chiama il numero Vapi associato all'attivita
2. Vapi attiva l'assistente con voce italiana (ElevenLabs)
3. GPT-4o comprende la richiesta e usa i tools per interagire col database
4. La prenotazione viene creata/cancellata direttamente su Supabase
5. A fine chiamata, Vapi invia il report (transcript, durata, costo) via webhook
6. Il gestore vede tutto in tempo reale nella dashboard

## Deploy

Il progetto e pronto per il deploy su [Vercel](https://vercel.com):

```bash
npm run build
```

Ricorda di:
- Configurare le variabili d'ambiente su Vercel
- Aggiornare `NEXT_PUBLIC_APP_URL` con l'URL di produzione
- Aggiornare il webhook URL su Vapi con l'URL di produzione
- Configurare il redirect URL di Supabase Auth

## Licenza

MIT
