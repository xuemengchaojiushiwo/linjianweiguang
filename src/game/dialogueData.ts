import type { NpcId, NpcProfile } from './types';

export const ZONE_NAMES = {
  glade: '精灵林涧',
  apothecary: '橡实炼金小屋',
  library: '星辉树洞书屋',
} as const;

export const NPC_PROFILES: Record<NpcId, NpcProfile> = {
  elwin: {
    id: 'elwin',
    name: '艾尔温',
    title: '苍苔长老',
    zone: 'glade',
    accentHex: '#6EE7B7',
    greetingNodeId: 'intro',
    nodes: {
      intro: {
        id: 'intro',
        text: '早安，小露娜。晨露刚从银叶尖滚落，整个精灵林涧都在轻声歌唱呢。',
        nextNodeId: 'explain',
      },
      explain: {
        id: 'explain',
        text: '林涧各处散落着 7 颗「星露微光」，有的在树冠高台，有的藏在小屋里。你可以踩着弹力蘑菇跳上去，也可以推门进屋拜访大家。',
        choices: [
          { label: '炼金小屋和书屋在哪里？', nextNodeId: 'directions' },
          { label: '跳跃和飞行有什么诀窍？', nextNodeId: 'flight_tip' },
          { label: '我这就去林涧逛逛！', close: true },
        ],
      },
      directions: {
        id: 'directions',
        text: '西北方那座圆顶蘑菇屋是「橡实炼金小屋」，栗子婆婆在里面熬制晨光药水；东南方的螺旋古树梯通往「星辉树洞书屋」，走到门前按 E 就能进去。',
        choices: [
          { label: '谢谢长老，我去拜访她们！', close: true },
          { label: '还想请教跳跃诀窍', nextNodeId: 'flight_tip' },
        ],
      },
      flight_tip: {
        id: 'flight_tip',
        text: '按空格键起跳后，在半空再按一次空格键就能振翅「二段跳」哦！如果去找栗子婆婆讨一杯轻灵风露，你的羽翼会更加轻盈。',
        choices: [{ label: '记住了，谢谢长老！', close: true }],
      },
      all_collected: {
        id: 'all_collected',
        text: '哇……7 颗星露微光全都汇聚在你身边了！林涧的古老月泉因你而重新澄澈，小露娜，你真了不起。',
        choices: [{ label: '这是大家一起守护的森林！', close: true }],
      },
    },
  },
  lillian: {
    id: 'lillian',
    name: '莉莉安',
    title: '萤火花匠',
    zone: 'glade',
    accentHex: '#F9A8D4',
    greetingNodeId: 'intro',
    nodes: {
      intro: {
        id: 'intro',
        text: '嘘——听见风铃草晃动的声音了吗？我刚给桥边的蓝铃花浇过银溪水。',
        nextNodeId: 'chat',
      },
      chat: {
        id: 'chat',
        text: '刚才我看见一只调皮的星露飞上了炼金小屋的屋檐呢！借用屋旁那朵发光的「弹力蘑菇」，一下就能弹上去。',
        choices: [
          { label: '树洞书屋上面的木梯好走吗？', nextNodeId: 'treehouse_hint' },
          { label: '你的花冠真好看！', nextNodeId: 'compliment' },
          { label: '我去试试弹力蘑菇！', close: true },
        ],
      },
      treehouse_hint: {
        id: 'treehouse_hint',
        text: '东南方古树绕着几级木台阶，一步步跳上去就能看见星辉树洞书屋的大门啦。奥利安先生总喜欢在里面点很多浮空蜡烛看书。',
        choices: [{ label: '待会儿就去看看！', close: true }],
      },
      compliment: {
        id: 'compliment',
        text: '嘻嘻，这是用晨雾风信子和萤火草编的。如果你收集齐了星露，晚上整个花园都会亮起萤火呢。',
        choices: [{ label: '好期待！', close: true }],
      },
    },
  },
  chestnut: {
    id: 'chestnut',
    name: '栗子婆婆',
    title: '橡实炼金师',
    zone: 'apothecary',
    accentHex: '#FBBF24',
    greetingNodeId: 'intro',
    nodes: {
      intro: {
        id: 'intro',
        text: '欢迎光临橡实炼金小屋，小家伙！小心别踩翻壁炉边刚晒干的蒲公英粉呀。',
        nextNodeId: 'cauldron',
      },
      cauldron: {
        id: 'cauldron',
        text: '这锅「轻灵风露」刚刚熬出金绿色的泡泡，用三叶草露珠和星尘蜂蜜调的。你想喝一小勺试试吗？',
        choices: [
          { label: '想喝！请给我轻灵风露祝福', nextNodeId: 'blessing', grantBlessing: true },
          { label: '架子上的彩色瓶子都是什么？', nextNodeId: 'potions' },
          { label: '我先在小屋里四处看看', close: true },
        ],
      },
      blessing: {
        id: 'blessing',
        text: '咕嘟——干杯！现在你的翼膜已经沾满轻灵星粉了，奔跑速度和跳跃高度都会提升，去树冠和屋顶探险吧！',
        choices: [{ label: '感觉浑身轻飘飘的，谢谢婆婆！', close: true }],
      },
      potions: {
        id: 'potions',
        text: '琥珀瓶里装的是暖冬松果茶，翠绿瓶里是苔藓修复露，最上面那瓶紫色的……嘿嘿，是奥利安借放的夜光墨水！',
        choices: [
          { label: '我也想尝尝轻灵风露', nextNodeId: 'blessing', grantBlessing: true },
          { label: '好有趣，我去角落里转转', close: true },
        ],
      },
    },
  },
  orion: {
    id: 'orion',
    name: '奥利安',
    title: '星语学者',
    zone: 'library',
    accentHex: '#93C5FD',
    greetingNodeId: 'intro',
    nodes: {
      intro: {
        id: 'intro',
        text: '啊，有风铃般的翅膀声飘了进来……欢迎来到星辉树洞书屋，小露娜。',
        nextNodeId: 'lore',
      },
      lore: {
        id: 'lore',
        text: '中间这张星象台记录着林涧的四季星轨。你知道吗？每颗星露微光，其实都是古树在夜晚梦境里凝结出的小星星。',
        choices: [
          { label: '书架上最古老的书写了什么？', nextNodeId: 'ancient_book' },
          { label: '这里好安静，蜡烛怎么会浮在空中？', nextNodeId: 'candles' },
          { label: '我再看看这座树洞书屋', close: true },
        ],
      },
      ancient_book: {
        id: 'ancient_book',
        text: '《千叶年鉴》里写道：只要有人愿意在林涧间奔跑、跳跃、倾听森林里的每一份心意，微光就会一直照亮这片山谷。',
        choices: [{ label: '我会好好记住这段话的', close: true }],
      },
      candles: {
        id: 'candles',
        text: '那是「无焰萤烛」，用蜂蜡和月光草芯做成的，既不会烫伤古树的木纹，又能让翻书的夜晚一直暖洋洋的。',
        choices: [{ label: '我也好喜欢这里！', close: true }],
      },
    },
  },
};

export function getInitialDialogueNodeId(npcId: NpcId, dewdropsCollected: number, totalDewdrops: number): string {
  if (npcId === 'elwin' && dewdropsCollected >= totalDewdrops) {
    return 'all_collected';
  }
  return NPC_PROFILES[npcId].greetingNodeId;
}
