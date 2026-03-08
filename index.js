import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

config(); 

// ─── API KEYS ──────────────────────────────────────────────────
process.env.ANTHROPIC_API_KEY = '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';
process.env.ELEVENLABS_API_KEY = 'sk_e25bdaa930d76d878b7629a95aaabb7f7c577dc0fa1aa0c1';
process.env.ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = 3001;

// ─── THE FULL PROTOTYPE INTERFACE ───────────────────────────────
app.get('/', (req, res) => {
  // We use a regular string here to avoid backtick syntax errors
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mindnest Prototype</title>
        <style>
            body { background: #0f172a; color: white; font-family: sans-serif; margin: 0; display: flex; height: 100vh; }
            .sidebar { width: 250px; background: #020617; padding: 20px; border-right: 1px solid #334155; }
            .main { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 40px; }
            .app-container { width: 100%; max-width: 600px; background: #1e293b; border-radius: 20px; height: 80vh; display: flex; flex-direction: column; overflow: hidden; }
            #chat-window { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; }
            .msg { padding: 12px; border-radius: 12px; max-width: 80%; }
            .user { align-self: flex-end; background: #10b981; }
            .nesti { align-self: flex-start; background: #334155; }
            .input-area { padding: 20px; background: #0f172a; display: flex; gap: 10px; }
            input { flex: 1; padding: 12px; border-radius: 8px; border: none; background: #1e293b; color: white; }
            button { background: #10b981; border: none; color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="sidebar"><h2>Mindnest</h2><p>Dashboard</p><p>Nesti AI</p></div>
        <div class="main">
            <div class="app-container">
                <div id="chat-window"><div class="msg nesti">I am Nesti. How can I help you today?</div></div>
                <div class="input-area">
                    <input type="text" id="userInput" placeholder="Type here...">
                    <button id="sendBtn">Send</button>
                </div>
            </div>
        </div>
        <script>
            const btn = document.getElementById('sendBtn');
            const input = document.getElementById('userInput');
            const chat = document.getElementById('chat-window');

            btn.onclick = async () => {
                const text = input.value;
                if(!text) return;
                chat.innerHTML += '<div class="msg user">' + text + '</div>';
                input.value = '';

                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ messages: [{role: 'user', content: text}] })
                });
                const data = await res.json();
                chat.innerHTML += '<div class="msg nesti">' + data.text + '</div>';

                const vRes = await fetch('/api/speak', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ text: data.text })
                });
                const blob = await vRes.blob();
                new Audio(URL.createObjectURL(blob)).play();
            };
        </script>
    </body>
    </html>`;
  res.send(html);
});

// ─── AI LOGIC ──────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 400,
        messages: messages
      })
    });
    const data = await response.json();
    res.json({ text: data.content[0].text });
  } catch (err) { res.status(500).json({ error: 'AI Error' }); }
});

app.post('/api/speak', async (req, res) => {
  try {
    const { text } = req.body;
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' })
    });
    const buffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg').send(Buffer.from(buffer));
  } catch (err) { res.status(500).json({ error: 'Voice Error' }); }
});

app.listen(PORT, () => console.log('Server Live on ' + PORT));
