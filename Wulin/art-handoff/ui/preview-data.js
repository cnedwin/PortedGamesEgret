// Read-only preview snapshot from Wulin/src/data. The game remains the data authority.
window.WULIN_PREVIEW_DATA = {
  "sects": [
    {
      "id": "shaolin",
      "name": "少林寺",
      "seat": "songshan",
      "leader": {
        "name": "慧灯禅师",
        "age": 71,
        "female": false
      },
      "standing": 1,
      "role": "防御与续战，人数多",
      "color": "#c9a227"
    },
    {
      "id": "wudang",
      "name": "武当派",
      "seat": "wudang",
      "leader": {
        "name": "松鹤真人",
        "age": 66,
        "female": false
      },
      "standing": 1,
      "role": "借力反制，后发先至",
      "color": "#3f6f8f"
    },
    {
      "id": "emei",
      "name": "峨嵋派",
      "seat": "emei",
      "leader": {
        "name": "沈清霜",
        "age": 34,
        "female": true
      },
      "standing": 1,
      "role": "快攻，高命中",
      "color": "#8fb9a8"
    },
    {
      "id": "huashan",
      "name": "华山派",
      "seat": "huashan",
      "leader": {
        "name": "陆孤舟",
        "age": 41,
        "female": false
      },
      "standing": 0,
      "role": "单体爆发，精英少而强",
      "color": "#5b6c8a"
    },
    {
      "id": "gaibang",
      "name": "丐帮",
      "seat": "yingtian",
      "leader": {
        "name": "贺九斤",
        "age": 52,
        "female": false
      },
      "standing": 1,
      "role": "人海与情报，招人快",
      "color": "#7a5c3a"
    },
    {
      "id": "mingjiao",
      "name": "明教",
      "seat": "quanzhou",
      "leader": {
        "name": "厉千秋",
        "age": 47,
        "female": false
      },
      "standing": -1,
      "role": "消耗战，削对手内力",
      "color": "#a8322e"
    },
    {
      "id": "kunlun",
      "name": "昆仑派",
      "seat": "kunlun",
      "leader": {
        "name": "拓跋烈",
        "age": 45,
        "female": false
      },
      "standing": 0,
      "role": "冲阵，破前排",
      "color": "#9fb7c9"
    },
    {
      "id": "caobang",
      "name": "漕帮",
      "seat": "yangzhou",
      "leader": {
        "name": "江晚舟",
        "age": 29,
        "female": true
      },
      "standing": 0,
      "role": "机动与经济，水路称雄",
      "color": "#2f7f7b"
    },
    {
      "id": "yaowang",
      "name": "药王谷",
      "seat": "changbai",
      "leader": {
        "name": "白术翁",
        "age": 68,
        "female": false
      },
      "standing": 1,
      "role": "恢复与丹药，伤亡低",
      "color": "#6f9a4a"
    },
    {
      "id": "chongsheng",
      "name": "崇圣寺",
      "seat": "dali",
      "leader": {
        "name": "昙照上人",
        "age": 59,
        "female": false
      },
      "standing": 1,
      "role": "控制，封穴打断",
      "color": "#d08a3c"
    },
    {
      "id": "quanzhen",
      "name": "全真教",
      "seat": "zhongnan",
      "leader": {
        "name": "归云子",
        "age": 55,
        "female": false
      },
      "standing": 1,
      "role": "阵法增益，团队作战",
      "color": "#4a4a6a"
    },
    {
      "id": "tangmen",
      "name": "唐门",
      "seat": "yuzhou",
      "leader": {
        "name": "唐挽月",
        "age": 26,
        "female": true
      },
      "standing": -1,
      "role": "远程爆发与毒",
      "color": "#5a2d6e"
    }
  ],
  "places": [
    {
      "id": "changbai",
      "name": "长白山",
      "seat": "yaowang",
      "plot": "medium",
      "cells": 240,
      "resources": {
        "gold": 0,
        "wood": 3,
        "stone": 1,
        "iron": 1,
        "herb": 3
      },
      "at": {
        "x": 86,
        "y": 8
      },
      "note": "体魄强健，懂药性",
      "roads": [
        "shuntian"
      ]
    },
    {
      "id": "shuntian",
      "name": "顺天府",
      "seat": null,
      "plot": "small",
      "cells": 180,
      "resources": {
        "gold": 2,
        "wood": 0,
        "stone": 1,
        "iron": 2,
        "herb": 1
      },
      "at": {
        "x": 70,
        "y": 20
      },
      "note": "富家子弟多，束修丰厚",
      "roads": [
        "changbai",
        "hengshan",
        "taishan"
      ]
    },
    {
      "id": "hengshan",
      "name": "恒山",
      "seat": null,
      "plot": "medium",
      "cells": 240,
      "resources": {
        "gold": 1,
        "wood": 1,
        "stone": 2,
        "iron": 2,
        "herb": 1
      },
      "at": {
        "x": 58,
        "y": 24
      },
      "note": "边地多剑客",
      "roads": [
        "shuntian",
        "huashan",
        "songshan"
      ]
    },
    {
      "id": "taishan",
      "name": "泰山",
      "seat": null,
      "plot": "large",
      "cells": 280,
      "resources": {
        "gold": 0,
        "wood": 2,
        "stone": 3,
        "iron": 1,
        "herb": 1
      },
      "at": {
        "x": 74,
        "y": 34
      },
      "note": "石料丰足，民风尚武",
      "roads": [
        "shuntian",
        "songshan",
        "yingtian",
        "yangzhou"
      ]
    },
    {
      "id": "songshan",
      "name": "嵩山",
      "seat": "shaolin",
      "plot": "large",
      "cells": 280,
      "resources": {
        "gold": 1,
        "wood": 1,
        "stone": 2,
        "iron": 1,
        "herb": 2
      },
      "at": {
        "x": 60,
        "y": 40
      },
      "note": "四通八达，兵家必争",
      "roads": [
        "hengshan",
        "taishan",
        "huashan",
        "wudang",
        "yingtian"
      ]
    },
    {
      "id": "huashan",
      "name": "华山",
      "seat": "huashan",
      "plot": "medium",
      "cells": 240,
      "resources": {
        "gold": 1,
        "wood": 2,
        "stone": 1,
        "iron": 2,
        "herb": 1
      },
      "at": {
        "x": 48,
        "y": 38
      },
      "note": "奇险天下第一山",
      "roads": [
        "hengshan",
        "songshan",
        "zhongnan",
        "wudang"
      ]
    },
    {
      "id": "zhongnan",
      "name": "终南山",
      "seat": "quanzhen",
      "plot": "medium",
      "cells": 240,
      "resources": {
        "gold": 0,
        "wood": 2,
        "stone": 2,
        "iron": 1,
        "herb": 2
      },
      "at": {
        "x": 42,
        "y": 42
      },
      "note": "道家洞天",
      "roads": [
        "huashan",
        "kunlun",
        "emei"
      ]
    },
    {
      "id": "kunlun",
      "name": "昆仑山",
      "seat": "kunlun",
      "plot": "large",
      "cells": 280,
      "resources": {
        "gold": 0,
        "wood": 1,
        "stone": 2,
        "iron": 3,
        "herb": 1
      },
      "at": {
        "x": 14,
        "y": 36
      },
      "note": "产玄铁，地广人稀",
      "roads": [
        "zhongnan",
        "emei"
      ]
    },
    {
      "id": "yingtian",
      "name": "应天府",
      "seat": "gaibang",
      "plot": "small",
      "cells": 180,
      "resources": {
        "gold": 1,
        "wood": 0,
        "stone": 2,
        "iron": 2,
        "herb": 2
      },
      "at": {
        "x": 76,
        "y": 50
      },
      "note": "人烟稠密，来投者多",
      "roads": [
        "taishan",
        "songshan",
        "yangzhou",
        "huangshan"
      ]
    },
    {
      "id": "yangzhou",
      "name": "扬州",
      "seat": "caobang",
      "plot": "small",
      "cells": 180,
      "resources": {
        "gold": 3,
        "wood": 1,
        "stone": 0,
        "iron": 1,
        "herb": 1
      },
      "at": {
        "x": 80,
        "y": 46
      },
      "note": "漕运枢纽，商贾云集",
      "roads": [
        "taishan",
        "yingtian",
        "tiantai"
      ]
    },
    {
      "id": "wudang",
      "name": "武当山",
      "seat": "wudang",
      "plot": "medium",
      "cells": 240,
      "resources": {
        "gold": 0,
        "wood": 2,
        "stone": 3,
        "iron": 1,
        "herb": 1
      },
      "at": {
        "x": 54,
        "y": 50
      },
      "note": "石峰林立",
      "roads": [
        "songshan",
        "huashan",
        "yuzhou",
        "dongting"
      ]
    },
    {
      "id": "emei",
      "name": "峨嵋山",
      "seat": "emei",
      "plot": "medium",
      "cells": 240,
      "resources": {
        "gold": 2,
        "wood": 2,
        "stone": 1,
        "iron": 0,
        "herb": 2
      },
      "at": {
        "x": 30,
        "y": 58
      },
      "note": "女弟子多",
      "roads": [
        "zhongnan",
        "kunlun",
        "yuzhou",
        "dali"
      ]
    },
    {
      "id": "yuzhou",
      "name": "渝州",
      "seat": "tangmen",
      "plot": "medium",
      "cells": 240,
      "resources": {
        "gold": 1,
        "wood": 2,
        "stone": 1,
        "iron": 2,
        "herb": 2
      },
      "at": {
        "x": 40,
        "y": 58
      },
      "note": "山城多巧匠",
      "roads": [
        "wudang",
        "emei",
        "dongting",
        "guilin"
      ]
    },
    {
      "id": "dongting",
      "name": "洞庭湖",
      "seat": null,
      "plot": "large",
      "cells": 280,
      "resources": {
        "gold": 1,
        "wood": 2,
        "stone": 0,
        "iron": 1,
        "herb": 3
      },
      "at": {
        "x": 58,
        "y": 62
      },
      "note": "土地肥沃，水路通达",
      "roads": [
        "wudang",
        "yuzhou",
        "huangshan",
        "guilin",
        "lingnan"
      ]
    },
    {
      "id": "huangshan",
      "name": "黄山",
      "seat": null,
      "plot": "medium",
      "cells": 240,
      "resources": {
        "gold": 1,
        "wood": 3,
        "stone": 2,
        "iron": 0,
        "herb": 2
      },
      "at": {
        "x": 74,
        "y": 58
      },
      "note": "松石云海",
      "roads": [
        "dongting",
        "yingtian",
        "tiantai",
        "quanzhou"
      ]
    },
    {
      "id": "tiantai",
      "name": "天台山",
      "seat": null,
      "plot": "medium",
      "cells": 240,
      "resources": {
        "gold": 1,
        "wood": 2,
        "stone": 2,
        "iron": 1,
        "herb": 2
      },
      "at": {
        "x": 84,
        "y": 60
      },
      "note": "佛道并立",
      "roads": [
        "yangzhou",
        "huangshan",
        "quanzhou"
      ]
    },
    {
      "id": "quanzhou",
      "name": "泉州",
      "seat": "mingjiao",
      "plot": "medium",
      "cells": 240,
      "resources": {
        "gold": 2,
        "wood": 1,
        "stone": 1,
        "iron": 2,
        "herb": 1
      },
      "at": {
        "x": 80,
        "y": 74
      },
      "note": "海港，番商往来",
      "roads": [
        "huangshan",
        "tiantai",
        "lingnan"
      ]
    },
    {
      "id": "lingnan",
      "name": "岭南",
      "seat": null,
      "plot": "small",
      "cells": 180,
      "resources": {
        "gold": 2,
        "wood": 2,
        "stone": 2,
        "iron": 2,
        "herb": 2
      },
      "at": {
        "x": 64,
        "y": 84
      },
      "note": "资源齐全，地方狭小",
      "roads": [
        "dongting",
        "quanzhou",
        "guilin"
      ]
    },
    {
      "id": "guilin",
      "name": "桂林",
      "seat": null,
      "plot": "large",
      "cells": 280,
      "resources": {
        "gold": 1,
        "wood": 2,
        "stone": 3,
        "iron": 1,
        "herb": 1
      },
      "at": {
        "x": 50,
        "y": 76
      },
      "note": "山多地广",
      "roads": [
        "yuzhou",
        "dongting",
        "lingnan",
        "dali"
      ]
    },
    {
      "id": "dali",
      "name": "大理",
      "seat": "chongsheng",
      "plot": "medium",
      "cells": 240,
      "resources": {
        "gold": 2,
        "wood": 1,
        "stone": 2,
        "iron": 1,
        "herb": 2
      },
      "at": {
        "x": 28,
        "y": 76
      },
      "note": "佛国，四季如春",
      "roads": [
        "emei",
        "guilin"
      ]
    }
  ],
  "buildings": {
    "hall": {
      "name": "正殿",
      "cells": 16,
      "cost": 1500,
      "max": 5,
      "does": "分舵核心，设职位"
    },
    "gate": {
      "name": "山门",
      "cells": 6,
      "cost": 600,
      "max": 5,
      "does": "守战防线"
    },
    "board": {
      "name": "招贤榜",
      "cells": 2,
      "cost": 100,
      "max": 1,
      "does": "招收弟子"
    },
    "dorm": {
      "name": "厢房",
      "cells": 6,
      "cost": 300,
      "max": 3,
      "does": "住人",
      "beds": [
        0,
        4,
        6,
        8
      ]
    },
    "mess": {
      "name": "膳堂",
      "cells": 8,
      "cost": 400,
      "max": 3,
      "does": "存粮，安人心"
    },
    "store": {
      "name": "库房",
      "cells": 8,
      "cost": 400,
      "max": 5,
      "does": "储物"
    },
    "goldPit": {
      "name": "金矿坑",
      "cells": 8,
      "cost": 300,
      "max": 5,
      "does": "采金",
      "posts": 4,
      "yields": "gold"
    },
    "quarry": {
      "name": "采石场",
      "cells": 8,
      "cost": 300,
      "max": 5,
      "does": "采石",
      "posts": 4,
      "yields": "stone"
    },
    "ironPit": {
      "name": "铁矿坑",
      "cells": 8,
      "cost": 300,
      "max": 5,
      "does": "采铁",
      "posts": 4,
      "yields": "iron"
    },
    "lumber": {
      "name": "伐木场",
      "cells": 8,
      "cost": 300,
      "max": 5,
      "does": "伐木",
      "posts": 4,
      "yields": "wood"
    },
    "garden": {
      "name": "药圃",
      "cells": 8,
      "cost": 300,
      "max": 5,
      "does": "种药",
      "posts": 4,
      "yields": "herb"
    },
    "forge": {
      "name": "铸剑坊",
      "cells": 10,
      "cost": 800,
      "max": 7,
      "does": "造兵器、暗器",
      "posts": 3,
      "makes": "weapon"
    },
    "loom": {
      "name": "织造坊",
      "cells": 10,
      "cost": 800,
      "max": 7,
      "does": "造衣、鞋、饰品",
      "posts": 3,
      "makes": "armor"
    },
    "still": {
      "name": "丹房",
      "cells": 10,
      "cost": 800,
      "max": 7,
      "does": "炼丹",
      "posts": 3,
      "makes": "pill"
    },
    "yard": {
      "name": "演武场",
      "cells": 12,
      "cost": 500,
      "max": 5,
      "does": "练拳、掌、腿、点穴",
      "seats": 6,
      "trains": [
        "fist",
        "palm",
        "leg",
        "point"
      ]
    },
    "range": {
      "name": "兵器场",
      "cells": 12,
      "cost": 500,
      "max": 5,
      "does": "练刀、剑、枪、棍、暗器",
      "seats": 6,
      "trains": [
        "saber",
        "sword",
        "spear",
        "staff",
        "dart"
      ]
    },
    "cell": {
      "name": "静室",
      "cells": 4,
      "cost": 600,
      "max": 5,
      "does": "闭关，练内功、轻功、奇术",
      "seats": 1,
      "trains": [
        "inner",
        "light",
        "craft"
      ]
    },
    "library": {
      "name": "藏经阁",
      "cells": 10,
      "cost": 1200,
      "max": 5,
      "does": "存秘笈",
      "seats": 4
    },
    "clinic": {
      "name": "医馆",
      "cells": 8,
      "cost": 600,
      "max": 5,
      "does": "疗伤解毒"
    },
    "tower": {
      "name": "箭楼",
      "cells": 4,
      "cost": 500,
      "max": 3,
      "does": "守战远程火力"
    },
    "council": {
      "name": "议事堂",
      "cells": 10,
      "cost": 1000,
      "max": 3,
      "does": "外交、探子"
    }
  },
  "arts": [
    {
      "id": "fist1",
      "name": "太祖长拳",
      "tier": 1,
      "sect": null
    },
    {
      "id": "fist2",
      "name": "六合拳",
      "tier": 2,
      "sect": null
    },
    {
      "id": "fist3",
      "name": "形意拳",
      "tier": 3,
      "sect": null
    },
    {
      "id": "palm1",
      "name": "擒拿手",
      "tier": 1,
      "sect": null
    },
    {
      "id": "palm2",
      "name": "绵掌",
      "tier": 2,
      "sect": null
    },
    {
      "id": "palm3",
      "name": "八卦掌",
      "tier": 3,
      "sect": null
    },
    {
      "id": "leg1",
      "name": "弹腿",
      "tier": 1,
      "sect": null
    },
    {
      "id": "leg2",
      "name": "戳脚",
      "tier": 2,
      "sect": null
    },
    {
      "id": "leg3",
      "name": "鸳鸯腿",
      "tier": 3,
      "sect": null
    },
    {
      "id": "point1",
      "name": "认穴法",
      "tier": 1,
      "sect": null
    },
    {
      "id": "point2",
      "name": "鹰爪力",
      "tier": 2,
      "sect": null
    },
    {
      "id": "point3",
      "name": "一指禅",
      "tier": 3,
      "sect": null
    },
    {
      "id": "saber1",
      "name": "劈挂刀",
      "tier": 1,
      "sect": null
    },
    {
      "id": "saber2",
      "name": "五虎刀",
      "tier": 2,
      "sect": null
    },
    {
      "id": "saber3",
      "name": "八卦刀",
      "tier": 3,
      "sect": null
    },
    {
      "id": "sword1",
      "name": "青萍剑",
      "tier": 1,
      "sect": null
    },
    {
      "id": "sword2",
      "name": "三才剑",
      "tier": 2,
      "sect": null
    },
    {
      "id": "sword3",
      "name": "两仪剑",
      "tier": 3,
      "sect": null
    },
    {
      "id": "spear1",
      "name": "梨花枪",
      "tier": 1,
      "sect": null
    },
    {
      "id": "spear2",
      "name": "六合枪",
      "tier": 2,
      "sect": null
    },
    {
      "id": "spear3",
      "name": "杨家枪",
      "tier": 3,
      "sect": null
    },
    {
      "id": "staff1",
      "name": "齐眉棍",
      "tier": 1,
      "sect": null
    },
    {
      "id": "staff2",
      "name": "五郎棍",
      "tier": 2,
      "sect": null
    },
    {
      "id": "staff3",
      "name": "八仙棍",
      "tier": 3,
      "sect": null
    },
    {
      "id": "dart1",
      "name": "飞蝗石",
      "tier": 1,
      "sect": null
    },
    {
      "id": "dart2",
      "name": "袖箭",
      "tier": 2,
      "sect": null
    },
    {
      "id": "dart3",
      "name": "金钱镖",
      "tier": 3,
      "sect": null
    },
    {
      "id": "inner1",
      "name": "吐纳术",
      "tier": 1,
      "sect": null
    },
    {
      "id": "inner2",
      "name": "八段锦",
      "tier": 2,
      "sect": null
    },
    {
      "id": "inner3",
      "name": "五禽戏",
      "tier": 3,
      "sect": null
    },
    {
      "id": "light1",
      "name": "提纵术",
      "tier": 1,
      "sect": null
    },
    {
      "id": "light2",
      "name": "草上飞",
      "tier": 2,
      "sect": null
    },
    {
      "id": "light3",
      "name": "八步赶蝉",
      "tier": 3,
      "sect": null
    },
    {
      "id": "craft1",
      "name": "岐黄术",
      "tier": 1,
      "sect": null
    },
    {
      "id": "craft2",
      "name": "辨毒术",
      "tier": 2,
      "sect": null
    },
    {
      "id": "craft3",
      "name": "奇门遁甲",
      "tier": 3,
      "sect": null
    },
    {
      "id": "fist4_shaolin",
      "name": "罗汉十八手",
      "tier": 4,
      "sect": "shaolin"
    },
    {
      "id": "staff4_shaolin",
      "name": "达摩棍",
      "tier": 4,
      "sect": "shaolin"
    },
    {
      "id": "inner5_shaolin",
      "name": "易筋经",
      "tier": 5,
      "sect": "shaolin"
    },
    {
      "id": "sword4_wudang",
      "name": "太极剑",
      "tier": 4,
      "sect": "wudang"
    },
    {
      "id": "palm4_wudang",
      "name": "太极拳",
      "tier": 4,
      "sect": "wudang"
    },
    {
      "id": "inner5_wudang",
      "name": "太极十三势",
      "tier": 5,
      "sect": "wudang"
    },
    {
      "id": "sword4_emei",
      "name": "金顶剑",
      "tier": 4,
      "sect": "emei"
    },
    {
      "id": "point4_emei",
      "name": "峨嵋刺",
      "tier": 4,
      "sect": "emei"
    },
    {
      "id": "sword5_emei",
      "name": "白猿通臂剑",
      "tier": 5,
      "sect": "emei"
    },
    {
      "id": "sword4_huashan",
      "name": "云台剑",
      "tier": 4,
      "sect": "huashan"
    },
    {
      "id": "sword4_huashan1",
      "name": "苍龙剑",
      "tier": 4,
      "sect": "huashan"
    },
    {
      "id": "sword5_huashan",
      "name": "希夷剑",
      "tier": 5,
      "sect": "huashan"
    },
    {
      "id": "palm4_gaibang",
      "name": "莲花落掌",
      "tier": 4,
      "sect": "gaibang"
    },
    {
      "id": "staff4_gaibang",
      "name": "九路乞儿棍",
      "tier": 4,
      "sect": "gaibang"
    },
    {
      "id": "fist5_gaibang",
      "name": "百家拳",
      "tier": 5,
      "sect": "gaibang"
    },
    {
      "id": "palm4_mingjiao",
      "name": "明暗掌",
      "tier": 4,
      "sect": "mingjiao"
    },
    {
      "id": "saber4_mingjiao",
      "name": "弯月刀",
      "tier": 4,
      "sect": "mingjiao"
    },
    {
      "id": "inner5_mingjiao",
      "name": "三际心法",
      "tier": 5,
      "sect": "mingjiao"
    },
    {
      "id": "spear4_kunlun",
      "name": "雪岭枪",
      "tier": 4,
      "sect": "kunlun"
    },
    {
      "id": "leg4_kunlun",
      "name": "踏雪腿",
      "tier": 4,
      "sect": "kunlun"
    },
    {
      "id": "spear5_kunlun",
      "name": "奔雷枪",
      "tier": 5,
      "sect": "kunlun"
    },
    {
      "id": "staff4_caobang",
      "name": "分水篙",
      "tier": 4,
      "sect": "caobang"
    },
    {
      "id": "light4_caobang",
      "name": "踏浪步",
      "tier": 4,
      "sect": "caobang"
    },
    {
      "id": "staff5_caobang",
      "name": "定波篙法",
      "tier": 5,
      "sect": "caobang"
    },
    {
      "id": "saber4_yaowang",
      "name": "柳叶刀",
      "tier": 4,
      "sect": "yaowang"
    },
    {
      "id": "craft4_yaowang",
      "name": "青囊针法",
      "tier": 4,
      "sect": "yaowang"
    },
    {
      "id": "inner5_yaowang",
      "name": "千金养气诀",
      "tier": 5,
      "sect": "yaowang"
    },
    {
      "id": "point4_chongsheng",
      "name": "拈花指",
      "tier": 4,
      "sect": "chongsheng"
    },
    {
      "id": "fist4_chongsheng",
      "name": "伏虎拳",
      "tier": 4,
      "sect": "chongsheng"
    },
    {
      "id": "point5_chongsheng",
      "name": "三塔禅指",
      "tier": 5,
      "sect": "chongsheng"
    },
    {
      "id": "sword4_quanzhen",
      "name": "纯阳剑",
      "tier": 4,
      "sect": "quanzhen"
    },
    {
      "id": "sword4_quanzhen1",
      "name": "七星剑",
      "tier": 4,
      "sect": "quanzhen"
    },
    {
      "id": "inner5_quanzhen",
      "name": "金丹功",
      "tier": 5,
      "sect": "quanzhen"
    },
    {
      "id": "dart4_tangmen",
      "name": "追魂镖",
      "tier": 4,
      "sect": "tangmen"
    },
    {
      "id": "craft4_tangmen",
      "name": "百草毒经",
      "tier": 4,
      "sect": "tangmen"
    },
    {
      "id": "dart5_tangmen",
      "name": "飞星手",
      "tier": 5,
      "sect": "tangmen"
    }
  ]
};
