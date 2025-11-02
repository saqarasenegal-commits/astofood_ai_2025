export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Préflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // 🔎 MODE DEBUG VIA GET
  // https://ton-site.vercel.app/api/astrofood-ai?debug=1
  if (req.method === "GET") {
    const isDebug =
      (req.query && req.query.debug === "1") ||
      (req.url && req.url.includes("debug=1"));

    if (isDebug) {
      const apiKey = process.env.OPENAI_API_KEY;
      return res.status(200).json({
        ok: true,
        message: "Debug AstroFood API",
        hasKey: !!apiKey,
        keyPreview: apiKey ? apiKey.slice(0, 6) + "..." : null,
        env: process.env.VERCEL_ENV || "unknown",
        note:
          "Si hasKey = false, c'est que la variable n'est pas définie dans CE projet Vercel (Settings → Environment Variables → OPENAI_API_KEY)."
      });
    }

    // GET normal → on dit d'utiliser POST
    return res.status(405).json({ error: "Use POST" });
  }

  // À partir d'ici : POST normal
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const body = req.body || {};
  const sign = body.sign || "Poissons";
  const lang = body.lang || "fr";

  const apiKey = process.env.OPENAI_API_KEY;

  // 🟣 PAS DE CLÉ → on répond quand même avec un texte (ce que tu vois actuellement)
  if (!apiKey) {
    return res.status(200).json({
      ok: false,
      text: `⚠️ IA non activée sur le serveur (clé absente).
Tu as demandé une recette pour : ${sign} (${lang}).
➡️ Va dans Vercel → ton projet **astrofood-ai-2025-chi** → Settings → Environment Variables → ajoute OPENAI_API_KEY → mets ta clé → Save → Redeploy.`
    });
  }

  // 🟢 CLÉ PRÉSENTE → on appelle OpenAI
  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Tu es Chef-AI d'AstroFood. Tu donnes des recettes gastronomiques, courtes, adaptées au signe, avec parfois des ingrédients africains."
          },
          {
            role: "user",
            content: `Donne une recette astro pour le signe ${sign} en ${lang}.`
          }
        ],
        max_tokens: 280
      })
    });

    const data = await openaiRes.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(200).json({
        ok: false,
        text: "⚠️ OpenAI a répondu sans contenu. Vérifie ton compte / ton modèle.",
        raw: data
      });
    }

    return res.status(200).json({ ok: true, text: content });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      text: "❌ Erreur lors de l'appel OpenAI : " + err.message
    });
  }
}

