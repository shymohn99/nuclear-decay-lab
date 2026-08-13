"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  MAP_RADIONUCLIDES,
  type MapDecayCode,
} from "../../radionuclides";

type DecayMode = "alpha" | "beta" | "gamma";
type Language = "ja" | "en";
type DecaySeries = "independent" | "uranium-238" | "thorium-232" | "uranium-235";
type SimulationMode = "single" | "chain";
type ChainRateMode = "physical" | "observation";
type CatalogView = "table" | "map";
type DetectorKey = "gm" | "scintillator" | "semiconductor";
type ShieldKey = "none" | "paper" | "aluminum" | "lead";

type Nuclide = {
  massNumber: number;
  protonNumber: number;
  element: string;
};

type IsotopePreset = {
  key: string;
  series: DecaySeries;
  parent: string;
  daughter: string;
  parentNuclide: Nuclide;
  daughterNuclide: Nuclide;
  equation: string;
  emissionSymbol: string;
  halfLife: number;
  unit: string;
  mode: DecayMode;
  modeLabel: string;
  emission: string;
  parentRgb: string;
  daughterRgb: string;
};

type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: "parent" | "daughter";
  chainStage: number;
  pulse: number;
  radius: number;
};

type Burst = {
  id: number;
  x: number;
  y: number;
  life: number;
  angle: number;
  kind: DecayMode;
};

type HistoryPoint = {
  t: number;
  remaining: number;
};

type ChartScale = "linear" | "log";

type ChainStage = {
  key: string;
  name: string;
  nuclide: Nuclide;
  halfLifeLabel: string;
  halfLifeSeconds?: number;
  mode?: DecayMode;
  stable?: boolean;
};

type MapViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const DECAY_LAB_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Phenomena Decay Lab",
  url: "https://shymohn99.github.io/nuclear-decay-lab/labs/decay",
  description:
    "Explore radioactive decay, major decay chains, nuclide relationships, and detector response in an interactive Monte Carlo laboratory.",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  isAccessibleForFree: true,
  image: "https://shymohn99.github.io/nuclear-decay-lab/og.png",
  inLanguage: ["ja", "en"],
  creator: {
    "@type": "Person",
    name: "Shymohn",
    url: "https://shymohn99.github.io/portfolio/",
    sameAs: [
      "https://github.com/shymohn99",
      "https://x.com/Shymohn",
    ],
  },
};

const SUPERSCRIPT_DIGITS = "â°Â¹Â²Â³â´âµâ¶â·â¸â¹";
const SUBSCRIPT_DIGITS = "â‚€â‚â‚‚â‚ƒâ‚„â‚…â‚†â‚‡â‚ˆâ‚‰";

function scriptNumber(value: number, digits: string) {
  return String(value)
    .split("")
    .map((digit) => digits[Number(digit)])
    .join("");
}

function formatNuclideText(nuclide: Nuclide) {
  return `${scriptNumber(nuclide.massNumber, SUPERSCRIPT_DIGITS)}${scriptNumber(
    nuclide.protonNumber,
    SUBSCRIPT_DIGITS,
  )}${nuclide.element}`;
}

function createPreset(
  preset: Omit<IsotopePreset, "equation" | "emissionSymbol" | "modeLabel" | "emission"> & {
    modeLabel?: string;
    emission?: string;
    emissionSymbol?: string;
  },
): IsotopePreset {
  const defaults =
    preset.mode === "alpha"
      ? {
          modeLabel: "Î±å£Šå¤‰",
          emission: "ãƒ˜ãƒªã‚¦ãƒ åŸå­æ ¸",
          emissionSymbol: "â´â‚‚He",
        }
      : preset.mode === "beta"
        ? {
            modeLabel: "Î²â»å£Šå¤‰",
            emission: "é›»å­ãƒ»åé›»å­ãƒ‹ãƒ¥ãƒ¼ãƒˆãƒªãƒ",
            emissionSymbol: "eâ» + Î½Ì„â‚‘",
          }
        : {
            modeLabel: "Î³æ”¾å‡º",
            emission: "Î³ç·š",
            emissionSymbol: "Î³",
          };
  const emissionSymbol = preset.emissionSymbol ?? defaults.emissionSymbol;

  return {
    ...preset,
    modeLabel: preset.modeLabel ?? defaults.modeLabel,
    emission: preset.emission ?? defaults.emission,
    emissionSymbol,
    equation: `${formatNuclideText(preset.parentNuclide)} â†’ ${formatNuclideText(
      preset.daughterNuclide,
    )} + ${emissionSymbol}`,
  };
}

const SERIES_OPTIONS: Array<{
  key: DecaySeries;
  label: string;
  labelEn: string;
  caption: string;
  captionEn: string;
}> = [
  {
    key: "independent",
    label: "å˜ç‹¬æ ¸ç¨®",
    labelEn: "Independent",
    caption: "ä»£è¡¨çš„ãªäººå·¥ãƒ»å¤©ç„¶æ ¸ç¨®",
    captionEn: "Featured nuclides",
  },
  {
    key: "uranium-238",
    label: "U-238ç³»åˆ—",
    labelEn: "U-238 series",
    caption: "ã‚¦ãƒ©ãƒ³ç³»åˆ—",
    captionEn: "Uranium series",
  },
  {
    key: "thorium-232",
    label: "Th-232ç³»åˆ—",
    labelEn: "Th-232 series",
    caption: "ãƒˆãƒªã‚¦ãƒ ç³»åˆ—",
    captionEn: "Thorium series",
  },
  {
    key: "uranium-235",
    label: "U-235ç³»åˆ—",
    labelEn: "U-235 series",
    caption: "ã‚¢ã‚¯ãƒãƒ‹ã‚¦ãƒ ç³»åˆ—",
    captionEn: "Actinium series",
  },
];

const CHAIN_STAGE_COLORS = [
  "#dc504e",
  "#cf762f",
  "#b39732",
  "#75904d",
  "#3e8c78",
  "#3197aa",
  "#526ea2",
  "#8563a0",
];

const DETECTORS: Record<
  DetectorKey,
  {
    name: string;
    nameEn: string;
    shortName: string;
    description: string;
    descriptionEn: string;
    background: number;
    efficiency: Record<DecayMode, number>;
  }
