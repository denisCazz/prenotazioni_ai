# Configurare i tool Vapi per questo progetto

Questa guida serve per collegare un assistant Vapi agli endpoint del progetto e provare i tool senza dover ricostruire la configurazione a mano.

## Obiettivo

Alla fine avrai:

1. un assistant Vapi configurato in italiano
2. i 5 tool collegati agli endpoint corretti
3. il webhook Vapi collegato alla tua app
4. l'`assistantId` salvato nel database Supabase

## Prima di iniziare

Ti servono questi prerequisiti:

1. app Next.js avviata o deployata
2. database Supabase configurato
3. almeno un record nella tabella `businesses`
4. almeno un utente dashboard in `profiles` con `username` e `password_hash`
5. almeno un servizio nella tabella `services`
6. disponibilita configurata in `availability_slots`
7. URL pubblico raggiungibile da Vapi

Se stai lavorando in locale, `localhost` non basta. Devi esporre l'app con uno di questi metodi:

1. deploy su Vercel
2. tunnel con ngrok
3. tunnel con Cloudflare Tunnel

Esempio di base URL pubblico:

```text
https://bitora-booking.vercel.app
```

Tutti gli endpoint qui sotto useranno questo dominio.

## Login dashboard custom

Questo progetto non usa piu Supabase Auth per la dashboard. Il login usa:

1. `profiles.username`
2. `profiles.password_hash`
3. una sessione custom firmata in cookie

Per creare il primo utente:

```bash
npm run hash-password -- "PasswordSicura123!"
```

Poi inserisci il profilo con SQL:

```sql
insert into public.profiles (business_id, full_name, username, password_hash, role)
values (
  '<business_id>',
  'Mario Rossi',
  'admin',
  '<hash_generato>',
  'owner'
);
```

## Endpoint usati da Vapi

I tool definiti nel progetto puntano a questi endpoint:

1. `check_availability` -> `POST /api/vapi/availability`
2. `create_booking` -> `POST /api/vapi/bookings`
3. `cancel_booking` -> `POST /api/vapi/bookings`
4. `lookup_booking` -> `POST /api/vapi/bookings/lookup`
5. `get_business_info` -> `POST /api/vapi/business-info`

Webhook generale Vapi:

```text
POST /api/vapi/webhook
```

Con dominio completo:

```text
https://bitora-booking.vercel.app/api/vapi/webhook
```

## Nota importante sul mapping del business

Questo progetto identifica il business usando `message.call.assistantId` inviato da Vapi.

Questo significa che, dopo aver creato l'assistant su Vapi, devi salvare il suo ID nella colonna:

```text
businesses.vapi_assistant_id
```

Se non fai questo passaggio, i tool non sapranno quale attivita usare.

## Configurazione manuale nel dashboard Vapi

Apri il dashboard Vapi e crea un assistant nuovo.

### 1. Dati base assistant

Imposta questi valori:

```text
Name: Assistente <nome attivita>
Model provider: openai
Model: gpt-4o
Voice provider: 11labs
Language: italiano
```

Voce suggerita dal progetto:

```text
IKne3meq5aSn9XLyUdCD
```

Prima frase suggerita:

```text
Buongiorno! Benvenuto a <nome attivita>. Come posso aiutarla oggi?
```

### 2. System prompt

Puoi usare questo prompt iniziale:

```text
Sei l'assistente vocale di <nome attivita>, un'attivita di tipo "<tipo attivita>".

REGOLE IMPORTANTI:
- Rispondi sempre in italiano in modo cordiale e professionale.
- Usa un tono amichevole ma non troppo informale.
- Sii conciso nelle risposte vocali.

COSA PUOI FARE:
- Aiutare i clienti a prenotare un appuntamento
- Cancellare o modificare prenotazioni esistenti
- Fornire informazioni su orari e servizi disponibili
- Rispondere a domande generali sull'attivita

PROCEDURA PER PRENOTAZIONE:
1. Chiedi quale servizio desidera il cliente.
2. Chiedi la data preferita.
3. Usa il tool check_availability.
4. Proponi gli slot disponibili.
5. Chiedi nome e numero di telefono.
6. Usa il tool create_booking.
7. Conferma i dettagli della prenotazione.

PROCEDURA PER CANCELLAZIONE:
1. Chiedi il numero di telefono del cliente.
2. Usa il tool lookup_booking.
3. Conferma la prenotazione da cancellare.
4. Usa il tool cancel_booking.
5. Conferma la cancellazione.

Se il cliente chiede qualcosa che non puoi gestire, suggerisci di richiamare durante gli orari di apertura per parlare con un operatore.
```

