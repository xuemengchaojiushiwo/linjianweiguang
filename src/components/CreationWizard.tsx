import { ArrowLeft, ArrowRight, Eye, Loader2, Sparkles, Wand2, X } from 'lucide-react';
import { useState } from 'react';
import type {
  BiomeId,
  EarStyleId,
  HairHatStyleId,
  LayoutPresetId,
  SpriteThemeId,
  TimeOfDayId,
  WandStyleId,
  WingStyleId,
  WorldCreationConfig,
  WorldSurpriseId,
} from '../game/types';

interface CreationWizardProps {
  config: WorldCreationConfig;
  onChangeConfig: (next: WorldCreationConfig) => void;
  onStageChange: (stage: 'character' | 'map') => void;
  onFinish: () => void;
}

interface WizardOption {
  value: string;
  label: string;
  hint: string;
  swatch?: string;
}

interface WizardStep {
  id: string;
  stage: 'character' | 'map';
  stageTitle: string;
  question: string;
  options: WizardOption[];
  getValue: (cfg: WorldCreationConfig) => string;
  applyValue: (cfg: WorldCreationConfig, val: string) => WorldCreationConfig;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'theme',
    stage: 'character',
    stageTitle: '第一幕 · 唤醒你的小精灵 (1/4)',
    question: '「你好呀小旅人！欢迎来到精灵林涧。先选一身最喜欢的小精灵裙装配色吧，你想成为哪种小精灵呢？」',
    getValue: (c) => c.character.theme,
    applyValue: (c, v) => ({
      ...c,
      character: { ...c.character, theme: v as SpriteThemeId, customColors: undefined },
    }),
    options: [
      { value: 'emerald', label: '林涧绿芽', hint: '翠绿叶裙与棕发', swatch: '#3b8f64' },
      { value: 'sakura', label: '樱粉花仙', hint: '粉白花瓣裙与金发', swatch: '#df6e93' },
      { value: 'starlight', label: '星夜月灵', hint: '星空蓝袍与银蓝发', swatch: '#3b4d9b' },
      { value: 'amber', label: '蜜糖琥珀', hint: '暖橙枫裙与栗棕发', swatch: '#d97724' },
    ],
  },
  {
    id: 'hairHat',
    stage: 'character',
    stageTitle: '第一幕 · 唤醒你的小精灵 (2/4)',
    question: '「裙子真合身！接下来要搭配什么发型和头饰呢？试着点一点，看看镜子里的变化吧。」',
    getValue: (c) => c.character.hairHat,
    applyValue: (c, v) => ({ ...c, character: { ...c.character, hairHat: v as HairHatStyleId } }),
    options: [
      { value: 'leaf_cap', label: '卷卷短发 + 森林叶帽', hint: '带金色小铃铛的尖叶帽' },
      { value: 'flower_crown', label: '双马尾辫 + 繁花花冠', hint: '七朵晨露鲜花编织的花环' },
      { value: 'star_hat', label: '长发披肩 + 星月巫师帽', hint: '镶着星星徽章的魔法帽' },
    ],
  },
  {
    id: 'wings',
    stage: 'character',
    stageTitle: '第一幕 · 唤醒你的小精灵 (3/4)',
    question: '「小精灵怎么能少了会振翅飞翔的羽翼呢？你想要哪一种形状的翅膀？」',
    getValue: (c) => c.character.wings,
    applyValue: (c, v) => ({ ...c, character: { ...c.character, wings: v as WingStyleId } }),
    options: [
      { value: 'butterfly', label: '虹彩蝶翼', hint: '圆润优美的蝴蝶双翼' },
      { value: 'leaf', label: '叶脉蝉翼', hint: '细长透亮的林间脉络翼' },
      { value: 'star', label: '星芒晶翼', hint: '闪耀棱角的星辰光翼' },
    ],
  },
  {
    id: 'wand',
    stage: 'character',
    stageTitle: '第一幕 · 唤醒你的小精灵 (4/4)',
    question: '「最后挑一件顺手的魔法小物带在身边，冒险时它会为你照亮森林哦！」',
    getValue: (c) => c.character.wand,
    applyValue: (c, v) => ({ ...c, character: { ...c.character, wand: v as WandStyleId } }),
    options: [
      { value: 'crystal_wand', label: '晨露宝石杖', hint: '镶嵌发光晶石的藤蔓法杖' },
      { value: 'lantern_wand', label: '萤火小提灯', hint: '温暖微光的黄铜弯钩提灯' },
      { value: 'blossom_wand', label: '花铃嫩枝', hint: '开着五瓣鲜花的春天花枝' },
    ],
  },
  {
    id: 'timeOfDay',
    stage: 'map',
    stageTitle: '第二幕 · 编织你的精灵地图 (1/4)',
    question: '「小精灵打扮好啦！现在我们把镜头拉远，一起布置属于你的精灵山谷——你喜欢什么时刻的天空？」',
    getValue: (c) => c.map.timeOfDay,
    applyValue: (c, v) => ({
      ...c,
      map: { ...c.map, timeOfDay: v as TimeOfDayId, customColors: undefined },
    }),
    options: [
      { value: 'morning', label: '晨光微露', hint: '清澈蓝绿雾气与朝阳', swatch: '#34d399' },
      { value: 'sunset', label: '黄金夕照', hint: '暖橘霞光与蜂蜜晚风', swatch: '#fb923c' },
      { value: 'night', label: '萤火月夜', hint: '深蓝夜空与漫天萤火虫', swatch: '#60a5fa' },
    ],
  },
  {
    id: 'biome',
    stage: 'map',
    stageTitle: '第二幕 · 编织你的精灵地图 (2/4)',
    question: '「山谷里的树木与草地，想染成哪个季节的颜色呢？」',
    getValue: (c) => c.map.biome,
    applyValue: (c, v) => ({
      ...c,
      map: { ...c.map, biome: v as BiomeId, customColors: undefined },
    }),
    options: [
      { value: 'emerald', label: '翡翠苔原', hint: '常青松林与青苔草坪', swatch: '#3b7a52' },
      { value: 'sakura', label: '粉樱花谷', hint: '浪漫粉色花树与花瓣草地', swatch: '#f9a8d4' },
      { value: 'autumn', label: '金秋枫林', hint: '金橙枫叶与落叶林地', swatch: '#ea580c' },
    ],
  },
  {
    id: 'layout',
    stage: 'map',
    stageTitle: '第二幕 · 编织你的精灵地图 (3/4)',
    question: '「炼金小屋和树洞书屋已经准备好盖在森林里了，你想怎么摆放它们的位置？」',
    getValue: (c) => c.map.layout,
    applyValue: (c, v) => ({ ...c, map: { ...c.map, layout: v as LayoutPresetId } }),
    options: [
      { value: 'classic', label: '经典林涧布局', hint: '东西分立，中间横跨溪流木桥' },
      { value: 'plaza_pair', label: '双屋并肩广场', hint: '两座小屋比邻面向月泉，串门更近' },
      { value: 'parkour', label: '高台跳跳乐园', hint: '额外搭建空中木阶梯，适合跳跃攀爬' },
    ],
  },
  {
    id: 'surprise',
    stage: 'map',
    stageTitle: '第二幕 · 编织你的精灵地图 (4/4)',
    question: '「最后一步！你想在地图里偷偷多藏一些什么魔法惊喜？」',
    getValue: (c) => c.map.surprise,
    applyValue: (c, v) => ({ ...c, map: { ...c.map, surprise: v as WorldSurpriseId } }),
    options: [
      { value: 'extra_fireflies', label: '满谷萤火星尘', hint: '双倍飞舞的林间萤火光点' },
      { value: 'extra_mushrooms', label: '超多弹力蘑菇', hint: '遍布草地的发光弹簧蘑菇' },
      { value: 'extra_flowers', label: '七彩野花秘境', hint: '百余簇盛开的微光野花' },
    ],
  },
];

