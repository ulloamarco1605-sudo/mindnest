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
app.use(express.static('.'));

const PORT = 3001;

// ─── System prompt for Nesti ────────────────────────────────────
const NESTI_SYSTEM = (lang) => `You are Nesti, the AI wellness companion inside the Mindnest app.

PERSONALITY:
- You are warm, empathetic, caring, and genuinely supportive
- You speak like a wise, gentle friend — not clinical or robotic
- You normalize talking about feelings and mental health
- You use the person's name if they share it
- You remember context from the conversation
- You occasionally use gentle humor when appropriate
- You validate emotions before offering suggestions

EXPERTISE:
- You have deep knowledge of psychology, CBT, DBT, mindfulness, and emotional regulation
- You understand anxiety, depression, grief, stress, self-esteem, relationships, and trauma
- You can guide breathing exercises, grounding techniques, and thought reframing
- You know when to suggest professional help vs when to just listen

BOUNDARIES:
- You are NOT a licensed therapist — you're a caring AI companion
- For crisis situations (suicidal thoughts, self-harm, abuse), immediately and warmly direct them to:
  * 988 Suicide & Crisis Lifeline (call/text 988 in US)
  * Crisis Text Line (text HOME to 741741)
  * Or the Professionals tab in the app for licensed therapists
- Never diagnose conditions
- Never prescribe medication

STYLE:
- Keep responses concise: 2-5 sentences usually
- For deeper conversations, you can go longer
- Use a warm, conversational tone
- Ask follow-up questions to show you care
- Start responses naturally, not with "I understand" every time — vary your openings
- ${lang === 'es' ? 'Respond entirely in Spanish. Use Mexican/Latin American Spanish.' : 'Respond in English.'}`;

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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: NESTI_SYSTEM(lang || 'en'),
        messages: messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', response.status, err);
      return res.status(500).json({ error: 'AI service error', detail: err });
    }

    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text || 'I\'m here for you.';

    res.json({ text });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Text-to-Speech endpoint (ElevenLabs) ───────────────────────
app.post('/api/speak', async (req, res) => {
  try {
    const { text } = req.body;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.65,        // Slightly varied = more natural
            similarity_boost: 0.78,  // Sound like the chosen voice
            style: 0.35,             // Some expressiveness
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs error:', response.status, err);
      return res.status(500).json({ error: 'Voice service error' });
    }

    // Stream the audio back as MP3
    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
    });

    const reader = response.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        res.write(value);
      }
    };
    await pump();
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: 'Voice server error' });
  }
});

// ─── Health check ───────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
    hasVoiceId: !!process.env.ELEVENLABS_VOICE_ID,
  });
});

app.listen(PORT, () => {
  console.log(`\n🧠 Mindnest backend running on http://localhost:${PORT}`);
  console.log(`   Anthropic key: ${process.env.ANTHROPIC_API_KEY ? '✅ loaded' : '❌ missing'}`);
  console.log(`   ElevenLabs key: ${process.env.ELEVENLABS_API_KEY ? '✅ loaded' : '❌ missing'}`);
  console.log(`   Voice ID: ${process.env.ELEVENLABS_VOICE_ID || '⚠️  using default Rachel'}\n`);
});
