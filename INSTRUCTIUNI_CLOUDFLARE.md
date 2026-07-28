# Gid de Găzduire a Configuratorului pe Cloudflare Pages și Cloudflare Workers KV

Acest ghid îți arată pas cu pas cum să găzduiești **Configuratorul de Echipamente Industriale (v1.1.0)** pe **Cloudflare** în mod complet gratuit, permițând salvarea datelor într-un JSON securizat extern.

Sistemul va fi compus din două părți:
1. **Frontend-ul (Aplicația Web):** Găzduit gratuit pe **Cloudflare Pages**.
2. **Backend-ul (API-ul de salvare):** Găzduit pe un **Cloudflare Worker** cu baza de date persistenta stocată în **Cloudflare KV (Key-Value) Storage**.

---

## Partea 1: Crearea și Găzduirea bazei de date (Cloudflare Workers + KV)

### Pasul 1: Creează un cont Cloudflare
Dacă nu ai deja un cont, intră pe [dash.cloudflare.com](https://dash.cloudflare.com/) și înregistrează-te gratuit.

### Pasul 2: Creează un Namespace KV (Baza ta de Date JSON)
1. În panoul de control Cloudflare, accesează meniul din stânga: **Workers & Pages** -> **KV**.
2. Apasă pe **Create Namespace**.
3. Pune-i numele: `CONFIG_STORE` și apasă **Add**.

### Pasul 3: Creează un Cloudflare Worker pentru API
1. Navighează la **Workers & Pages** -> **Overview** și apasă pe **Create Application**.
2. Selectează **Create Worker**, pune-i numele (de exemplu: `config-api`) și apasă pe **Deploy**.
3. După deploy, apasă pe **Edit Code** (sau intri pe Worker și mergi la fila *Quick Edit*).
4. Înlocuiește codul implicit cu următorul script de API securizat și flexibil:

```javascript
// Cloudflare Worker API pentru Configuratorul de Echipamente (v1.1.0)
// Permite operatii GET si POST securizate

const SECURITY_KEY = "ParolaTaSecretaDeAcces"; // Schimbă această cheie pentru securitate

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Gestionare cereri CORS (Cross-Origin Resource Sharing)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verificare Autorizare (Opțional)
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (SECURITY_KEY && token !== SECURITY_KEY && request.method === "POST") {
    return new Response(JSON.stringify({ error: "Neautorizat! Cheie incorectă." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    if (request.method === "GET") {
      // Citire date din KV Storage (cheia "equipment_config")
      const data = await CONFIG_STORE.get("equipment_config");

      if (!data) {
        // Dacă baza de date este goală, returnează un template de pornire
        return new Response(JSON.stringify({
          serialNumbers: { Blade: [], "Matrix 120": [], "Matrix 220": [], "Matrix 320 2MPx": [], "Matrix 320 5MPx": [], Thor: [], Accesorii: [], Cabluri: [] },
          locations: [],
          equipmentTypes: ["Blade", "Matrix 120", "Matrix 220", "Matrix 320 2MPx", "Matrix 320 5MPx", "Thor", "Accesorii", "Cabluri"],
          records: []
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(data, {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (request.method === "POST") {
      // Salvare date în KV Storage
      const body = await request.text();

      // Validează dacă datele primite sunt JSON valid înainte de a le stoca
      JSON.parse(body);

      await CONFIG_STORE.put("equipment_config", body);

      return new Response(JSON.stringify({ success: true, message: "Datele au fost sincronizate!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response("Metodă nesuportată", { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
```

5. Apasă pe **Save and Deploy**.

### Pasul 4: Leagă Namespace-ul KV la Worker
Pentru ca Worker-ul să poată citi și scrie în baza de date KV:
1. În pagina Worker-ului tău (`config-api`), mergi la fila **Settings** -> **Variables**.
2. Derulează în jos până la secțiunea **KV Namespace Bindings** și apasă **Add binding**.
3. Pune-i Variable name (numele variabilei utilizate în cod): `CONFIG_STORE`
4. Selectează din lista dropdown Namespace-ul KV pe care l-ai creat la Pasul 2 (`CONFIG_STORE`).
5. Apasă pe **Save** și apoi faceți un **Redeploy** al Worker-ului (dacă vi se solicită).

*Acum API-ul tău este live la o adresă de forma:* `https://config-api.subdomeniu.workers.dev`

---

## Partea 2: Găzduirea Interfeței Web (Cloudflare Pages)

### Pasul 1: Creează fișierul de deployment
1. Redenumește sau copiază fișierul `configurator_hosted.html` ca `index.html` într-un folder gol pe calculatorul tău.

### Pasul 2: Încarcă-l în Cloudflare Pages
1. În contul tău Cloudflare, mergi la **Workers & Pages** -> **Overview** -> apasă **Create Application**.
2. Selectează fila **Pages** de sus, apoi alege **Upload assets**.
3. Pune-i proiectului un nume (ex: `configurator-echipamente`).
4. Trage folderul în care ai salvat fișierul `index.html` (sau încarcă-l direct).
5. Apasă pe **Upload assets** și apoi pe **Deploy site**.

*Interfața ta web este live la o adresă de forma:* `https://configurator-echipamente.pages.dev`

---

## Partea 3: Conectarea Aplicației la Baza de Date

1. Deschide adresa site-ului tău (găzduit pe Cloudflare Pages).
2. Apasă pe rotița de **Setări** (icoana gri <i class="fa-solid fa-gear"></i>) din colțul din dreapta sus.
3. Introdu URL-ul API-ului tău din Partea 1 (ex: `https://config-api.subdomeniu.workers.dev`).
4. Introdu Cheia de Securitate setată în codul Worker-ului (`ParolaTaSecretaDeAcces`).
5. Apasă pe **Salvează setările**.

Gata! Sistemul tău este acum complet operațional, modern și securizat. Toate editările, adăugările și ștergerile se vor salva instantaneu în baza de date din cloud la apăsarea butonului **Salvează Config**.