> = {
  gm: {
    name: "GMè¨ˆæ•°ç®¡",
    nameEn: "Geiger-MÃ¼ller counter",
    shortName: "GM",
    description: "å£Šå¤‰ã®å›æ•°ã‚’è»½å¿«ãªãƒ‘ãƒ«ã‚¹ã¨ã—ã¦æ•°ãˆã¾ã™ã€‚",
    descriptionEn: "Counts radiation events as distinct electrical pulses.",
    background: 0.35,
    efficiency: { alpha: 0.32, beta: 0.72, gamma: 0.11 },
  },
  scintillator: {
    name: "ã‚·ãƒ³ãƒãƒ¬ãƒ¼ã‚·ãƒ§ãƒ³æ¤œå‡ºå™¨",
    nameEn: "Scintillation detector",
    shortName: "SCINT",
    description: "æ”¾å°„ç·šã‚’å¾®ã‹ãªå…‰ã¸å¤‰æ›ã—ã€é«˜æ„Ÿåº¦ã§è¦³æ¸¬ã—ã¾ã™ã€‚",
    descriptionEn: "Converts radiation into faint light for sensitive detection.",
    background: 0.18,
    efficiency: { alpha: 0.58, beta: 0.84, gamma: 0.76 },
  },
  semiconductor: {
    name: "åŠå°ä½“æ¤œå‡ºå™¨",
    nameEn: "Semiconductor detector",
    shortName: "HPGe",
    description: "é«˜ã„åˆ†è§£èƒ½ã§æ”¾å°„ç·šã®ä¿¡å·ã‚’èª­ã¿åˆ†ã‘ã¾ã™ã€‚",
    descriptionEn: "Separates radiation signals with high energy resolution.",
    background: 0.08,
    efficiency: { alpha: 0.9, beta: 0.88, gamma: 0.93 },
  },
};

const SHIELDS: Record<
  ShieldKey,
  {
    name: string;
    nameEn: string;
    symbol: string;
    coefficient: Record<DecayMode, number>;
  }
> = {
  none: {
    name: "é®è”½ãªã—",
    nameEn: "No shielding",
    symbol: "â€”",
    coefficient: { alpha: 0, beta: 0, gamma: 0 },
  },
  paper: {
    name: "ç´™",
    nameEn: "Paper",
    symbol: "P",
    coefficient: { alpha: 3.2, beta: 0.07, gamma: 0.002 },
  },
  aluminum: {
    name: "ã‚¢ãƒ«ãƒŸãƒ‹ã‚¦ãƒ ",
    nameEn: "Aluminum",
    symbol: "Al",
    coefficient: { alpha: 5.8, beta: 0.24, gamma: 0.018 },
  },
  lead: {
    name: "é‰›",
    nameEn: "Lead",
    symbol: "Pb",
    coefficient: { alpha: 8.5, beta: 0.48, gamma: 0.18 },
  },
};

const LANGUAGE_STORAGE_KEY = "nuclear-decay-lab-language";

const ELEMENT_NAMES_EN: Record<string, string> = {
  Ac: "Actinium",
  C: "Carbon",
  Co: "Cobalt",
  I: "Iodine",
  N: "Nitrogen",
  Ni: "Nickel",
  Pa: "Protactinium",
  Pb: "Lead",
  Po: "Polonium",
  Ra: "Radium",
  Rn: "Radon",
  Th: "Thorium",
  U: "Uranium",
  Xe: "Xenon",
};

const UNIT_LABELS_EN: Record<string, string> = {
  ç§’: "s",
  åˆ†: "min",
  æ™‚é–“: "h",
  æ—¥: "d",
  å¹´: "y",
};

const EMISSION_LABELS_EN: Record<string, string> = {
  "ãƒ˜ãƒªã‚¦ãƒ åŸå­æ ¸": "helium nucleus",
  "é›»å­ãƒ»åé›»å­ãƒ‹ãƒ¥ãƒ¼ãƒˆãƒªãƒ": "electron + electron antineutrino",
  "é›»å­ãƒ»åé›»å­ãƒ‹ãƒ¥ãƒ¼ãƒˆãƒªãƒãƒ»Î³ç·š": "electron + electron antineutrino + Î³ ray",
  "é™½é›»å­ãƒ»ãƒ‹ãƒ¥ãƒ¼ãƒˆãƒªãƒã€ã¾ãŸã¯ç‰¹æ€§Xç·š": "positron + neutrino, or characteristic X-ray",
  "ãƒ‹ãƒ¥ãƒ¼ãƒˆãƒªãƒãƒ»ç‰¹æ€§Xç·š": "neutrino + characteristic X-ray",
  "Î³ç·š": "Î³ ray",
};

function localize(language: Language, japanese: string, english: string) {
  return language === "ja" ? japanese : english;
}

function localizeUnit(unit: string, language: Language) {
  return language === "ja" ? unit : (UNIT_LABELS_EN[unit] ?? unit);
}

function localizeNuclideName(
  japaneseName: string,
  nuclide: Nuclide,
  language: Language,
) {
  if (language === "ja") return japaneseName;
  const symbol = nuclide.element.replace("áµ", "");
  const elementName = ELEMENT_NAMES_EN[symbol] ?? symbol;
  const metastable = nuclide.element.includes("áµ") ? "m" : "";
  return `${elementName}-${nuclide.massNumber}${metastable}`;
}

function localizeModeLabel(label: string, language: Language) {
  if (language === "ja") return label;
  return label
    .replace("Î²âºå£Šå¤‰ / é›»å­æ•ç²", "Î²âº decay / electron capture")
    .replace("æ ¸ç•°æ€§ä½“è»¢ç§»", "isomeric transition")
    .replace("é›»å­æ•ç²", "electron capture")
    .replace("Î²â»å£Šå¤‰", "Î²â» decay")
    .replace("Î±å£Šå¤‰", "Î± decay")
    .replace("Î³æ”¾å‡º", "Î³ emission")
    .replaceAll("ï¼ˆ", " (")
    .replaceAll("ï¼‰", ")");
}

function localizeEmission(emission: string, language: Language) {
  return language === "ja" ? emission : (EMISSION_LABELS_EN[emission] ?? emission);
}

