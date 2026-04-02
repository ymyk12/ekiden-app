const { onCall, HttpsError } = require("firebase-functions/v2/https");

exports.analyzeDiaryImage = onCall({ cors: true }, async (request) => {
  const { prompt, base64Image, mimeType } = request.data;

  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    throw new HttpsError("internal", "サーバーにAPIキーが設定されていません");
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { data: base64Image, mimeType: mimeType } },
              ],
            },
          ],
        }),
      },
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    return data;
  } catch (error) {
    throw new HttpsError(
      "internal",
      "Gemini APIの呼び出しに失敗しました: " + error.message,
    );
  }
});