interface InspirationPreset {
  label: string;
  nickname: string;
  characterWish: string;
  worldWish: string;
  earStyle: 'auto' | EarStyleId;
  mood: 'auto' | TimeOfDayId;
  color: string;
}

const INSPIRATION_PRESETS: InspirationPreset[] = [
  {
    label: '糖果小猫都市',
    nickname: '小露娜',
    characterWish: '小猫一样的精灵，戴花环头饰，拿着小灯笼状的手杖，粉色系的配色。',
    worldWish: '城市街道，高楼林立，有发光的魔法商店！',
    earStyle: 'cat',
    mood: 'night',
    color: '草莓粉樱',
  },
  {
    label: '星夜猫耳巫师',
    nickname: '小紫星',
    characterWish: '戴星月巫师帽的蓝紫色猫耳小精灵，长着大大的透明发光星芒翅膀，手里提着暖黄色小灯笼。',
    worldWish: '夜晚安静闪烁的萤火森林，满山谷都是蓝紫色梦幻大树，有空中木台阶可以蹦蹦跳跳！',
    earStyle: 'cat',
    mood: 'night',
    color: '梦幻紫与星海蓝',
  },
  {
    label: '樱花兔耳花仙',
    nickname: '草莓糖',
    characterWish: '长着软绵绵长兔耳朵的小花仙，头上戴满鲜花花冠，穿着粉白渐变裙子，拿一根会开花的魔法花枝。',
    worldWish: '清晨暖洋洋的粉色樱花谷，草地上开满彩色小花朵，树梢飘着甜甜的微光。',
    earStyle: 'bunny',
    mood: 'morning',
    color: '草莓樱花粉',
  },
  {
    label: '金秋蜜糖冒险家',
    nickname: '小栗子',
    characterWish: '穿着温暖橙金色小风衣的尖耳森林精灵，戴着森林叶帽，背着金色大蝴蝶翅膀，拿发光晶石法杖。',
    worldWish: '黄昏日落下的金秋红枫山谷，到处都是可以弹得高高的发光蘑菇。',
    earStyle: 'elf',
    mood: 'sunset',
    color: '蜜糖琥珀金',
  },
];