// NNDC NuDat ground-state export (3,149 known nuclides), compressed as
// contiguous neutron-number ranges for each proton number.
const KNOWN_NUCLIDE_RANGES: Array<[number, number, number]> = [
  [1, 0, 6], [2, 1, 8], [3, 1, 8], [3, 10, 10], [4, 2, 12],
  [5, 2, 12], [5, 14, 16], [6, 2, 14], [6, 16, 16], [7, 3, 17],
  [8, 3, 18], [8, 20, 20], [9, 5, 21], [10, 5, 23], [11, 7, 24],
  [12, 6, 26], [13, 8, 28], [14, 8, 29], [15, 10, 30],
  [16, 10, 30], [17, 12, 30], [18, 12, 32], [19, 12, 12],
  [19, 16, 35], [20, 15, 36], [21, 19, 37], [22, 17, 39],
  [23, 20, 41], [24, 18, 42], [25, 19, 19], [25, 21, 45],
  [26, 19, 48], [27, 23, 50], [28, 20, 52], [29, 24, 53],
  [30, 24, 54], [31, 28, 56], [32, 27, 56], [33, 30, 55],
  [34, 29, 57], [35, 33, 59], [36, 31, 64], [37, 35, 66],
  [38, 35, 68], [39, 37, 70], [40, 39, 72], [41, 40, 74],
  [42, 41, 76], [43, 42, 78], [44, 44, 80], [45, 44, 82],
  [46, 45, 83], [47, 46, 85], [48, 47, 86], [49, 48, 88],
  [50, 49, 89], [51, 53, 91], [52, 52, 92], [53, 55, 93],
  [54, 54, 94], [55, 57, 96], [56, 58, 98], [57, 60, 60],
  [57, 63, 99], [58, 63, 63], [58, 65, 100], [59, 62, 62],
  [59, 65, 101], [60, 65, 65], [60, 67, 67], [60, 69, 102],
  [61, 67, 104], [62, 67, 67], [62, 69, 106], [63, 67, 68],
  [63, 71, 107], [64, 71, 71], [64, 73, 108], [65, 70, 70],
  [65, 74, 107], [66, 73, 73], [66, 75, 107], [67, 73, 75],
  [67, 77, 108], [68, 77, 107], [69, 75, 108], [70, 79, 79],
  [70, 81, 110], [71, 79, 113], [72, 81, 114], [73, 82, 115],
  [73, 117, 117], [73, 119, 119], [74, 83, 116], [75, 84, 117],
  [75, 119, 121], [76, 85, 124], [77, 88, 125], [78, 87, 126],
  [79, 91, 127], [80, 90, 131], [81, 95, 135], [82, 96, 136],
  [83, 101, 137], [84, 102, 135], [84, 137, 138], [85, 106, 139],
  [86, 107, 143], [87, 110, 146], [88, 113, 146], [89, 116, 147],
  [90, 118, 148], [91, 120, 148], [92, 123, 127], [92, 129, 148],
  [92, 150, 150], [93, 126, 127], [93, 129, 151], [94, 134, 153],
  [95, 128, 128], [95, 134, 135], [95, 137, 152], [96, 137, 140],
  [96, 142, 155], [97, 136, 137], [97, 139, 139], [97, 141, 141],
  [97, 143, 156], [98, 139, 158], [99, 141, 158], [100, 141, 159],
  [101, 143, 159], [102, 147, 158], [102, 160, 160],
  [103, 148, 159], [103, 161, 161], [103, 163, 163],
  [104, 149, 159], [104, 161, 161], [104, 163, 163],
  [105, 150, 158], [105, 161, 163], [105, 165, 165],
  [106, 152, 161], [106, 163, 163], [106, 165, 165],
  [107, 153, 155], [107, 157, 160], [107, 163, 165],
  [107, 167, 167], [107, 171, 171], [108, 155, 162],
  [108, 165, 165], [108, 167, 167], [108, 169, 169],
  [109, 157, 157], [109, 159, 159], [109, 161, 161],
  [109, 165, 169], [110, 157, 157], [110, 159, 161],
  [110, 163, 163], [110, 167, 167], [110, 169, 172],
  [111, 161, 161], [111, 163, 163], [111, 167, 171],
  [112, 165, 165], [112, 169, 174], [113, 165, 165],
  [113, 169, 173], [113, 177, 177], [114, 170, 176],
  [115, 172, 175], [116, 174, 177], [117, 176, 177], [118, 176, 176],
];

const KNOWN_NUCLIDES = KNOWN_NUCLIDE_RANGES.flatMap(
  ([protons, neutronStart, neutronEnd]) =>
    Array.from({ length: neutronEnd - neutronStart + 1 }, (_, offset) => ({
      protons,
      neutrons: neutronStart + offset,
    })),
);
const NUCLIDE_MAP_CELL = 8;
const NUCLIDE_MAP_PADDING = 24;
const NUCLIDE_MAP_MAX_PROTONS = 118;
const NUCLIDE_MAP_MAX_NEUTRONS = 177;
const NUCLIDE_MAP_WORLD = {
  width:
    NUCLIDE_MAP_PADDING * 2 +
    (NUCLIDE_MAP_MAX_NEUTRONS + 1) * NUCLIDE_MAP_CELL,
  height:
    NUCLIDE_MAP_PADDING * 2 +
    (NUCLIDE_MAP_MAX_PROTONS + 1) * NUCLIDE_MAP_CELL,
};
const NUCLIDE_MAP_DEFAULT_VIEW: MapViewport = {
  x: 0,
  y: 0,
  width: NUCLIDE_MAP_WORLD.width,
  height: NUCLIDE_MAP_WORLD.height,
};
const MAGIC_NUMBERS = [2, 8, 20, 28, 50, 82, 126];

function getNuclideMapPosition(neutrons: number, protons: number) {
  return {
    x: NUCLIDE_MAP_PADDING + neutrons * NUCLIDE_MAP_CELL,
    y:
      NUCLIDE_MAP_PADDING +
      (NUCLIDE_MAP_MAX_PROTONS - protons) * NUCLIDE_MAP_CELL,
  };
}

const KNOWN_NUCLIDE_PATH = KNOWN_NUCLIDES.map(({ protons, neutrons }) => {
  const { x, y } = getNuclideMapPosition(neutrons, protons);
  return `M${x} ${y}h7.25v7.25h-7.25Z`;
}).join("");

