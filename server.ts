import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface BlueprintRequestBody {
  nickname?: string;
  characterWish?: string;
  worldWish?: string;
  earStyle?: 'auto' | 'elf' | 'cat' | 'bunny';
  favoriteColor?: string;
  atmosphereMood?: 'auto' | 'morning' | 'sunset' | 'night';
}

const VALID_THEMES = ['emerald', 'sakura', 'starlight', 'amber'] as const;
const VALID_HAIR_HATS = ['leaf_cap', 'flower_crown', 'star_hat'] as const;
const VALID_WINGS = ['butterfly', 'leaf', 'star'] as const;
const VALID_WANDS = ['crystal_wand', 'lantern_wand', 'blossom_wand'] as const;
const VALID_EARS = ['elf', 'cat', 'bunny'] as const;
const VALID_TIMES = ['morning', 'sunset', 'night'] as const;
const VALID_BIOMES = ['emerald', 'sakura', 'autumn'] as const;
const VALID_LAYOUTS = ['classic', 'plaza_pair', 'parkour'] as const;
const VALID_SURPRISES = ['extra_mushrooms', 'extra_fireflies', 'extra_flowers'] as const;
const VALID_WORLD_STYLES = ['forest', 'city'] as const;

function pickValid<T extends readonly string[]>(val: unknown, allowed: T, fallback: T[number]): T[number] {
  return typeof val === 'string' && (allowed as readonly string[]).includes(val)
    ? (val as T[number])
    : fallback;
}

function cleanHex(val: unknown, fallback: string): string {
  if (typeof val === 'string' && /^#[0-9a-fA-F]{6}$/.test(val.trim())) {
    return val.trim().toLowerCase();
  }
  return fallback;
}

function clampNum(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return Math.min(max, Math.max(min, val));
  }
  return fallback;
}

const BLUEPRINT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    worldTitle: {
      type: Type.STRING,
      description: 'Short fairy-tale world title in Chinese, 2 to 7 characters.',
    },
    guideSummary: {
      type: Type.STRING,
      description: 'Warm, playful Chinese message from Fairy Guide Linglan explaining the 3D sprite and world she built (40-80 characters).',
    },
    customGreeting: {
      type: Type.STRING,
      description: 'Warm greeting in Chinese from Elder Elwin mentioning the child sprite nickname and their created world.',
    },
    character: {
      type: Type.OBJECT,
      properties: {
        theme: { type: Type.STRING, description: 'One of: emerald, sakura, starlight, amber' },
        hairHat: { type: Type.STRING, description: 'One of: leaf_cap, flower_crown, star_hat' },
        wings: { type: Type.STRING, description: 'One of: butterfly, leaf, star' },
        wand: { type: Type.STRING, description: 'One of: crystal_wand, lantern_wand, blossom_wand' },
        earStyle: { type: Type.STRING, description: 'One of: elf, cat, bunny' },
        wingScale: { type: Type.NUMBER, description: 'Wing size multiplier between 0.75 and 1.55' },
        customColors: {
          type: Type.OBJECT,
          properties: {
            tunicHex: { type: Type.STRING, description: '6-digit hex color e.g. #7c3aed' },
            overskirtHex: { type: Type.STRING, description: '6-digit hex color e.g. #c4b5fd' },
            capeHex: { type: Type.STRING, description: '6-digit hex color e.g. #4c1d95' },
            hairHex: { type: Type.STRING, description: '6-digit hex color e.g. #f5d0fe' },
            bootHex: { type: Type.STRING, description: '6-digit hex color e.g. #3b2648' },
            wingColorHex: { type: Type.STRING, description: '6-digit hex color e.g. #e9d5ff' },
            wingEmissiveHex: { type: Type.STRING, description: '6-digit hex color e.g. #a855f7' },
            wandEmissiveHex: { type: Type.STRING, description: '6-digit hex color e.g. #f0abfc' },
          },
          required: [
            'tunicHex',
            'overskirtHex',
            'capeHex',
            'hairHex',
            'bootHex',
            'wingColorHex',
            'wingEmissiveHex',
            'wandEmissiveHex',
          ],
        },
      },
      required: ['theme', 'hairHat', 'wings', 'wand', 'earStyle', 'wingScale', 'customColors'],
    },
    map: {
      type: Type.OBJECT,
      properties: {
        worldStyle: {
          type: Type.STRING,
          description: 'One of: forest, city. Choose "city" if the user asks for city streets, buildings, skyscrapers, shops, town, or urban plaza; otherwise "forest".',
        },
        timeOfDay: { type: Type.STRING, description: 'One of: morning, sunset, night' },
        biome: { type: Type.STRING, description: 'One of: emerald, sakura, autumn' },
        layout: { type: Type.STRING, description: 'One of: classic, plaza_pair, parkour' },
        surprise: { type: Type.STRING, description: 'One of: extra_mushrooms, extra_fireflies, extra_flowers' },
        customColors: {
          type: Type.OBJECT,
          properties: {
            skyHex: { type: Type.STRING, description: 'Atmospheric background hex color suitable for the timeOfDay (not neon bright)' },
            fogHex: { type: Type.STRING, description: 'Atmospheric fog hex color matching skyHex' },
            groundTintHex: { type: Type.STRING, description: 'Soft tint hex for ground e.g. #d8f3dc' },
            foliageTintHex: { type: Type.STRING, description: 'Hex color for tree canopies or city shop/neon trim e.g. #f9a8d4' },
            fireflyHex: { type: Type.STRING, description: 'Hex color for glowing floating fireflies/lights e.g. #fde047' },
          },
          required: ['skyHex', 'fogHex', 'groundTintHex', 'foliageTintHex', 'fireflyHex'],
        },
      },
      required: ['worldStyle', 'timeOfDay', 'biome', 'layout', 'surprise', 'customColors'],
    },
  },
  required: ['worldTitle', 'guideSummary', 'customGreeting', 'character', 'map'],
};

