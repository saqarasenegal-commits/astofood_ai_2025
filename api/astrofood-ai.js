export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  // --- DEBUG GET ---
  if (req.method === "GET") {
    const isDebug = req.url && req.url.includes("debug=1");
    const apiKey = process.env.OPENAI_API_KEY;
    if (isDebug) {
      return res.status(200).json({
        ok: true,
        hasKey: !!apiKey,
        keyPreview: apiKey ? apiKey.slice(0, 6) + "..." : null,
        env: process.env.VERCEL_ENV || "unknown"
      });
    }
    return res.status(405).json({ error: "Use POST" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      ok: false,
      text: "⚠️ IA non activée (clé absente)."
    });
  }

  const body = req.body || {};
  const sign = body.sign || "Poissons";
  const lang = body.lang || "fr";

  try {
    // ✅ endpoint adapté aux project keys
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // tu peux changer ici si ton projet n'a pas ce modèle
        input: [
          {
            role: "system",
            content:
              "Tu es Chef-AI d'AstroFood. Tu génères des recettes astrologiques courtes, adaptées au signe, avec parfois des ingrédients sénégalais."
          },
          {
            role: "user",
            content: `Propose une recette complète pour le signe ${sign} en ${lang}. Donne titre, ingrédients, préparation.`
          }
        ],
        max_output_tokens: 280
      })
    });

    const data = await r.json();

    // si OpenAI renvoie une erreur claire
    if (data.error) {
      return res.status(200).json({
        ok: false,
        text:
          "❌ OpenAI a répondu avec une erreur : " +
          data.error.message +
          "\n➡️ Vérifie que ce projet a accès au modèle demandé."
      });
    }

    // format /v1/responses → la réponse est souvent dans data.output[0].content[0].text
    const text =
      data?.output?.[0]?.content?.[0]?.text ||
      data?.output_text ||
      data?.choices?.[0]?.message?.content ||
      null;

    if (!text) {
      return res.status(200).json({
        ok: false,
        text: "⚠️ OpenAI a répondu sans contenu exploitable (endpoint /v1/responses)."
      });
    }

    return res.status(200).json({
      ok: true,
      text
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      text: "❌ Erreur d'appel OpenAI : " + err.message
    });
  }
}

