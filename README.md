# Bitora Booking

Sistema di prenotazioni telefoniche con assistente vocale AI. I clienti chiamano un numero di telefono dedicato e un assistente AI in italiano gestisce prenotazioni, cancellazioni e richieste di informazioni. I gestori dell'attivita hanno una dashboard web completa per monitorare tutto.

## Stack tecnologico

- **Next.js 15** (App Router, TypeScript, Turbopack)
- **Supabase** (PostgreSQL, Realtime)
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
| `NEXT_PUBLIC_APP_URL` | URL pubblica della tua app (in questo progetto `https://bitora-booking.vercel.app`) |
| `AUTH_SECRET` | Una stringa lunga e casuale usata per firmare le sessioni custom |

### 3. Configura il database Supabase

Vai su Supabase Dashboard > SQL Editor ed esegui il contenuto di:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_custom_dashboard_auth.sql
```

Questo crea tutte le tabelle, indici e abilita il login custom via username e password salvati nel database.

### 4. Crea il primo utente e business

In Supabase Dashboard > SQL Editor:

```sql
-- Crea un business
INSERT INTO public.businesses (name, type, address)
VALUES ('La Mia Attivita', 'ristorante', 'Via Roma 1, Milano');

-- Recupera l'id del business creato
SELECT id, name FROM public.businesses;
```

Genera poi l'hash della password:

```bash
npm run hash-password -- "PasswordSicura123!"
```

Infine crea l'utente dashboard nel database:

```sql
INSERT INTO public.profiles (business_id, full_name, username, password_hash, role)
VALUES (
  '<business_id>',
  'Mario Rossi',
  'admin',
  '<hash_generato>',
  'owner'
);
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

Guida completa, campo per campo, in `docs/vapi-tools-setup.md`.

### 6. Avvia il server di sviluppo

```bash
npm run dev
```

Apri [https://bitora-booking.vercel.app](https://bitora-booking.vercel.app) o il tuo ambiente locale per accedere alla dashboard.

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
      auth/                 # Login/logout dashboard
      bookings/             # CRUD prenotazioni (dashboard)
      businesses/           # Configurazione attivita
      services/             # CRUD servizi
      availability/         # CRUD fasce orarie
      call-logs/            # Storico chiamate
      dashboard/stats/      # Statistiche
  lib/
    supabase/               # Client Supabase server/admin
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