const CORE_PRESETS: IsotopePreset[] = [
  createPreset({
    key: "iodine-131",
    series: "independent",
    parent: "ãƒ¨ã‚¦ç´ 131",
    daughter: "ã‚­ã‚»ãƒãƒ³131",
    parentNuclide: { massNumber: 131, protonNumber: 53, element: "I" },
    daughterNuclide: { massNumber: 131, protonNumber: 54, element: "Xe" },
    halfLife: 8.02,
    unit: "æ—¥",
    mode: "beta",
    parentRgb: "221, 80, 78",
    daughterRgb: "49, 163, 177",
  }),
  createPreset({
    key: "carbon-14",
    series: "independent",
    parent: "ç‚­ç´ 14",
    daughter: "çª’ç´ 14",
    parentNuclide: { massNumber: 14, protonNumber: 6, element: "C" },
    daughterNuclide: { massNumber: 14, protonNumber: 7, element: "N" },
    halfLife: 5730,
    unit: "å¹´",
    mode: "beta",
    parentRgb: "205, 120, 38",
    daughterRgb: "39, 145, 102",
  }),
  createPreset({
    key: "cobalt-60",
    series: "independent",
    parent: "ã‚³ãƒãƒ«ãƒˆ60",
    daughter: "ãƒ‹ãƒƒã‚±ãƒ«60",
    parentNuclide: { massNumber: 60, protonNumber: 27, element: "Co" },
    daughterNuclide: { massNumber: 60, protonNumber: 28, element: "Ni" },
    halfLife: 5.27,
    unit: "å¹´",
    mode: "gamma",
    modeLabel: "Î²â»å£Šå¤‰ + Î³æ”¾å‡º",
    emission: "é›»å­ãƒ»åé›»å­ãƒ‹ãƒ¥ãƒ¼ãƒˆãƒªãƒãƒ»Î³ç·š",
    emissionSymbol: "eâ» + Î½Ì„â‚‘ + Î³",
    parentRgb: "132, 85, 183",
    daughterRgb: "43, 132, 185",
  }),
  createPreset({
    key: "uranium-238",
    series: "uranium-238",
    parent: "ã‚¦ãƒ©ãƒ³238",
    daughter: "ãƒˆãƒªã‚¦ãƒ 234",
    parentNuclide: { massNumber: 238, protonNumber: 92,ÛİıÖÚ$z{-®éÜj×ÇVWFW‡C×¶f÷&ÖE7VVD×VÇF—Æ–W"‡7VVB—Ğ¢óà¢ÆF—b6Æ74æÖSÒ&Æör×66ÆRÖÖ&·2"&–Ö†–FFVãÒ'G'VR#à¢Ç7ãã(¼+(SÂ÷7ãà¢Ç7ãã(¼+œ+#Â÷7ãà¢Ç7ãã(¾(“Â÷7ãà¢Ç7ãã(¾(cÂ÷7ãà¢Ç7ãã(¼+3Â÷7ãà¢Ç7ããÂ÷7ãà¢Ç7ãã+3Â÷7ãà¢Ç7ãã(cÂ÷7ãà¢ÂöF—cà¢Ç6ÖÆÃà¢·B€¢#(¼+(\9~8	Ã(l9~8ã#j8).˜
>{i®y¨N8¾Š«şi[N8~8î88""À¢$6öçF–çV÷W6Ç’F§W7F&ÆR7&÷72#÷&FW'2öbÖvæ—GVFRÂg&öÒ(¼+(\9rFò(l9râ"À¢—Ğ¢Â÷6ÖÆÃà¢ÂöÆ&VÃà ¢ÆF—`¢6Æ74æÖS×¶F–ÖR×&FRG°¢6–×VÆF–öäÖöFRÓÓÒ&6†–â"ò&6†–â×F–ÖR×&FR"¢" ¢ÖĞ¢&–ÖÆ—fSÒ'öÆ—FR ¢à¢Ç7ãç·B‚%D”ÔR44ÄRòxûîZéşi˜.™i>88îZûî[ùÂ"Â%D”ÔR44ÄRò$TÂÕD”ÔRUT•dÄTåB"—ÓÂ÷7ãà¢ÆF—cà¢Ç6ÖÆÃç·B‚.xûîZéş8â"Â'&VÂF–ÖR"—ÓÂ÷6ÖÆÃà¢Ç7G&öæsç·B‚#zy""Â#2"—ÓÂ÷7G&öæsà¢Æ"&–Ö†–FFVãÒ'G'VR#î(i#Âö#à¢Ç6ÖÆÃç·B‚.8+~89ş8:^8:Î8;Î8+~8:~8;>XhR"Â'6–×VÆF–öâ"—ÓÂ÷6ÖÆÃà¢Ç7G&öæsç·B†{HBG·6–×VÆF–öå&FWÖÂ(˜‚G·6–×VÆF–öå&FWÖ—ÓÂ÷7G&öæsà¢ÂöF—cà¢·6–×VÆF–öäÖöFRÓÓÒ&6†–â"ò€¢Çà¢¶6†–å&FTÖöFRÓÓÒ'‡—6–6Â ¢òB€¢G·&W6WBç&VçGŞ8îXØ®k‰¾iÉş8).Yû®k©n8¾8xûîZéş8ãzy.8N88¾Zéşi˜.™i>8Î{HBG·6–×VÆF–öå&FWŞ˜.8ş8î88.˜
>˜énXh^8îYNjzŠî8(.YÎ8Zéşi˜.™i>8~Šˆzé~8~8î88&À¢V6‚&VÂ×F–ÖR6V6öæBGfæ6W2&÷WBG·6–×VÆF–öå&FWÒâWfW'’çV6Æ–FR–âF†R6†–âW6W2F†B6ÖR‡—6–6ÂVÆ6VBF–ÖRæÀ¢¢¢B€¢xûîZéş8ãzy.8N88¾{HBG¶f÷&ÖDçVÖ&W"…4”ÕTÄDTEô„ÄeôÄ•dU5õU%õ4T4ôäB¢7VVB—ÒL+Ş˜.8ş8î88.YNjë^™¨î8YÎ8Šk>ZùşyJZ8®ZHZé®i[8).˜yJ8~8î88&À¢V6‚&VÂ×F–ÖR6V6öæBGfæ6W2&÷WBG¶f÷&ÖDçVÖ&W"…4”ÕTÄDTEô„ÄeôÄ•dU5õU%õ4T4ôäB¢7VVBÂÆæwVvR—ÒL+ÒâF†R6ÖRö'6W'fF–öâFV6’6öç7FçB—2Æ–VBFòWfW'’7FvRæÀ¢—Ğ¢Â÷à¢’¢€¢Çà¢·B€¢xûîZéş8ãzy.8N88¾8xûîYÊ8îjzŠî8îi˜.™i>8Î{HBG·6–×VÆF–öå&FWŞ˜.8ş8î88&À¢V6‚&VÂ×F–ÖR6V6öæBGfæ6W2F†R6VÆV7FVBçV6Æ–FR'’&÷WBG·6–×VÆF–öå&FWÒæÀ¢—Ğ¢Â÷à¢—Ğ¢ÂöF—cà ¢ÆF—b6Æ74æÖSÒ&6öçG&öÂÖ7F–öç2#à¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢6Æ74æÖSÒ'&–Ö'’Ö7F–öâ ¢öä6Æ–6³×²‚’Óâ6WEW6VB‚‡fÇVR’ÓâfÇVR—Ğ¢à¢·W6VBòB‚.)kbXhŞ™h²"Â.)kb&W7VÖR"’¢B‚.(ZKˆi˜.XÎjÚ""Â.(ZW6R"—Ğ¢Âö'WGFöãà¢Æ'WGFöâG—SÒ&'WGFöâ"öä6Æ–6³×·&W6WE6–×VÆF–öçÓî(k²·B‚.8:®8+¾88>88‚"Â%&W6WB"—ÓÂö'WGFöãà¢ÂöF—cà ¢ÆF—b6Æ74æÖSÒ&f÷&×VÆ#à¢Ç7ãç·B‚.Z8®ZH8îk9^X˜r"Â$FV6’Ær"—ÓÂ÷7ãà¢Æ6öFSäâ‡B’Òî((+r#Ç7Wî(‰'BòL+ÓÂ÷7WãÂö6öFSà¢Ç6ÖÆÃà¢·B€¢.i˜.™i>8ÎXØ®k‰¾iÉòL+Ò88˜.8(8N88¾8Šj®jzŠî8şXØ®Xˆn8¾8®8(®8î88""À¢$gFW"V6‚†ÆbÖÆ–fRL+ÒÂ†ÆböbF†R&VçBçV6ÆV’&VÖ–âöâfW&vRâ"À¢—Ğ¢Â÷6ÖÆÃà¢ÂöF—cà¢Âö6–FSà¢ÂöF—cà ¢ÆF—`¢6Æ74æÖSÒ&WVF–öâ×æVÂ ¢&–ÖÆ&VÃ×·B†G·&W6WBç&VçGŞ8îZ8®ZH[ÈöÂG·&W6WE&VçDæÖWÒFV6’WVF–öæ—Ğ¢à¢ÆF—b6Æ74æÖSÒ&WVF–öâÖ†VF–ær#à¢ÆF—cà¢Ç7ãäDT4’$T5D”ôâò$TdU$Tä4SÂ÷7ãà¢Ç7G&öæsà¢·6–×VÆF–öäÖöFRÓÓÒ&6†–â ¢òB‚.iÈX‰Ş8îZ8®ZH’"Â$f—'7BFV6’"¢¢B‚.Z8®ZH[Èò"Â$FV6’WVF–öâ"—Ğ¢Â÷7G&öæsà¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&WVF–öâÖ†VF–ærÖ7F–öç2#à¢Ç6ÖÆÃç·&W6WDÖöFTÆ&VÇÓÂ÷6ÖÆÃà¢Æ'WGFöâG—SÒ&'WGFöâ"öä6Æ–6³×¶6÷”WVF–öçÓà¢¶WVF–öä6÷–V@¢òB‚.8+>89N8;Î8~8î8~8ò"Â$6÷–VB"¢¢B‚.[Èş8).8+>89N8;Â"Â$6÷’WVF–öâ"—Ğ¢Âö'WGFöãà¢ÂöF—cà¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&FV6’ÖfÆ÷r#à¢ÆF—b6Æ74æÖSÒ'&V7F–öâ×7V6–W2&V7F–öâ×&VçB#à¢Ç7ãç·B‚.Šj®jzŠâ"Â%&VçB"—ÓÂ÷7ãà¢ÄçV6Æ–FU7–Ö&öÀ¢çV6Æ–FS×·&W6WBç&VçDçV6Æ–FWĞ¢6Æ74æÖSÒ'&V7F–öâ×7–Ö&öÂ ¢ÆæwVvS×¶ÆæwVvWĞ¢óà¢Ç6ÖÆÃç·&W6WE&VçDæÖWÓÂ÷6ÖÆÃà¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ'&V7F–öâÖ'&÷r"&–Ö†–FFVãÒ'G'VR#à¢Ç7ãç·&W6WDÖöFTÆ&VÇÓÂ÷7ãà¢Æ#î(i#Âö#à¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ'&V7F–öâ×7V6–W2&V7F–öâÖFVv‡FW"#à¢Ç7ãç·B‚.Z‰jzŠâ"Â$FVv‡FW""—ÓÂ÷7ãà¢ÄçV6Æ–FU7–Ö&öÀ¢çV6Æ–FS×·&W6WBæFVv‡FW$çV6Æ–FWĞ¢6Æ74æÖSÒ'&V7F–öâ×7–Ö&öÂ ¢ÆæwVvS×¶ÆæwVvWĞ¢óà¢Ç6ÖÆÃç·&W6WDFVv‡FW$æÖWÓÂ÷6ÖÆÃà¢ÂöF—cà¢Æ"6Æ74æÖSÒ'&V7F–öâ×ÇW2"&–Ö†–FFVãÒ'G'VR#îûÈ³Âö#à¢ÆF—b6Æ74æÖSÒ'&V7F–öâ×7V6–W2&V7F–öâÖVÖ—76–öâ#à¢Ç7ãç·B‚.iKîX{®{).ZÙ"Â$VÖ—76–öâ"—ÓÂ÷7ãà¢Æ6öFSç·&W6WBæVÖ—76–öå7–Ö&öÇÓÂö6öFSà¢Ç6ÖÆÃç¶Æö6Æ—¦TVÖ—76–öâ‡&W6WBæVÖ—76–öâÂÆæwVvR—ÓÂ÷6ÖÆÃà¢ÂöF—cà¢ÂöF—cà¢ÂöF—cà¢Â÷6V7F–öãà ¢Ç6V7F–öâ6Æ74æÖSÒ&FF×6V7F–öâ"&–ÖÆ&VÆÆVF'“Ò&ö'6W'fF–öâ×F—FÆR#à¢ÆF—b6Æ74æÖSÒ'6V7F–öâÖ†VF–ær#à¢ÆF—cà¢Ç6Æ74æÖSÒ'6V7F–öâÖçVÖ&W"#ã"òô%4U%dD”ôãÂ÷à¢Æƒ"–CÒ&ö'6W'fF–öâ×F—FÆR#ç·B‚.Šk>kŠÎX
N8ynŠ¹nX
B"Â$ö'6W'fF–öâbF†V÷'’"—ÓÂöƒ#à¢ÂöF—cà¢Çà¢·6–×VÆF–öäÖöFRÓÓÒ&6†–â ¢òB€¢.X‰ŞiÉşjzŠî8Î{;¾X‰~8îjÊjë^™¨î8z{¾8>8şX›.Y8).8ynŠ¹ny¨N8®hÈ~i[k‰¾Š8jùN‹È>8~8î88""À¢$6ö×&RF†Rg&7F–öâÆVf–ærF†R–æ—F–ÂçV6Æ–FRf÷"ÆFW"6†–â7FvW2v—F‚F†V÷&WF–6ÂW‡öæVçF–ÂFV6’â"À¢¢¢B€¢.‹ZN8Nx+8Zéş{y®8ÎK¸®Y¹î8îŠšnŠÎ8™Ù.8NzN{y®8ÎynŠ¹nX
N8~88.8:®8+¾88>8888(¾8ş8>8¾8z+®xè~8¾8(8(¾hû®8(8îik8ÎZH8(ş8(®8î88""À¢%ö–çG2æBF†R6öÆ–BÆ–æR6†÷rF†—2G&–Ã²F†RF6†VBÆ–æR—2F†RF†V÷&WF–6Â7W'fRâ&W6WBFò6VRæWr7Fö6†7F–2fÇV7GVF–öââ"À¢—Ğ¢Â÷à¢ÂöF—cà ¢ÆF—b6Æ74æÖSÒ'7FG2Öw&–B#à¢Æ'F–6ÆSà¢Ç7ãç·B‚.{XÎ˜îi˜.™i2"Â$VÆ6VBF–ÖR"—ÓÂ÷7ãà¢Ç7G&öæsç¶f÷&ÖDVÆ6VB†VÆ6VBÂ&W6WBÂÆæwVvR—ÓÂ÷7G&öæsà¢Ç6ÖÆÃà¢·6–×VÆF–öäÖöFRÓÓÒ&6†–â ¢òB€¢G¶VÆ6VBçFôf—†VBƒ"—Ò9rG·&W6WBç&VçGŞ8åL+ÖÀ¢G¶VÆ6VBçFôf—†VBƒ"—Ò9rG·&W6WE&VçDæÖWÒL+ÖÀ¢¢¢G¶VÆ6VBçFôf—†VBƒ"—Ò9rL+ÖĞ¢Â÷6ÖÆÃà¢Âö'F–6ÆSà¢Æ'F–6ÆSà¢Ç7ãà¢·6–×VÆF–öäÖöFRÓÓÒ&6†–â ¢òB‚.X‰ŞiÉşjzŠî8¾jè¾8(¾XéşZÙj‚"Â$çV6ÆV’–â–æ—F–ÂçV6Æ–FR"¢¢B‚.iÊ®Z8®ZH8îXéşZÙj‚"Â%VæFV6–VBçV6ÆV’"—Ğ¢Â÷7ãà¢Ç7G&öæsç·&VÖ–æ–æwÓÇ6ÖÆÃâò¶FöÔ6÷VçGÓÂ÷6ÖÆÃãÂ÷7G&öæsà¢Ç6ÖÆÃç·&VÖ–æ–æuW&6VçBçFôf—†VBƒ—ÒSÂ÷6ÖÆÃà¢Âö'F–6ÆSà¢Æ'F–6ÆSà¢Ç7ãà¢·6–×VÆF–öäÖöFRÓÓÒ&6†–â ¢òB‚.{;¾X‰~8z{¾8>8şXéşZÙj‚"Â$çV6ÆV’Ö÷fVB–çFò6†–â"¢¢B‚.Z8®ZH8~8şXéşZÙj‚"Â$FV6–VBçV6ÆV’"—Ğ¢Â÷7ãà¢Ç7G&öæsç¶FV6–VGÓÂ÷7G&öæsà¢Ç6ÖÆÃç·B‚.ynŠ¹nKˆ®8ò"Â$W‡V7FVB"—Ò´ÖF‚ç&÷VæB†FöÔ6÷VçBÒW‡V7FVB—ÓÂ÷6ÖÆÃà¢Âö'F–6ÆSà¢ÂöF—cà ¢ÆF—b6Æ74æÖSÒ&6†'B×æVÂ#à¢ÆF—b6Æ74æÖSÒ&6†'BÖÖWF#à¢Ç7ããÆ’6Æ74æÖSÒ&ö'6W'fVBÖÆ–æR"7G–ÆS×·²&6¶w&÷VæD6öÆ÷#¢&VçD6öÆ÷"×Òóç·B‚.Šk>kŠÎX
B"Â$ö'6W'fVB"—ÓÂ÷7ãà¢Ç7ããÆ’6Æ74æÖSÒ'F†V÷'’ÖÆ–æR"7G–ÆS×·²&÷&FW%F÷6öÆ÷#¢FVv‡FW$6öÆ÷"×Òóç·B‚.ynŠ¹nX
B"Â%F†V÷'’"—ÓÂ÷7ãà¢ÆF—b6Æ74æÖSÒ&6†'B×66ÆR×FövvÆR"&öÆSÒ&w&÷W"&–ÖÆ&VÃ×·B‚.8+8:89^8îyºîy¹¾8(¢"Â$6†'B66ÆR"—Óà¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢&–×&W76VC×¶6†'E66ÆRÓÓÒ&Æ–æV"'Ğ¢öä6Æ–6³×²‚’Óâ6WD6†'E66ÆR‚&Æ–æV""—Ğ¢à¢·B‚.{y®[Ú""Â$Æ–æV""—Ğ¢Âö'WGFöãà¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢&–×&W76VC×¶6†'E66ÆRÓÓÒ&Æör'Ğ¢öä6Æ–6³×²‚’Óâ6WD6†'E66ÆR‚&Æör"—Ğ¢à¢·B‚.Zûîi["Â$Æör"—Ğ¢Âö'WGFöãà¢ÂöF—cà¢Ç7G&öæsç·B‚.hêZé®kK¾X¹^[ªb"Â$W7F–ÖFVB7F—f—G’"—Ò¶7F—f—G’çFôf—†VBƒ—ÒòL+ÓÂ÷7G&öæsà¢Æ'WGFöâG—SÒ&'WGFöâ"6Æ74æÖSÒ&W‡÷'BÖ'WGFöâ"öä6Æ–6³×¶W‡÷'D†—7F÷'”77gÓà¢·B‚$55n8~KùŞZÙ‚"Â%6fR55b"—Ğ¢Âö'WGFöãà¢ÂöF—cà¢Ç7fp¢6Æ74æÖSÒ&FV6’Ö6†'B ¢f–Wt&÷ƒ×¶G¶6†'Bçv–GF‡ÒG¶6†'Bæ†V–v‡GÖĞ¢&öÆSÒ&–Ör ¢&–ÖÆ&VÆÆVF'“Ò&6†'B×F—FÆR6†'BÖFW67&—F–öâ ¢à¢ÇF—FÆR–CÒ&6†'B×F—FÆR#à¢·B€¢G·6–×VÆF–öäÖöFRÓÓÒ&6†–â"ò.X‰ŞiÉşjzŠîi["¢.iÊ®Z8®ZHXéşZÙji['Ş8îi˜.™i>ZHXÉnûÈ‚G¶6†'E66ÆRÓÓÒ&Æör"ò.Zûîi["¢.{y®[Ú"'Şyºîy¹¾8(®ûÈ–À¢G·6–×VÆF–öäÖöFRÓÓÒ&6†–â"ò$–æ—F–ÂÖçV6Æ–FR÷VÆF–öâ"¢%VæFV6–VBçV6ÆV’'Ò÷fW"F–ÖR‚G¶6†'E66ÆRÓÓÒ&Æör"ò&Æör"¢&Æ–æV"'Ò66ÆR–À¢—Ğ¢Â÷F—FÆSà¢ÆFW62–CÒ&6†'BÖFW67&—F–öâ#à¢·B€¢G·6–×VÆF–öäÖöFRÓÓÒ&6†–â"ò6W&–W4Æ&VÂ¢&W6WBç&VçGŞ8îŠk>kŠÎX
N8hÈ~i[™j.i[8¾8(8(¾ynŠ¹nX
N8)"G¶6†'E66ÆRÓÓÒ&Æör"ò.Zûîi["¢.{y®[Ú"'Şyºîy¹¾8(®8~jùN‹È>8~8ş8+8:89^8~88&À¢6†'B6ö×&–ærö'6W'fVBfÇVW2f÷"G·6–×VÆF–öäÖöFRÓÓÒ&6†–â"ò6W&–W4Æ&VÂ¢&W6WE&VçDæÖWÒv—F‚W‡öæVçF–ÂF†V÷'’öâG¶6†'E66ÆRÓÓÒ&Æör"ò&Æör"¢&Æ–æV"'Ò66ÆRæÀ¢—Ğ¢ÂöFW63à¢¶6†'Bç•F–6·2æÖ‚‡F–6²’Óâ°¢&WGW&â€¢Ær¶W“×·F–6²æÆ&VÇÓà¢ÆÆ–æP¢6Æ74æÖSÒ&6†'BÖw&–BÖÆ–æR ¢ƒ×¶6†'BæÆVgGĞ¢ƒ#×¶6†'Bçv–GF‚Ò6†'Bç&–v‡GĞ¢“×·F–6²ç—Ğ¢“#×·F–6²ç—Ğ¢óà¢ÇFW‡BƒÒ#‚"“×·F–6²ç’²GÓç·F–6²æÆ&VÇÓÂ÷FW‡Cà¢Âösà¢“°¢Ò—Ğ¢µ³Âã#RÂãRÂãsRÂÒæÖ‚‡&F–ò’Óâ°¢6öç7B‚Ò6†'BæÆVgB²&F–ò¢6†'BçÆ÷Ev–GFƒ°¢&WGW&â€¢Ær¶W“×·&F–÷Óà¢ÆÆ–æP¢6Æ74æÖSÒ&6†'B×F–6² ¢ƒ×·‡Ğ¢ƒ#×·‡Ğ¢“×¶6†'Bæ†V–v‡BÒ6†'Bæ&÷GFö×Ğ¢“#×¶6†'Bæ†V–v‡BÒ6†'Bæ&÷GFöÒ²gĞ¢óà¢ÇFW‡B6Æ74æÖSÒ'‚×F–6²ÖÆ&VÂ"ƒ×·‡Ò“×¶6†'Bæ†V–v‡BÒ‡Óà¢·6–×VÆF–öäÖöFRÓÓÒ&6†–â ¢òf÷&ÖDçVÖ&W"†6†'BæÖ…B¢&F–ò¢&W6WBæ†ÆdÆ–fR¢¢†6†'BæÖ…B¢&F–ò’çFôf—†VBƒ"—Ğ¢Â÷FW‡Cà¢Âösà¢“°¢Ò—Ğ¢ÆÆ–æP¢6Æ74æÖSÒ&6†'BÖ†—2 ¢ƒ×¶6†'BæÆVgGĞ¢ƒ#×¶6†'Bçv–GF‚Ò6†'Bç&–v‡GĞ¢“×¶6†'Bæ†V–v‡BÒ6†'Bæ&÷GFö×Ğ¢“#×¶6†'Bæ†V–v‡BÒ6†'Bæ&÷GFö×Ğ¢óà¢ÇF€¢6Æ74æÖSÒ'F†V÷'’×F‚ ¢C×¶6†'BçF†V÷&WF–6ÅF‡Ğ¢7G&ö¶S×¶FVv‡FW$6öÆ÷'Ğ¢óà¢ÇF€¢6Æ74æÖSÒ&ö'6W'fVB×F‚ ¢C×¶6†'Bæö'6W'fVEF‡Ğ¢7G&ö¶S×·&VçD6öÆ÷'Ğ¢óà¢¶6†'Bæö'6W'fVEö–çG2æÖ‚‡ö–çBÂ–æFW‚’Óâ€¢Æ6—&6ÆP¢6Æ74æÖSÒ&ö'6W'fVB×ö–çB ¢7ƒ×·ö–çBç‡Ğ¢7“×·ö–çBç—Ğ¢f–ÆÃ×·&VçD6öÆ÷'Ğ¢7G&ö¶SÒ"6fc†c" ¢#Ò#"ãR ¢¶W“×¶G¶–æFW‡ÒÒG·ö–çBç‡ÖĞ¢óà¢’—Ğ¢ÇFW‡B6Æ74æÖSÒ&†—2Ö6F–öâ"ƒ×¶6†'Bçv–GF‚Ò6†'Bç&–v‡GÒ“×¶6†'Bæ†V–v‡BÒ'Óà¢·6–×VÆF–öäÖöFRÓÓÒ&6†–â ¢òB€¢{XÎ˜îi˜.™i>ûÈ‚G·&W6WBçVæ—GÒòG·&W6WBç&VçGŞYû®k©nûÈ–À¢VÆ6VBF–ÖR‚G¶Æö6Æ—¦UVæ—B‡&W6WBçVæ—BÂÆæwVvR—ÒòG·&W6WE&VçDæÖWÒ&6—2–À¢¢¢B‚.{XÎ˜îi˜.™i>ûÈXØ®k‰¾iÉòL+ŞûÈ’"Â$VÆ6VBF–ÖR††ÆbÖÆ—fW2L+Ò’"—Ğ¢Â÷FW‡Cà¢Â÷7fsà¢ÂöF—cà¢Â÷6V7F–öãà ¢ÄçV6Æ–FTvVæVÆöw¢&W6WC×·&W6WGĞ¢öå6VÆV7E&W6WC×·6VÆV7E&W6WGĞ¢ÆæwVvS×¶ÆæwVvWĞ¢óà ¢ÄFWFV7F÷$Æ ¢&W6WC×·&W6WGĞ¢&VÖ–æ–æs×·&VÖ–æ–æwĞ¢FöÔ6÷VçC×¶FöÔ6÷VçGĞ¢FWFV7F÷$¶W“×¶FWFV7F÷$¶W—Ğ¢öäFWFV7F÷$6†ævS×·6WDFWFV7F÷$¶W—Ğ¢6†–VÆD¶W“×·6†–VÆD¶W—Ğ¢öå6†–VÆD6†ævS×·6WE6†–VÆD¶W—Ğ¢F—7Fæ6S×¶FWFV7F÷$F—7Fæ6WĞ¢öäF—7Fæ6T6†ævS×·6WDFWFV7F÷$F—7Fæ6WĞ¢F†–6¶æW73×·6†–VÆEF†–6¶æW77Ğ¢öåF†–6¶æW746†ævS×·6WE6†–VÆEF†–6¶æW77Ğ¢ÖV7W&VÖVçE6V6öæG3×¶ÖV7W&VÖVçE6V6öæG7Ğ¢öäÖV7W&VÖVçE6V6öæG46†ævS×·6WDÖV7W&VÖVçE6V6öæG7Ğ¢ÆæwVvS×¶ÆæwVvWĞ¢óà ¢Æfö÷FW#à¢ÆF—b6Æ74æÖSÒ&fö÷FW"Ö'&æB#à¢Ç7G&öæså„TäôÔTäÂ÷7G&öæsà¢Ç7ãädõTäDD”ôâcòÔôåDR4$ÄòDT4’Ä#Â÷7ãà¢ÂöF—cà¢Ææb&–ÖÆ&VÃ×·B‚%6‡–Öö†î889~8:Ş8+8*~8*ş8888î8:®8;>8*ò"Â$Æ–æ·2Fò6‡–Öö†âæBF†—2&ö¦V7B"—Óà¢Æ‡&VcÒ&‡GG3¢ò÷‚æ6öÒõ6‡–Öö†â"F&vWCÒ%ö&Ææ²"&VÃÒ&æö÷VæW"æ÷&VfW'&W"#à¢6‡–Öö†âöâ‚(ip¢Âöà¢Æ‡&VcÒ&‡GG3¢òöv—F‡V"æ6öÒ÷6‡–Öö†ã“’"F&vWCÒ%ö&Ææ²"&VÃÒ&æö÷VæW"æ÷&VfW'&W"#à¢v—D‡V"&öf–ÆR(ip¢Âöà¢Æ¢‡&VcÒ&‡GG3¢ò÷6‡–Öö†ã“’æv—F‡V"æ–ò÷÷'FföÆ–òò ¢F&vWCÒ%ö&Ææ² ¢&VÃÒ&æö÷VæW"æ÷&VfW'&W" ¢à¢6‡–Öö†â÷'FföÆ–ò(ip¢Âöà¢Æ¢6Æ74æÖSÒ'&W÷6—F÷'’ÖÆ–æ² ¢‡&VcÒ&‡GG3¢òöv—F‡V"æ6öÒ÷6‡–Öö†ã“’öçV6ÆV"ÖFV6’ÖÆ" ¢F&vWCÒ%ö&Ææ² ¢&VÃÒ&æö÷VæW"æ÷&VfW'&W" ¢à¢f–Wr6÷W&6R(ip¢Âöà¢Âöæcà¢Çã##b6‡–Öö†âÆÂ&–v‡G2&W6W'fVBãÂ÷à¢Âöfö÷FW#à¢ÂöÖ–ãà¢Âóà¢“°§Ğ Ğ 