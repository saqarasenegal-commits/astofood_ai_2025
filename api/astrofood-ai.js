
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Préflight
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const body = req.body || {};
  const sign = body.sign || "Poissons";
  const lang = body.lang || "fr";

  // 1️⃣ lire la clé
  const apiKey = process.env.OPENAI_API_KEY;

  // 2️⃣ si PAS de clé → on répond quand même AVEC un text
  if (!apiKey) {
    return res.status(200).json({
      ok: false,
      text: `⚠️ IA non activée sur le serveur (clé absente).
Tu as demandé une recette pour : ${sign} (${lang}).
La connexion Vercel → OpenAI fonctionne, mais il faut mettre OPENAI_API_KEY dans Settings → Environment Variables.`
    });
  }

  // 3️⃣ si clé présente → on tente OpenAI
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
          { role: "system", content: "Tu es Chef-AI d'AstroFood. Tu donnes des recettes courtes, locales, astrologiques." },
          { role: "user", content: `Donne une recette pour le signe ${sign} en ${lang}.` }
        ],
        max_tokens: 280
      })
    });

    const data = await openaiRes.json();

    // si OpenAI a bien répondu
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      return res.status(200).json({ ok: true, text: content });
    }

    // sinon on renvoie un texte lisible
    return res.status(200).json({
      ok: false,
      text: "⚠️ OpenAI n’a pas renvoyé de texte. Vérifie le modèle ou les quotas.",
      raw: data
    });
  } catch (err) {
    // 4️⃣ si erreur réseau → on renvoie un texte aussi
    return res.status(200).json({
      ok: false,
      text: "❌ Erreur lors de l’appel OpenAI : " + err.message
    });
  }
}