const SYSTEM_INSTRUCTION =
  'You are Linglan (铃兰), the fairy 3D world designer in a gentle children-friendly 3D adventure game. ' +
  'Convert the child form wishes into a harmonious, vivid, child-friendly 3D blueprint JSON. ' +
  'If the child mentions city, streets, tall buildings, skyscrapers, or shops, set map.worldStyle to "city"; otherwise "forest". ' +
  'If the child mentions cat, kitten, or cat ears, set character.earStyle to "cat". If bunny/rabbit, set "bunny". ' +
  'Choose exact hex colors that genuinely match every color/material/atmosphere mentioned by the child. ' +
  'Keep skyHex and fogHex rich and atmospheric (darker/muted tones for night or twilight, soft warm or misty tones for morning/sunset) so glowing windows, lanterns, crystals, and fireflies pop beautifully. ' +
  'Respect explicit earStyle or atmosphereMood preferences if provided (not "auto"). ' +
  'All Chinese text fields must be warm, imaginative, natural, and safe for kids.';

async function callGeminiWithRetry(ai: GoogleGenAI, prompt: string) {
  const attempts: { model: string; thinkingLevel?: ThinkingLevel; delayMs: number }[] = [
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, delayMs: 0 },
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, delayMs: 1200 },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, delayMs: 800 },
  ];

  let lastError: unknown;
  for (const step of attempts) {
    if (step.delayMs > 0) {
      await new Promise((r) => setTimeout(r, step.delayMs));
    }
    try {
      return await ai.models.generateContent({
        model: step.model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: BLUEPRINT_SCHEMA,
          ...(step.thinkingLevel ? { thinkingConfig: { thinkingLevel: step.thinkingLevel } } : {}),
        },
      });
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Do not retry auth / invalid-key / bad-schema errors
      if (/400|401|403|404|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg)) {
        throw err;
      }
      // Retry on 429 / 503 / UNAVAILABLE / transient network failures
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/generate-blueprint', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(500).json({
        error: '尚未检测到有效的 GEMINI_API_KEY，请在 Settings > Secrets 面板中配置密钥后再试。',
      });
      return;
    }

    const body = (req.body ?? {}) as BlueprintRequestBody;
    const nickname = (body.nickname ?? '').trim().slice(0, 20) || '小露娜';
    const characterWish = (body.characterWish ?? '').trim().slice(0, 400);
    const worldWish = (body.worldWish ?? '').trim().slice(0, 400);
    const favoriteColor = (body.favoriteColor ?? '').trim().slice(0, 40);
    const earPref = body.earStyle ?? 'auto';
    const moodPref = body.atmosphereMood ?? 'auto';

    if (!characterWish && !worldWish) {
      res.status(400).json({
        error: '请至少填写一项「精灵样子」或「世界地图」的想法，铃兰才知道要怎么变魔法哦！',
      });
      return;
    }

    const prompt = [
      `小朋友的精灵昵称：${nickname}`,
      `对小精灵外形的描述：${characterWish || '由你搭配一个可爱灵动的小精灵'}`,
      `对世界地图的描述：${worldWish || '由你设计一个充满童话感的奇幻场景'}`,
      `耳朵偏好：${earPref === 'auto' ? '根据角色描述自动决定 (elf/cat/bunny)' : earPref}`,
      `天色偏好：${moodPref === 'auto' ? '根据世界描述自动决定 (morning/sunset/night)' : moodPref}`,
      favoriteColor ? `特别喜欢的颜色主题：${favoriteColor}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const response = await callGeminiWithRetry(ai, prompt);
      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('模型未返回有效蓝图内容，请稍后重试。');
      }

      const parsed = JSON.parse(rawText) as Record<string, any>;
      const rawChar = parsed.character ?? {};
      const rawCharColors = rawChar.customColors ?? {};
      const rawMap = parsed.map ?? {};
      const rawMapColors = rawMap.customColors ?? {};

      const resolvedEar =
        earPref !== 'auto'
          ? pickValid(earPref, VALID_EARS, 'elf')
          : pickValid(rawChar.earStyle, VALID_EARS, 'elf');
      const resolvedTime =
        moodPref !== 'auto'
          ? pickValid(moodPref, VALID_TIMES, 'morning')
          : pickValid(rawMap.timeOfDay, VALID_TIMES, 'morning');

      const blueprint = {
        spriteName: nickname,
        worldTitle: typeof parsed.worldTitle === 'string' && parsed.worldTitle.trim() ? parsed.worldTitle.trim().slice(0, 14) : '童话微光谷',
        guideSummary:
          typeof parsed.guideSummary === 'string' && parsed.guideSummary.trim()
            ? parsed.guideSummary.trim()
            : `好啦！我为${nickname}编织好了专属的童话形象与奇幻世界，快去奔跑跳跃试试看吧！`,
        customGreeting:
          typeof parsed.customGreeting === 'string' && parsed.customGreeting.trim()
            ? parsed.customGreeting.trim()
            : `早安，${nickname}！欢迎来到属于你的这片奇妙天地。`,
        character: {
          theme: pickValid(rawChar.theme, VALID_THEMES, 'emerald'),
          hairHat: pickValid(rawChar.hairHat, VALID_HAIR_HATS, 'leaf_cap'),
          wings: pickValid(rawChar.wings, VALID_WINGS, 'butterfly'),
          wand: pickValid(rawChar.wand, VALID_WANDS, 'crystal_wand'),
          earStyle: resolvedEar,
          wingScale: clampNum(rawChar.wingScale, 0.75, 1.55, 1.0),
          customColors: {
            tunicHex: cleanHex(rawCharColors.tunicHex, '#3b8f64'),
            overskirtHex: cleanHex(rawCharColors.overskirtHex, '#57b57c'),
            capeHex: cleanHex(rawCharColors.capeHex, '#245e43'),
            hairHex: cleanHex(rawCharColors.hairHex, '#7c4f33'),
            bootHex: cleanHex(rawCharColors.bootHex, '#593722'),
            wingColorHex: cleanHex(rawCharColors.wingColorHex, '#bef8e5'),
            wingEmissiveHex: cleanHex(rawCharColors.wingEmissiveHex, '#3ba88f'),
            wandEmissiveHex: cleanHex(rawCharColors.wandEmissiveHex, '#6ef7c8'),
          },
        },
        map: {
          worldStyle: pickValid(rawMap.worldStyle, VALID_WORLD_STYLES, 'forest'),
          timeOfDay: resolvedTime,
          biome: pickValid(rawMap.biome, VALID_BIOMES, 'emerald'),
          layout: pickValid(rawMap.layout, VALID_LAYOUTS, 'classic'),
          surprise: pickValid(rawMap.surprise, VALID_SURPRISES, 'extra_fireflies'),
          customColors: {
            skyHex: cleanHex(rawMapColors.skyHex, resolvedTime === 'night' ? '#0d1729' : resolvedTime === 'sunset' ? '#472830' : '#1f3a31'),
            fogHex: cleanHex(rawMapColors.fogHex, resolvedTime === 'night' ? '#0d1729' : resolvedTime === 'sunset' ? '#472830' : '#1f3a31'),
            groundTintHex: cleanHex(rawMapColors.groundTintHex, '#ffffff'),
            foliageTintHex: cleanHex(rawMapColors.foliageTintHex, '#3b7a52'),
            fireflyHex: cleanHex(rawMapColors.fireflyHex, '#d9f99d'),
          },
        },
      };

      res.json({ blueprint });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[/api/generate-blueprint error]:', msg);

      if (/PERMISSION_DENIED|API_KEY_INVALID|403|401/i.test(msg)) {
        res.status(403).json({
          error: 'Gemini API 密钥无效或无权限，请在 Settings > Secrets 面板检查您的 GEMINI_API_KEY。',
        });
        return;
      }
      if (/503|UNAVAILABLE|high demand/i.test(msg)) {
        res.status(503).json({
          error: 'Gemini 模型当前访问高峰暂时繁忙（503），请稍等几秒再点一次试试！',
        });
        return;
      }
      if (/RESOURCE_EXHAUSTED|429/i.test(msg)) {
        res.status(429).json({
          error: '当前请求过于频繁或免费层配额已达上限（429），请稍等片刻再试，或在 Settings > Secrets 中选用已开启结算的 API Key。',
        });
        return;
      }
      res.status(500).json({
        error: `生成 3D 蓝图失败：${msg}`,
      });
    }
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build artifacts not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fairy world server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
