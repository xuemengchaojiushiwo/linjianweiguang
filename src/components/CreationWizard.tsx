import { ArrowLeft, ArrowRight, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import type {
  BiomeId,
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
    applyValue: (c, v) => ({ ...c, character: { ...c.character, theme: v as SpriteThemeId } }),
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
    applyValue: (c, v) => ({ ...c, map: { ...c.map, timeOfDay: v as TimeOfDayId } }),
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
    applyValue: (c, v) => ({ ...c, map: { ...c.map, biome: v as BiomeId } }),
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

export function CreationWizard({
  config,
  onChangeConfig,
  onStageChange,
  onFinish,
}: CreationWizardProps) {
  const [stepIdx, setStepIdx] = useState(0);
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

  return (
    <div className="pointer-events-auto fixed right-5 bottom-5 z-30 w-[min(440px,92vw)] md:top-1/2 md:bottom-auto md:-translate-y-1/2">
      <div className="rounded-xl border border-white/15 bg-[#0f1d16]/94 p-5 text-[#f4f6ee] shadow-2xl">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/10 pb-2.5">
          <div>
            <p className="text-[11px] font-medium text-emerald-300">{step.stageTitle}</p>
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
            <span>跳过</span>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

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
      </div>
    </div>
  );
}