### 3. Server URL del webhook

Nel campo `Server URL` imposta:

```text
https://bitora-booking.vercel.app/api/vapi/webhook
```

## Creazione dei tool

Ogni tool va creato come funzione remota che chiama un endpoint HTTP del progetto.

Se il pannello Vapi ti chiede `Name`, `Description`, `Parameters` e `Server URL`, usa i valori qui sotto.

Attenzione: non incollare il JSON completo del tool dentro il campo `Properties` o `Parameters` del pannello Vapi.

Nel dashboard Vapi i campi vanno compilati separatamente:

1. `Name`: solo il nome del tool
2. `Description`: solo la descrizione del tool
3. `Parameters`: solo lo schema JSON dei parametri
4. `Server URL`: solo l'URL HTTP del tool

Se incolli un oggetto completo come questo:

```json
{
  "name": "check_availability",
  "description": "...",
  "parameters": {
    "type": "object",
    "properties": {
        ...
    }
  },
  "serverUrl": "..."
}
```

nel campo `Parameters` o `Properties`, Vapi lo considera uno schema JSON non valido.

Quello che devi incollare nel campo `Parameters` e solo questo blocco:

```json
{
  "type": "object",
  "properties": {
    "date": {
      "type": "string",
      "description": "La data per cui controllare la disponibilita, formato YYYY-MM-DD"
    },
    "service_name": {
      "type": "string",
      "description": "Il nome del servizio richiesto (opzionale)"
    }
  },
  "required": ["date"]
}
```

### Tool 1: check_availability

Name:

```text
check_availability
```

Description:

```text
Controlla la disponibilita per una prenotazione in una data specifica. Restituisce gli slot orari disponibili.
```

Parameters:

```json
{
  "type": "object",
  "properties": {
    "date": {
      "type": "string",
      "description": "La data per cui controllare la disponibilita, formato YYYY-MM-DD"
    },
    "service_name": {
      "type": "string",
      "description": "Il nome del servizio richiesto (opzionale)"
    }
  },
  "required": ["date"]
}
```

Server URL:

```text
https://bitora-booking.vercel.app/api/vapi/availability
```

### Tool 2: create_booking

Name:

```text
create_booking
```

Description:

```text
Crea una nuova prenotazione per un cliente. Richiede nome, telefono, data e orario.
```

Parameters:

```json
{
  "type": "object",
  "properties": {
    "customer_name": {
      "type": "string",
      "description": "Nome completo del cliente"
    },
    "customer_phone": {
      "type": "string",
      "description": "Numero di telefono del cliente"
    },
    "date": {
      "type": "string",
      "description": "Data della prenotazione, formato YYYY-MM-DD"
    },
    "start_time": {
      "type": "string",
      "description": "Orario di inizio, formato HH:MM"
    },
    "service_name": {
      "type": "string",
      "description": "Nome del servizio richiesto (opzionale)"
    },
    "notes": {
      "type": "string",
      "description": "Note aggiuntive per la prenotazione (opzionale)"
    }
  },
  "required": ["customer_name", "customer_phone", "date", "start_time"]
}
```

Server URL:

```text
https://bitora-booking.vercel.app/api/vapi/bookings
```

### Tool 3: cancel_booking

Name:

```text
cancel_booking
```

Description:

```text
Cancella una prenotazione esistente. Cerca per numero di telefono e data.
```

Parameters:

```json
{
  "type": "object",
  "properties": {
    "customer_phone": {
      "type": "string",
      "description": "Numero di telefono del cliente"
    },
    "date": {
      "type": "string",
      "description": "Data della prenotazione da cancellare, formato YYYY-MM-DD"
    }
  },
  "required": ["customer_phone", "date"]
}
```

Server URL:

```text
https://bitora-booking.vercel.app/api/vapi/bookings
```

### Tool 4: lookup_booking

Name:

```text
lookup_booking
```

Description:

```text
Cerca le prenotazioni di un cliente tramite il numero di telefono.
```

Parameters:

```json
{
  "type": "object",
  "properties": {
    "customer_phone": {
      "type": "string",
      "description": "Numero di telefono del cliente"
    }
  },
  "required": ["customer_phone"]
}
```

Server URL:

```text
https://bitora-booking.vercel.app/api/vapi/bookings/lookup
```

### Tool 5: get_business_info

Name:

```text
get_business_info
```

Description:

```text
Ottieni informazioni sull'attivita: orari di apertura, servizi disponibili, indirizzo.
```

Parameters:

```json
{
  "type": "object",
  "properties": {}
}
```

Server URL:

```text
https://bitora-booking.vercel.app/api/vapi/business-info
```

## Salvare l'assistantId in Supabase

Dopo che Vapi ha creato l'assistant, copia l'ID e salvalo nella tabella `businesses`.

Esempio SQL:

```sql
update public.businesses
set vapi_assistant_id = 'assist_xxxxxxxxxxxxx'
where id = '<business_id>';
```

Se non conosci il tuo `business_id`, puoi recuperarlo con:

```sql
select id, name, vapi_assistant_id
from public.businesses;
```

## Variabili d'ambiente minime

Controlla che `.env.local` abbia almeno queste variabili:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
VAPI_API_KEY=...
NEXT_PUBLIC_APP_URL=https://bitora-booking.vercel.app
```

## Ordine corretto di test

Segui questo ordine:

1. verifica che il business esista su Supabase
2. verifica che servizi e disponibilita siano configurati
3. crea assistant su Vapi
4. crea i 5 tool
5. imposta il `Server URL` del webhook
6. salva l'`assistantId` nel business
7. fai un test dalla dashboard Vapi

## Script di test consigliato

### Test 1: informazioni attivita

Frase da dire:

```text
Quali servizi offrite e quali sono gli orari?
```

Atteso:

1. Vapi chiama `get_business_info`
2. la risposta contiene indirizzo, servizi e orari

### Test 2: disponibilita

Frase da dire:

```text
Vorrei prenotare per domani.
```

Atteso:

1. Vapi chiede eventuale servizio
2. chiama `check_availability`
3. legge gli slot disponibili

### Test 3: creazione prenotazione

Frase da dire:

```text
Mi chiamo Mario Rossi, il mio numero e 3331234567, va bene alle 15:00.
```

Atteso:

1. Vapi chiama `create_booking`
2. la prenotazione compare in `bookings`

### Test 4: ricerca prenotazione

Frase da dire:

```text
Ho gia una prenotazione, il mio numero e 3331234567.
```

Atteso:

1. Vapi chiama `lookup_booking`
2. legge le prenotazioni future associate al numero

### Test 5: cancellazione

Frase da dire:

```text
Voglio cancellare la mia prenotazione di domani, il mio numero e 3331234567.
```

Atteso:

1. Vapi chiama `lookup_booking`
2. poi chiama `cancel_booking`
3. la prenotazione passa a `cancelled`

## Problema noto da verificare

Il progetto definisce `cancel_booking` come tool che punta a `POST /api/vapi/bookings`, ma l'endpoint `bookings` espone in modo diretto soprattutto la creazione. La logica completa di `cancel_booking` e anche nel webhook generale.

Quindi:

1. `check_availability`, `create_booking`, `lookup_booking` e `get_business_info` sono i primi test da fare
2. se `cancel_booking` non parte correttamente, va corretto il routing lato progetto

## Come capire se tutto e collegato bene

La configurazione e corretta quando:

1. il test assistant di Vapi mostra le chiamate ai tool
2. gli endpoint rispondono senza errore 404 o 500
3. Supabase riceve prenotazioni e aggiornamenti
4. il business corretto viene risolto tramite `vapi_assistant_id`

## Consiglio pratico

Non partire dal numero telefonico reale. Prima fai funzionare il test assistant da dashboard Vapi. Solo dopo aggiungi un numero o un provider voce.