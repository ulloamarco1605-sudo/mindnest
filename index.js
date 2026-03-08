import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

config(); // Load .env

// ─── API KEYS LOADED DIRECTLY ────────────────────────────────────
process.env.ANTHROPIC_API_KEY = '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';
process.env.ELEVENLABS_API_KEY = 'sk_e25bdaa930d76d878b7629a95aaabb7f7c577dc0fa1aa0c1';
process.env.ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = 3001;

// ─── THE FULL PROTOTYPE INTERFACE ───────────────────────────────
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mindnest | Your Wellness Companion</title>
        <style>
            :root { --bg: #0f172a; --card: #1e293b; --accent: #10b981; --text: #f8fafc; }
            body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; display: flex; height: 100vh; }
            
            /* Sidebar Navigation */
            .sidebar { width: 260px; background: #020617; padding: 20px; display: flex; flex-direction: column; gap: 20px; border-right: 1px solid #334155; }
            .nav-item { padding: 12px; border-radius: 8px; cursor: pointer; transition: 0.3s; color: #94a3b8; }
            .nav-item.active { background: var(--accent); color: white; }
            .nav-item:hover:not(.active) { background: #1e293b; color: white; }

            /* Main Content Area */
            .main { flex: 1; display: flex; flex-direction: column; padding: 40px; align-items: center; }
            .app-container { width: 100%; max-width: 600px; background: var(--card); border-radius: 24px; display: flex; flex-direction: column; height: 80vh; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
            
            /* Chat Interface */
            #chat-window { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; scroll-behavior: smooth; }
            .msg { max-width: 80%; padding: 12px 16px; border-radius: 16px; line-height: 1.5; font-size: 15px; }
            .user { align-self: flex-end; background: var(--accent); color: white; border-bottom-right-radius: 4px; }
            .nesti { align-self: flex-start; background: #334155; color: white; border-bottom-left-radius: 4px; border: 1px solid #475569; }

            /* Input Area */
            .input-area { padding: 20px; background: #0f172a; display: flex; gap: 12px; }
            input { flex: 1; background: #1e293b; border: 1px solid #334155; color: white; padding: 14px; border-radius: 12px; outline: none; }
            button { background: var(--accent); border: none; color: white; padding: 0 24px; border-radius: 12px; font-weight: bold; cursor: pointer; }
            
            .status { font-size: 12px; color: #64748b; margin-top: 8px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="sidebar">
            <h2 style="color:var(--accent)">Mindnest</h2>
            <div class="nav-item active">🏠 Dashboard</div>
            <div class="nav-item">🧘 Meditation</div>
            <div class="nav-item">📊 Wellness Log</div>
            <div class="nav-item">💬 Talk to Nesti</div>
        </div>
        <div class="main">
            <div class="app-container">
                <div style="padding: 20px; border-bottom: 1px solid #334155; text-align:center">
                    <h3 style="margin:0">Nesti AI Companion</h3>
                    <span style="font-size:12px; color:#10b981">● Online & Listening</span>
                </div>
                <div id="chat-window">
                    <div class="msg nesti">Hi! I'm Nesti. How are you feeling today?</div>
                </div>
                <div class="input-area">
                    <input type="text" id="userInput" placeholder="Type your message..." onkeypress="if(event.key==='Enter') sendMessage()">
                    <button onclick="sendMessage()">Send</button>
                </div>
            </div>
            <div class="status" id="statusText">Voice output enabled</div>
        </div>

        <script>
            async function sendMessage() {
                const input = document.getElementById('userInput');
                const window = document.getElementById('chat-window');
                const status = document.getElementById('statusText');
                const text = input.value.trim();
                if(!text) return;

                // Add User Message
                window.innerHTML += \`<div class="msg user">\${text}</div>\`;
                input.value = '';
                window.scrollTop = window.scrollHeight;
                status.innerText = "Nesti is thinking...";

                try {
                    // 1. Get AI Response
                    const chatRes = await fetch('/api/chat', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ messages: [{role: 'user', content: text}] })
                    });
                    const chatData = await chatRes.json();
                    
                    // Add Nesti Message
                    window.innerHTML += \`<div class="msg nesti">\${chatData.text}</div>\`;
                    window.scrollTop = window.scrollHeight;
                    status.innerText = "Nesti is speaking...";

                    // 2. Get Voice Response
                    const voiceRes = await fetch('/api/speak', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ text: chatData.text })
                    });
                    const audioBlob = await voiceRes.blob();
                    const audio = new Audio(URL.createObjectURL(audioBlob));
                    audio.play();
                    
                    audio.onended = () => { status.innerText = "Voice output enabled"; };

                } catch (err) {
                    status.innerText = "Error connecting to Nesti.";
                }
            }
        </script>
    </body>
    </html>
  `);
});

// ─── AI LOGIC (BACKEND) ─────────────────────────────────────────
const NESTI_SYSTEM = "You are Nesti, a warm, empathetic AI wellness companion. Keep responses concise (2-3 sentences).";

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
        system: NESTI_SYSTEM,
        messages: messages
      })
    });
    const data = await response.json();
    res.json({ text: data.content[0].text });
  } catch (err) { res.status(500).json({ error: 'AI failed' }); }
});

app.post('/api/speak', async (req, res) => {
  try {
    const { text } = req.body;
    const response = await fetch(\`https://api.elevenlabs.io/v1/text-to-speech/\${process.env.ELEVENLABS_VOICE_ID}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' })
    });
    const buffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg').send(Buffer.from(buffer));
  } catch (err) { res.status(500).json({ error: 'Voice failed' }); }
});

app.listen(PORT, () => console.log(\`Mindnest Live on port \${PORT}\`));
