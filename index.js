import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

config(); // Load .env
process.env.ANTHROPIC_API_KEY = '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';
process.env.ELEVENLABS_API_KEY = 'sk_e25bdaa930d76d878b7629a95aaabb7f7c577dc0fa1aa0c1';
process.env.ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = 3001;

// ─── The "FACE" of the App (Your Prototype) ─────────────────────
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Mindnest Prototype</title>
        <style>
            body { background: #121212; color: white; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            #app { width: 400px; background: #1e1e1e; padding: 20px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; }
            #chat { height: 300px; overflow-y: auto; margin-bottom: 10px; padding: 10px; border-bottom: 1px solid #333; text-align: left; }
            input { width: 100%; padding: 12px; background: #2a2a2a; border: none; color: white; border-radius: 8px; box-sizing: border-box; outline: none; }
            .nesti { color: #4ade80; margin: 10px 0; }
            .user { color: #60a5fa; text-align: right; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div id="app">
            <h2>Mindnest: Nesti</h2>
            <div id="chat"></div>
            <input type="text" id="input" placeholder="Type to Nesti..." onkeypress="if(event.key==='Enter') send()">
        </div>
        <script>
            async function send() {
                const input = document.getElementById('input');
                const chat = document.getElementById('chat');
                const val = input.value;
                if(!val) return;
                
                chat.innerHTML += '<div class="user">' + val + '</div>';
                input.value = '';

                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ messages: [{role:'user', content: val}] })
                });
                const data = await res.json();
                chat.innerHTML += '<div class="nesti"><b>Nesti:</b> ' + data.text + '</div>';
                chat.scrollTop = chat.scrollHeight;

                const voice = await fetch('/api/speak', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ text: data.text })
                });
                const blob = await voice.blob();
                new Audio(URL.createObjectURL(blob)).play();
            }
        </script>
    </body>
    </html>
  `);
});

// ─── System prompt for Nesti ────────────────────────────────────
const NESTI_SYSTEM = (lang) => `You are Nesti, the AI wellness companion...`; 

// ─── Chat endpoint (Claude AI) ──────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lang } = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 800,
        system: "You are Nesti, a warm wellness companion.",
        messages: messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
    });
    const data = await response.json();
    res.json({ text: data.content[0].text });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── Text-to-Speech endpoint (ElevenLabs) ───────────────────────
app.post('/api/speak', async (req, res) => {
  try {
    const { text } = req.body;
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
    });
    const arrayBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg').send(Buffer.from(arrayBuffer));
  } catch (err) { res.status(500).json({ error: 'Voice error' }); }
});

app.listen(PORT, () => {
  console.log(`🧠 Mindnest running on http://localhost:${PORT}`);
});