const COLOR_SWATCHES = [
  { label: '薄荷翡翠', hex: '#34d399' },
  { label: '草莓粉樱', hex: '#f472b6' },
  { label: '星夜紫罗兰', hex: '#a78bfa' },
  { label: '月光海蓝', hex: '#38bdf8' },
  { label: '蜜糖暖橙', hex: '#fb923c' },
];

export function CreationWizard({
  config,
  onChangeConfig,
  onStageChange,
  onFinish,
}: CreationWizardProps) {
  const [mode, setMode] = useState<'dialogue' | 'form'>('dialogue');
  const [stepIdx, setStepIdx] = useState(0);

  // Form Mode State
  const [nickname, setNickname] = useState(config.spriteName ?? '小露娜');
  const [characterWish, setCharacterWish] = useState('');
  const [worldWish, setWorldWish] = useState('');
  const [earStyle, setEarStyle] = useState<'auto' | EarStyleId>('auto');
  const [mood, setMood] = useState<'auto' | TimeOfDayId>('auto');
  const [favoriteColor, setFavoriteColor] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(config.guideSummary ?? null);
  const [formPreviewCamera, setFormPreviewCamera] = useState<'character' | 'map'>('character');

  const step = WIZARD_STEPS[stepIdx];
  const currentVal = step.getValue(config);
  const isLast = stepIdx === WIZARD_STEPS.length - 1;

  const goToStep = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(WIZARD_STEPS.length - 1, nextIdx));
    const nextStep = WIZARD_STEPS[clamped];
    if (nextStep.stage !== step.stage) {
      onStageChange(nextStep.stage);
    }
    setStepIdx(clamped);
  };

  const handleSwitchMode = (nextMode: 'dialogue' | 'form') => {
    setMode(nextMode);
    if (nextMode === 'dialogue') {
      onStageChange(step.stage);
    } else {
      onStageChange(formPreviewCamera);
    }
  };

  const applyPreset = (p: InspirationPreset) => {
    setNickname(p.nickname);
    setCharacterWish(p.characterWish);
    setWorldWish(p.worldWish);
    setEarStyle(p.earStyle);
    setMood(p.mood);
    setFavoriteColor(p.color);
    setFormError(null);
  };

  const toggleFormPreview = (target: 'character' | 'map') => {
    setFormPreviewCamera(target);
    onStageChange(target);
  };

  const handleGenerateBlueprint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!characterWish.trim() && !worldWish.trim()) {
      setFormError('请先写一点关于「小精灵」或「森林世界」的想法，或者点上面的童话灵感试一试！');
      return;
    }

    setIsGenerating(true);
    try {
      const resp = await fetch('/api/generate-blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim() || '小露娜',
          characterWish: characterWish.trim(),
          worldWish: worldWish.trim(),
          earStyle,
          atmosphereMood: mood,
          favoriteColor: favoriteColor.trim(),
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        blueprint?: WorldCreationConfig;
        error?: string;
      };

      if (!resp.ok || !data.blueprint) {
        throw new Error(data.error || `请求失败 (${resp.status})`);
      }

      onChangeConfig(data.blueprint);
      setGeneratedSummary(data.blueprint.guideSummary ?? '魔法蓝图生成成功啦！');
      setFormPreviewCamera('map');
      onStageChange('map');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '生成魔法蓝图时出现问题，请稍后重试。';
      setFormError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="pointer-events-auto fixed right-4 bottom-4 z-30 w-[min(470px,94vw)] md:top-1/2 md:right-5 md:bottom-auto md:-translate-y-1/2">
      <div className="flex max-h-[88vh] flex-col rounded-xl border border-white/15 bg-[#0f1d16]/94 p-4 sm:p-5 text-[#f4f6ee] shadow-2xl">
        {/* Header + Mode Switcher (Pinned) */}
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 pb-2.5">
          <div>
            <p className="text-[11px] font-medium text-emerald-300">
              {mode === 'dialogue' ? step.stageTitle : '自由填表 · 智能魔法生成 3D 世界'}
            </p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-display text-lg font-bold text-white">铃兰</span>
              <span className="text-xs text-white/45">·</span>
              <span className="text-xs text-white/65">森林造物向导</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onFinish}
            title="直接进入游戏"
            className="flex items-center gap-1 rounded-lg border border-white/12 bg-white/5 px-2.5 py-1.5 text-xs text-white/75 transition-colors hover:bg-white/10 hover:text-white whitespace-nowrap shrink-0"
          >
            <span>进入游戏</span>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mode Tabs (Pinned) */}
        <div className="mb-3 grid shrink-0 grid-cols-2 gap-1.5 rounded-lg border border-white/10 bg-black/25 p-1">
          <button
            type="button"
            onClick={() => handleSwitchMode('dialogue')}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              mode === 'dialogue'
                ? 'bg-emerald-600 text-white'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>对话拼装 (8步)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('form')}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              mode === 'form'
                ? 'bg-emerald-600 text-white'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Wand2 className="h-3.5 w-3.5" />
            <span>填表造梦 (自由描写)</span>
          </button>
        </div>

        {mode === 'dialogue' ? (
          <>
            {/* Guided Dialogue Prompt */}
            <p className="mb-4 text-sm leading-relaxed text-[#eef3e8]">{step.question}</p>

            {/* Visual Choice Cards */}
            <div className="flex flex-col gap-2">
              {step.options.map((opt) => {
                const selected = currentVal === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChangeConfig(step.applyValue(config, opt.value))}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-emerald-300 ${
                      selected
                        ? 'border-emerald-400/75 bg-emerald-900/55 text-white'
                        : 'border-white/12 bg-white/5 text-white/85 hover:border-white/25 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {opt.swatch && (
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-white/30"
                          style={{ backgroundColor: opt.swatch }}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{opt.label}</div>
                        <div className="text-xs text-white/60 truncate">{opt.hint}</div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-emerald-300 shrink-0">
                      {selected ? '已选' : '预览'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Navigation Footer */}
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3.5">
              <button
                type="button"
                disabled={stepIdx === 0}
                onClick={() => goToStep(stepIdx - 1)}
                className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>上一步</span>
              </button>

              <span className="font-mono-num text-xs text-white/50">
                {stepIdx + 1} / {WIZARD_STEPS.length}
              </span>

              {isLast ? (
                <button
                  type="button"
                  onClick={onFinish}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 whitespace-nowrap shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>生成世界并开始</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => goToStep(stepIdx + 1)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 whitespace-nowrap shrink-0"
                >
                  <span>下一步</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleGenerateBlueprint} className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
            {/* Quick Inspiration Row */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/65">
                <span>写下你的童话愿望，铃兰会帮你变成 3D 世界</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleFormPreview('character')}
                    className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors ${
                      formPreviewCamera === 'character'
                        ? 'bg-emerald-700/80 text-white'
                        : 'bg-white/5 text-white/65 hover:text-white'
                    }`}
                  >
                    <Eye className="h-3 w-3" />
                    <span>看精灵</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFormPreview('map')}
                    className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors ${
                      formPreviewCamera === 'map'
                        ? 'bg-emerald-700/80 text-white'
                        : 'bg-white/5 text-white/65 hover:text-white'
                    }`}
                  >
                    <Eye className="h-3 w-3" />
                    <span>看山谷</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INSPIRATION_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="rounded-md border border-emerald-400/30 bg-emerald-950/50 px-2 py-1 text-[11px] font-medium text-emerald-200 transition-colors hover:bg-emerald-900/65"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nickname */}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-white/80">1. 小精灵叫什么名字？</span>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                placeholder="例如：小露娜、棉花糖、星芽"
                className="rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none"
              />
            </label>

            {/* Character Wish */}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-white/80">2. 你想变成什么样的小精灵？</span>
              <textarea
                rows={2}
                value={characterWish}
                onChange={(e) => setCharacterWish(e.target.value)}
                placeholder="例如：戴着星月帽的紫色猫耳小精灵，长着大大的发光蝴蝶翅膀，手里提着小灯笼…"
                className="resize-none rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs leading-relaxed text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none"
              />
            </label>

            {/* World Wish */}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-white/80">3. 你想创造什么样的 3D 世界地图？</span>
              <textarea
                rows={2}
                value={worldWish}
                onChange={(e) => setWorldWish(e.target.value)}
                placeholder="例如：月光下的粉色樱花山谷；或者高楼林立、有灯火和商店的魔法城市街道…"
                className="resize-none rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs leading-relaxed text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none"
              />
            </label>

            {/* Ear & Time Preferences */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="mb-1 block text-xs font-medium text-white/80">耳朵造型</span>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: 'auto', label: '自动' },
                    { id: 'elf', label: '精灵尖耳' },
                    { id: 'cat', label: '软萌猫耳' },
                    { id: 'bunny', label: '长长兔耳' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEarStyle(item.id as 'auto' | EarStyleId)}
                      className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                        earStyle === item.id
                          ? 'border-emerald-400 bg-emerald-900/60 text-white'
                          : 'border-white/12 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1 block text-xs font-medium text-white/80">山谷天色</span>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: 'auto', label: '自动' },
                    { id: 'morning', label: '清晨朝阳' },
                    { id: 'sunset', label: '黄金日落' },
                    { id: 'night', label: '萤火月夜' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMood(item.id as 'auto' | TimeOfDayId)}
                      className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                        mood === item.id
                          ? 'border-emerald-400 bg-emerald-900/60 text-white'
                          : 'border-white/12 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Favorite Color */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-white/80 shrink-0">喜欢的主色：</span>
              <div className="flex items-center gap-1.5">
                {COLOR_SWATCHES.map((sw) => {
                  const active = favoriteColor === sw.label;
                  return (
                    <button
                      key={sw.label}
                      type="button"
                      title={sw.label}
                      onClick={() => setFavoriteColor(active ? '' : sw.label)}
                      className={`h-5 w-5 rounded-full border-2 transition-transform ${
                        active ? 'scale-110 border-white' : 'border-white/30 hover:scale-105'
                      }`}
                      style={{ backgroundColor: sw.hex }}
                    />
                  );
                })}
              </div>
              <input
                type="text"
                value={favoriteColor}
                onChange={(e) => setFavoriteColor(e.target.value)}
                placeholder="或输入颜色"
                className="min-w-0 flex-1 rounded-md border border-white/15 bg-black/30 px-2 py-1 text-xs text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {formError && (
              <div className="rounded-lg border border-rose-400/40 bg-rose-950/60 px-3 py-2 text-xs leading-relaxed text-rose-200">
                {formError}
              </div>
            )}

            {generatedSummary && !formError && (
              <div className="rounded-lg border border-emerald-400/35 bg-emerald-950/55 px-3 py-2 text-xs leading-relaxed text-emerald-100">
                <span className="font-semibold text-emerald-300">铃兰说：</span>
                {generatedSummary}
              </div>
            )}
            </div>

            {/* Submit & Enter Buttons (Always visible at bottom) */}
            <div className="mt-3 flex shrink-0 items-center gap-2 border-t border-white/10 pt-3">
              <button
                type="submit"
                disabled={isGenerating}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-70"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>铃兰正在施展 3D 造梦魔法…</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    <span>魔法生成 3D 世界</span>
                  </>
                )}
              </button>

              {generatedSummary && (
                <button
                  type="button"
                  onClick={onFinish}
                  className="flex items-center gap-1 rounded-lg border border-amber-300/40 bg-amber-600/85 px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-amber-500 whitespace-nowrap shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>去冒险</span>
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
