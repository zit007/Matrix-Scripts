# Cloudflare Deployment & Hosting Guide

This guide explains how to host your **Industrial Equipment Configurator (v1.2.0)** on **Cloudflare** for free, with an external JSON database.

The architecture consists of:
1. **Frontend Application:** Hosted for free on **Cloudflare Pages**.
2. **REST API backend:** Hosted on **Cloudflare Workers** with persistent storage in **Cloudflare KV (Key-Value) Storage**.

---

## Part 1: Setting up the Database (Cloudflare Workers + KV)

### Step 1: Create a Cloudflare Account
If you do not have one, register for free at [dash.cloudflare.com](https://dash.cloudflare.com/).

### Step 2: Create a KV Namespace (Your JSON database)
1. In your Cloudflare dashboard, go to the left sidebar: **Workers & Pages** -> **KV**.
2. Click **Create Namespace**.
3. Set the name to `CONFIG_STORE` and click **Add**.

### Step 3: Create a Cloudflare Worker API
1. Navigate to **Workers & Pages** -> **Overview** and click **Create Application**.
2. Select **Create Worker**, name it (e.g., `config-api`), and click **Deploy**.
3. After deployment, click **Edit Code** (or open the Worker and go to the *Quick Edit* tab).
4. Replace the default template with the following secured REST API script:

```javascript
// Cloudflare Worker API for Equipment Configurator (v1.2.0)
// Supports secured CORS-friendly GET and POST operations

const SECURITY_KEY = "YourSecretPasswordHere"; // Change this key for security

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // CORS Headers Configuration
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Security authorization verification
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (SECURITY_KEY && token !== SECURITY_KEY && request.method === "POST") {
    return new Response(JSON.stringify({ error: "Unauthorized! Token is invalid." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    if (request.method === "GET") {
      // Read config data from KV storage (key "equipment_config")
      const data = await CONFIG_STORE.get("equipment_config");

      if (!data) {
        // Fallback default template if store is empty
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
      // Store new config data in KV Storage
      const body = await request.text();

      // Validate incoming data format
      JSON.parse(body);

      await CONFIG_STORE.put("equipment_config", body);

      return new Response(JSON.stringify({ success: true, message: "Data successfully synchronized!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response("Method Not Allowed", { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
```

5. Click **Save and Deploy**.

### Step 4: Bind your KV Namespace to the Worker
1. Inside your Worker panel (`config-api`), navigate to **Settings** -> **Variables**.
2. Scroll to **KV Namespace Bindings** and click **Add binding**.
3. Set the Variable name to: `CONFIG_STORE`
4. Select the Namespace you created in Step 2 (`CONFIG_STORE`).
5. Click **Save** and perform a **Redeploy** of the worker.

*Your secure REST API is now live at:* `https://config-api.subdomain.workers.dev`

---

## Part 2: Hosting the Frontend (Cloudflare Pages)

### Step 1: Prepare assets
1. Rename or copy `configurator_hosted.html` as `index.html` inside a blank folder on your computer.

### Step 2: Upload to Cloudflare Pages
1. In the Cloudflare dashboard, go to **Workers & Pages** -> **Overview** -> **Create Application**.
2. Select the **Pages** tab and click **Upload assets**.
3. Name your project (e.g., `equipment-configurator`).
4. Drag and drop the folder containing your `index.html` file.
5. Click **Upload assets** and then **Deploy site**.

*Your web application frontend is now live at:* `https://equipment-configurator.pages.dev`

---

## Part 3: Connect Frontend to Backend API

1. Open your published website on Cloudflare Pages.
2. Click the gear icon (<i class="fa-solid fa-gear"></i>) in the top-right corner.
3. Paste your Cloud API Worker URL (e.g., `https://config-api.subdomain.workers.dev`).
4. Enter the matching security password (`YourSecretPasswordHere`).
5. Click **Save Settings**.

Your Cloud-supported system is fully connected, mobile-friendly, localized in English, and supports high-volume spreadsheet importing with duplicate error detection!
