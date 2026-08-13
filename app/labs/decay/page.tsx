"use client";

import Link from "next/link";
import { LabStateTools, ModelDisclosure, SafetyNote, usePhenomenaLanguage, useReducedMotion } from "../../components/PhenomenaShell";
import { createSeededRandom, downloadCsv, experimentProvenanceRows, readExperimentQuery, replaceExperimentQuery } from "../../lib/experiment";
import { decayProbability, theoreticalPopulation } from "../../lib/nuclear-models";
import { getLab, type Language } from "../../lib/labs";
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

type DecaySavedState = Readonly<{
  presetKey: string;
  seriesKey: DecaySeries;
  simulationMode: SimulationMode;
  chainRateMode: ChainRateMode;
  atomCount: number;
  speed: number;
  chartScale: ChartScale;
  detectorKey: DetectorKey;
  shieldKey: ShieldKey;
  detectorDistance: number;
  shieldThickness: number;
  measurementSeconds: number;
  resetSeed: number;
}>;

type ChainStage = {
  key: string;
  name: string;
  nuclide: Nuclide;
  halfLifeLabel: string;
  halfLifeSeconds?: number;
  mode?: DecayMode;
  truncated?: boolean;
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
  url: "https://shymohn99.github.io/nuclear-decay-lab/labs/decay/",
  description:
    "Explore radioactive decay, major decay chains, nuclide relationships, and detector response in an interactive Monte Carlo laboratory.",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  isAccessibleForFree: true,
  image: "https://shymohn99.github.io/nuclear-decay-lab/og-phenomena.png",
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

const decayLab = getLab("decay");

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
    unit: "æ—¥ß}üÚÚ$z{-®éÜj×¢B€Ğ¢xûîZéş8ãzy.8N88¾{HBG¶f÷&ÖDçVÖ&W"…4”ÕTÄDTEô„ÄeôÄ•dU5õU%õ4T4ôäB¢7VVB—ÒL+Ş˜.8ş8î88.YNjë^™¨î8YÎ8Šk>ZùşyJZ8®ZHZé®i[8).˜yJ8~8î88&ÀĞ¢V6‚&VÂ×F–ÖR6V6öæBGfæ6W2&÷WBG¶f÷&ÖDçVÖ&W"…4”ÕTÄDTEô„ÄeôÄ•dU5õU%õ4T4ôäB¢7VVBÂÆæwVvR—ÒL+ÒâF†R6ÖRö'6W'fF–öâFV6’6öç7FçB—2Æ–VBFòWfW'’7FvRæÀĞ¢—ĞĞ¢Â÷àĞ¢’¢€Ğ¢ÇàĞ¢·B€Ğ¢xûîZéş8ãzy.8N88¾8xûîYÊ8îjzŠî8îi˜.™i>8Î{HBG·6–×VÆF–öå&FWŞ˜.8ş8î88&ÀĞ¢V6‚&VÂ×F–ÖR6V6öæBGfæ6W2F†R6VÆV7FVBçV6Æ–FR'’&÷WBG·6–×VÆF–öå&FWÒæÀĞ¢—ĞĞ¢Â÷àĞ¢—ĞĞ¢ÂöF—càĞ Ğ¢ÆF—b6Æ74æÖSÒ&6öçG&öÂÖ7F–öç2#à¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢6Æ74æÖSÒ'&–Ö'’Ö7F–öâ Ğ¢öä6Æ–6³×²‚’Óâ6WEW6VB‚‡fÇVR’ÓâfÇVR—ĞĞ¢àĞ¢·W6VBòB‚.)kbXhŞ™h²"Â.)kb&W7VÖR"’¢B‚.(ZKˆi˜.XÎjÚ""Â.(ZW6R"—ĞĞ¢Âö'WGFöãàĞ¢Æ'WGFöâG—SÒ&'WGFöâ"öä6Æ–6³×·&W6WE6–×VÆF–öçÓî(k²·B‚.8:®8+¾88>88‚"Â%&W6WB"—ÓÂö'WGFöãà¢ÂöF—cà ¢ÆÆ&VÂ6Æ74æÖSÒ'&W6WB×6VVB#à¢Ç7ãå$U4UB4TTCÂ÷7ãà¢Æ–çW@¢G—SÒ&çVÖ&W" ¢Ö–ãÒ# ¢Öƒ×´Ô…õ$U4UEõ4TTGĞ¢7FWÒ# ¢–çWDÖöFSÒ&çVÖW&–2 ¢fÇVS×·6VVD–çWGĞ¢öä6†ævS×²†WfVçB’Óâ6WE6VVD–çWB†WfVçBçF&vWBçfÇVR—Ğ¢öä&ÇW#×¶6öÖÖ—E&W6WE6VVGĞ¢öä¶W”F÷vã×²†WfVçB’Óâ°¢–b†WfVçBæ¶W’ÓÓÒ$VçFW""’WfVçBæ7W'&VçEF&vWBæ&ÇW"‚“°¢×Ğ¢&–ÖFW67&–&VF'“Ò'&W6WB×6VVBÖ†VÇ ¢óà¢Ç6ÖÆÂ–CÒ'&W6WB×6VVBÖ†VÇ#à¢·B€¢.i[X
N8).ZH88dVçFW.8î8ş8ş89^8*8;Î8*¾8+8).ZIn8888Ş8ç6VVN8¾8(XhŞ™h¾8~8î88.˜XŞ{Úî8Z8®ZH8*N898;>88X‰~8).X‰ŞiÉşXÉn8~8î88.yK¾™Ú.Kˆ®8îi˜.X‹¾8şzºşiÊ¾8N88¾ZH8(ş8(®8î88""À¢$6†ævRF†RçVÖ&W"æB&W72VçFW"÷"ÆVfRF†Rf–VÆBFò&W7F'Bg&öÒF†B6VVBâ—B–æ—F–Æ—¦W2F†RÆ–÷WBæBFV6’ÖWfVçB7G&VÓ²öâ×67&VVâF–Ö–ærf&–W2'’'&÷w6W"â"À¢—Ğ¢Â÷6ÖÆÃà¢ÂöÆ&VÃà ¢ÄÆ%7FFUFööÇ0¢Æ#×¶FV6”Æ'Ğ¢ÆæwVvS×¶ÆæwVvWĞ¢7FFS×·6fVDFV6•7FFWĞ¢öå&W7F÷&S×·&W7F÷&TFV6•7FFWĞ¢&W7F÷&TöäÖ÷VçC×²&WVW7FVE&÷WFU&W6WGĞ¢óà ¢ÆF—b6Æ74æÖSÒ&f÷&×VÆ#à¢Ç7ãç·B‚.Z8®ZH8îk9^X˜r"Â$FV6’Ær"—ÓÂ÷7ãàĞ¢Æ6öFSäâ‡B’Òî((+r#Ç7Wî(‰'BòL+ÓÂ÷7WãÂö6öFSàĞ¢Ç6ÖÆÃàĞ¢·B€Ğ¢.i˜.™i>8ÎXØ®k‰¾iÉòL+Ò88˜.8(8N88¾8Šj®jzŠî8şXØ®Xˆn8¾8®8(®8î88""ÀĞ¢$gFW"V6‚†ÆbÖÆ–fRL+ÒÂ†ÆböbF†R&VçBçV6ÆV’&VÖ–âöâfW&vRâ"ÀĞ¢—ĞĞ¢Â÷6ÖÆÃàĞ¢ÂöF—càĞ¢Âö6–FSàĞ¢ÂöF—càĞ Ğ¢ÆF—`Ğ¢6Æ74æÖSÒ&WVF–öâ×æVÂ Ğ¢&–ÖÆ&VÃ×·B†G·&W6WBç&VçGŞ8îZ8®ZH[ÈöÂG·&W6WE&VçDæÖWÒFV6’WVF–öæ—ĞĞ¢àĞ¢ÆF—b6Æ74æÖSÒ&WVF–öâÖ†VF–ær#àĞ¢ÆF—càĞ¢Ç7ãäDT4’$T5D”ôâò$TdU$Tä4SÂ÷7ãàĞ¢Ç7G&öæsàĞ¢·6–×VÆF–öäÖöFRÓÓÒ&6†–â Ğ¢òB‚.iÈX‰Ş8îZ8®ZH’"Â$f—'7BFV6’"Ğ¢¢B‚.Z8®ZH[Èò"Â$FV6’WVF–öâ"—ĞĞ¢Â÷7G&öæsàĞ¢ÂöF—càĞ¢ÆF—b6Æ74æÖSÒ&WVF–öâÖ†VF–ærÖ7F–öç2#àĞ¢Ç6ÖÆÃç·&W6WDÖöFTÆ&VÇÓÂ÷6ÖÆÃàĞ¢Æ'WGFöâG—SÒ&'WGFöâ"öä6Æ–6³×¶6÷”WVF–öçÓàĞ¢¶WVF–öä6÷–V@Ğ¢òB‚.8+>89N8;Î8~8î8~8ò"Â$6÷–VB"Ğ¢¢B‚.[Èş8).8+>89N8;Â"Â$6÷’WVF–öâ"—ĞĞ¢Âö'WGFöãàĞ¢ÂöF—càĞ¢ÂöF—càĞ¢ÆF—b6Æ74æÖSÒ&FV6’ÖfÆ÷r#àĞ¢ÆF—b6Æ74æÖSÒ'&V7F–öâ×7V6–W2&V7F–öâ×&VçB#àĞ¢Ç7ãç·B‚.Šj®jzŠâ"Â%&VçB"—ÓÂ÷7ãàĞ¢ÄçV6Æ–FU7–Ö&öÀĞ¢çV6Æ–FS×·&W6WBç&VçDçV6Æ–FWĞĞ¢6Æ74æÖSÒ'&V7F–öâ×7–Ö&öÂ Ğ¢ÆæwVvS×¶ÆæwVvWĞĞ¢óàĞ¢Ç6ÖÆÃç·&W6WE&VçDæÖWÓÂ÷6ÖÆÃàĞ¢ÂöF—càĞ¢ÆF—b6Æ74æÖSÒ'&V7F–öâÖ'&÷r"&–Ö†–FFVãÒ'G'VR#àĞ¢Ç7ãç·&W6WDÖöFTÆ&VÇÓÂ÷7ãàĞ¢Æ#î(i#Âö#àĞ¢ÂöF—càĞ¢ÆF—b6Æ74æÖSÒ'&V7F–öâ×7V6–W2&V7F–öâÖFVv‡FW"#àĞ¢Ç7ãç·B‚.Z‰jzŠâ"Â$FVv‡FW""—ÓÂ÷7ãàĞ¢ÄçV6Æ–FU7–Ö&öÀĞ¢çV6Æ–FS×·&W6WBæFVv‡FW$çV6Æ–FWĞĞ¢6Æ74æÖSÒ'&V7F–öâ×7–Ö&öÂ Ğ¢ÆæwVvS×¶ÆæwVvWĞĞ¢óàĞ¢Ç6ÖÆÃç·&W6WDFVv‡FW$æÖWÓÂ÷6ÖÆÃàĞ¢ÂöF—càĞ¢Æ"6Æ74æÖSÒ'&V7F–öâ×ÇW2"&–Ö†–FFVãÒ'G'VR#îûÈ³Âö#àĞ¢ÆF—b6Æ74æÖSÒ'&V7F–öâ×7V6–W2&V7F–öâÖVÖ—76–öâ#àĞ¢Ç7ãç·B‚.iKîX{®{).ZÙ"Â$VÖ—76–öâ"—ÓÂ÷7ãàĞ¢Æ6öFSç·&W6WBæVÖ—76–öå7–Ö&öÇÓÂö6öFSàĞ¢Ç6ÖÆÃç¶Æö6Æ—¦TVÖ—76–öâ‡&W6WBæVÖ—76–öâÂÆæwVvR—ÓÂ÷6ÖÆÃàĞ¢ÂöF—càĞ¢ÂöF—càĞ¢ÂöF—càĞ¢Â÷6V7F–öãàĞ Ğ¢Ç6V7F–öâ6Æ74æÖSÒ&FF×6V7F–öâ"&–ÖÆ&VÆÆVF'“Ò&ö'6W'fF–öâ×F—FÆR#àĞ¢ÆF—b6Æ74æÖSÒ'6V7F–öâÖ†VF–ær#àĞ¢ÆF—càĞ¢Ç6Æ74æÖSÒ'6V7F–öâÖçVÖ&W"#ã"òô%4U%dD”ôãÂ÷àĞ¢Æƒ"–CÒ&ö'6W'fF–öâ×F—FÆR#ç·B‚.Šk>kŠÎX
N8ynŠ¹nX
B"Â$ö'6W'fF–öâbF†V÷'’"—ÓÂöƒ#àĞ¢ÂöF—càĞ¢ÇàĞ¢·6–×VÆF–öäÖöFRÓÓÒ&6†–â Ğ¢òB€Ğ¢.X‰ŞiÉşjzŠî8Î{;¾X‰~8îjÊjë^™¨î8z{¾8>8şX›.Y8).8ynŠ¹ny¨N8®hÈ~i[k‰¾Š8jùN‹È>8~8î88""ÀĞ¢$6ö×&RF†Rg&7F–öâÆVf–ærF†R–æ—F–ÂçV6Æ–FRf÷"ÆFW"6†–â7FvW2v—F‚F†V÷&WF–6ÂW‡öæVçF–ÂFV6’â"ÀĞ¢Ğ¢¢B€Ğ¢.‹ZN8Nx+8Zéş{y®8ÎK¸®Y¹î8îŠšnŠÎ8™Ù.8NzN{y®8ÎynŠ¹nX
N8~88.8:®8+¾88>8888(¾8ş8>8¾8z+®xè~8¾8(8(¾hû®8(8îik8ÎZH8(ş8(®8î88""ÀĞ¢%ö–çG2æBF†R6öÆ–BÆ–æR6†÷rF†—2G&–Ã²F†RF6†VBÆ–æR—2F†RF†V÷&WF–6Â7W'fRâ&W6WBFò6VRæWr7Fö6†7F–2fÇV7GVF–öââ"ÀĞ¢—ĞĞ¢Â÷àĞ¢ÂöF—càĞ Ğ¢ÆF—b6Æ74æÖSÒ'7FG2Öw&–B#àĞ¢Æ'F–6ÆSàĞ¢Ç7ãç·B‚.{XÎ˜îi˜.™i2"Â$VÆ6VBF–ÖR"—ÓÂ÷7ãàĞ¢Ç7G&öæsç¶f÷&ÖDVÆ6VB†VÆ6VBÂ&W6WBÂÆæwVvR—ÓÂ÷7G&öæsàĞ¢Ç6ÖÆÃàĞ¢·6–×VÆF–öäÖöFRÓÓÒ&6†–â Ğ¢òB€Ğ¢G¶VÆ6VBçFôf—†VBƒ"—Ò9rG·&W6WBç&VçGŞ8åL+ÖÀĞ¢G¶VÆ6VBçFôf—†VBƒ"—Ò9rG·&W6WE&VçDæÖWÒL+ÖÀĞ¢Ğ¢¢G¶VÆ6VBçFôf—†VBƒ"—Ò9rL+ÖĞĞ¢Â÷6ÖÆÃàĞ¢Âö'F–6ÆSàĞ¢Æ'F–6ÆSàĞ¢Ç7ãàĞ¢·6–×VÆF–öäÖöFRÓÓÒ&6†–â Ğ¢òB‚.X‰ŞiÉşjzŠî8¾jè¾8(¾XéşZÙj‚"Â$çV6ÆV’–â–æ—F–ÂçV6Æ–FR"Ğ¢¢B‚.iÊ®Z8®ZH8îXéşZÙj‚"Â%VæFV6–VBçV6ÆV’"—ĞĞ¢Â÷7ãàĞ¢Ç7G&öæsç·&VÖ–æ–æwÓÇ6ÖÆÃâò¶FöÔ6÷VçGÓÂ÷6ÖÆÃãÂ÷7G&öæsàĞ¢Ç6ÖÆÃç·&VÖ–æ–æuW&6VçBçFôf—†VBƒ—ÒSÂ÷6ÖÆÃàĞ¢Âö'F–6ÆSàĞ¢Æ'F–6ÆSàĞ¢Ç7ãàĞ¢·6–×VÆF–öäÖöFRÓÓÒ&6†–â Ğ¢òB‚.{;¾X‰~8z{¾8>8şXéşZÙj‚"Â$çV6ÆV’Ö÷fVB–çFò6†–â"Ğ¢¢B‚.Z8®ZH8~8şXéşZÙj‚"Â$FV6–VBçV6ÆV’"—ĞĞ¢Â÷7ãàĞ¢Ç7G&öæsç¶FV6–VGÓÂ÷7G&öæsàĞ¢Ç6ÖÆÃç·B‚.ynŠ¹nKˆ®8ò"Â$W‡V7FVB"—Ò´ÖF‚ç&÷VæB†FöÔ6÷VçBÒW‡V7FVB—ÓÂ÷6ÖÆÃàĞ¢Âö'F–6ÆSàĞ¢ÂöF—càĞ Ğ¢ÆF—b6Æ74æÖSÒ&6†'B×æVÂ#àĞ¢ÆF—b6Æ74æÖSÒ&6†'BÖÖWF#àĞ¢Ç7ããÆ’6Æ74æÖSÒ&ö'6W'fVBÖÆ–æR"7G–ÆS×·²&6¶w&÷VæD6öÆ÷#¢&VçD6öÆ÷"×Òóç·B‚.Šk>kŠÎX
B"Â$ö'6W'fVB"—ÓÂ÷7ãàĞ¢Ç7ããÆ’6Æ74æÖSÒ'F†V÷'’ÖÆ–æR"7G–ÆS×·²&÷&FW%F÷6öÆ÷#¢FVv‡FW$6öÆ÷"×Òóç·B‚.ynŠ¹nX
B"Â%F†V÷'’"—ÓÂ÷7ãàĞ¢ÆF—b6Æ74æÖSÒ&6†'B×66ÆR×FövvÆR"&öÆSÒ&w&÷W"&–ÖÆ&VÃ×·B‚.8+8:89^8îyºîy¹¾8(¢"Â$6†'B66ÆR"—ÓàĞ¢Æ'WGFöàĞ¢G—SÒ&'WGFöâ Ğ¢&–×&W76VC×¶6†'E66ÆRÓÓÒ&Æ–æV"'ĞĞ¢öä6Æ–6³×²‚’Óâ6WD6†'E66ÆR‚&Æ–æV""—ĞĞ¢àĞ¢·B‚.{y®[Ú""Â$Æ–æV""—ĞĞ¢Âö'WGFöãàĞ¢Æ'WGFöàĞ¢G—SÒ&'WGFöâ Ğ¢&–×&W76VC×¶6†'E66ÆRÓÓÒ&Æör'ĞĞ¢öä6Æ–6³×²‚’Óâ6WD6†'E66ÆR‚&Æör"—ĞĞ¢àĞ¢·B‚.Zûîi["Â$Æör"—ĞĞ¢Âö'WGFöãàĞ¢ÂöF—càĞ¢Ç7G&öæsç·B‚.jÚ>ŠhşXÉnZ8®ZHxèr"Â$æ÷&ÖÆ—¦VBFV6’&FR"—Ò¶7F—f—G’çFôf—†VBƒ—ÒòL+ÓÂ÷7G&öæsà¢Æ'WGFöâG—SÒ&'WGFöâ"6Æ74æÖSÒ&W‡÷'BÖ'WGFöâ"öä6Æ–6³×¶W‡÷'D†—7F÷'”77gÓàĞ¢·B‚$55n8~KùŞZÙ‚"Â%6fR55b"—ĞĞ¢Âö'WGFöãàĞ¢ÂöF—càĞ¢Ç7fpĞ¢6Æ74æÖSÒ&FV6’Ö6†'B Ğ¢f–Wt&÷ƒ×¶G¶6†'Bçv–GF‡ÒG¶6†'Bæ†V–v‡GÖĞĞ¢&öÆSÒ&–Ör Ğ¢&–ÖÆ&VÆÆVF'“Ò&6†'B×F—FÆR6†'BÖFW67&—F–öâ Ğ¢àĞ¢ÇF—FÆR–CÒ&6†'B×F—FÆR#àĞ¢·B€Ğ¢G·6–×VÆF–öäÖöFRÓÓÒ&6†–â"ò.X‰ŞiÉşjzŠîi["¢.iÊ®Z8®ZHXéşZÙji['Ş8îi˜.™i>ZHXÉnûÈ‚G¶6†'E66ÆRÓÓÒ&Æör"ò.Zûîi["¢.{y®[Ú"'Şyºîy¹¾8(®ûÈ–ÀĞ¢G·6–×VÆF–öäÖöFRÓÓÒ&6†–â"ò$–æ—F–ÂÖçV6Æ–FR÷VÆF–öâ"¢%VæFV6–VBçV6ÆV’'Ò÷fW"F–ÖR‚G¶6†'E66ÆRÓÓÒ&Æör"ò&Æör"¢&Æ–æV"'Ò66ÆR–ÀĞ¢—ĞĞ¢Â÷F—FÆSàĞ¢ÆFW62–CÒ&6†'BÖFW67&—F–öâ#àĞ¢·B€Ğ¢G·6–×VÆF–öäÖöFRÓÓÒ&6†–â"ò6W&–W4Æ&VÂ¢&W6WBç&VçGŞ8îŠk>kŠÎX
N8hÈ~i[™j.i[8¾8(8(¾ynŠ¹nX
N8)"G¶6†'E66ÆRÓÓÒ&Æör"ò.Zûîi["¢.{y®[Ú"'Şyºîy¹¾8(®8~jùN‹È>8~8ş8+8:89^8~88&ÀĞ¢6†'B6ö×&–ærö'6W'fVBfÇVW2f÷"G·6–×VÆF–öäÖöFRÓÓÒ&6†–â"ò6W&–W4Æ&VÂ¢&W6WE&VçDæÖWÒv—F‚W‡öæVçF–ÂF†V÷'’öâG¶6†'E66ÆRÓÓÒ&Æör"ò&Æör"¢&Æ–æV"'Ò66ÆRæÀĞ¢—ĞĞ¢ÂöFW63àĞ¢¶6†'Bç•F–6·2æÖ‚‡F–6²’Óâ°Ğ¢&WGW&â€Ğ¢Ær¶W“×·F–6²æÆ&VÇÓàĞ¢ÆÆ–æPĞ¢6Æ74æÖSÒ&6†'BÖw&–BÖÆ–æR Ğ¢ƒ×¶6†'BæÆVgGĞĞ¢ƒ#×¶6†'Bçv–GF‚Ò6†'Bç&–v‡GĞĞ¢“×·F–6²ç—ĞĞ¢“#×·F–6²ç—ĞĞ¢óàĞ¢ÇFW‡BƒÒ#‚"“×·F–6²ç’²GÓç·F–6²æÆ&VÇÓÂ÷FW‡CàĞ¢ÂösàĞ¢“°Ğ¢Ò—ĞĞ¢µ³Âã#RÂãRÂãsRÂÒæÖ‚‡&F–ò’Óâ°Ğ¢6öç7B‚Ò6†'BæÆVgB²&F–ò¢6†'BçÆ÷Ev–GFƒ°Ğ¢&WGW&â€Ğ¢Ær¶W“×·&F–÷ÓàĞ¢ÆÆ–æPĞ¢6Æ74æÖSÒ&6†'B×F–6² Ğ¢ƒ×·‡ĞĞ¢ƒ#×·‡ĞĞ¢“×¶6†'Bæ†V–v‡BÒ6†'Bæ&÷GFö×ĞĞ¢“#×¶6†'Bæ†V–v‡BÒ6†'Bæ&÷GFöÒ²gĞĞ¢óàĞ¢ÇFW‡B6Æ74æÖSÒ'‚×F–6²ÖÆ&VÂ"ƒ×·‡Ò“×¶6†'Bæ†V–v‡BÒ‡ÓàĞ¢·6–×VÆF–öäÖöFRÓÓÒ&6†–â Ğ¢òf÷&ÖDçVÖ&W"†6†'BæÖ…B¢&F–ò¢&W6WBæ†ÆdÆ–fRĞ¢¢†6†'BæÖ…B¢&F–ò’çFôf—†VBƒ"—ĞĞ¢Â÷FW‡CàĞ¢ÂösàĞ¢“°Ğ¢Ò—ĞĞ¢ÆÆ–æPĞ¢6Æ74æÖSÒ&6†'BÖ†—2 Ğ¢ƒ×¶6†'BæÆVgGĞĞ¢ƒ#×¶6†'Bçv–GF‚Ò6†'Bç&–v‡GĞĞ¢“×¶6†'Bæ†V–v‡BÒ6†'Bæ&÷GFö×ĞĞ¢“#×¶6†'Bæ†V–v‡BÒ6†'Bæ&÷GFö×ĞĞ¢óàĞ¢ÇF€Ğ¢6Æ74æÖSÒ'F†V÷'’×F‚ Ğ¢C×¶6†'BçF†V÷&WF–6ÅF‡ĞĞ¢7G&ö¶S×¶FVv‡FW$6öÆ÷'ĞĞ¢óàĞ¢ÇF€Ğ¢6Æ74æÖSÒ&ö'6W'fVB×F‚ Ğ¢C×¶6†'Bæö'6W'fVEF‡ĞĞ¢7G&ö¶S×·&VçD6öÆ÷'ĞĞ¢óàĞ¢¶6†'Bæö'6W'fVEö–çG2æÖ‚‡ö–çBÂ–æFW‚’Óâ€Ğ¢Æ6—&6ÆPĞ¢6Æ74æÖSÒ&ö'6W'fVB×ö–çB Ğ¢7ƒ×·ö–çBç‡ĞĞ¢7“×·ö–çBç—ĞĞ¢f–ÆÃ×·&VçD6öÆ÷'ĞĞ¢7G&ö¶SÒ"6fc†c" Ğ¢#Ò#"ãR Ğ¢¶W“×¶G¶–æFW‡ÒÒG·ö–çBç‡ÖĞĞ¢óàĞ¢’—ĞĞ¢ÇFW‡B6Æ74æÖSÒ&†—2Ö6F–öâ"ƒ×¶6†'Bçv–GF‚Ò6†'Bç&–v‡GÒ“×¶6†'Bæ†V–v‡BÒ'ÓàĞ¢·6–×VÆF–öäÖöFRÓÓÒ&6†–â Ğ¢òB€Ğ¢{XÎ˜îi˜.™i>ûÈ‚G·&W6WBçVæ—GÒòG·&W6WBç&VçGŞYû®k©nûÈ–ÀĞ¢VÆ6VBF–ÖR‚G¶Æö6Æ—¦UVæ—B‡&W6WBçVæ—BÂÆæwVvR—ÒòG·&W6WE&VçDæÖWÒ&6—2–ÀĞ¢Ğ¢¢B‚.{XÎ˜îi˜.™i>ûÈXØ®k‰¾iÉòL+ŞûÈ’"Â$VÆ6VBF–ÖR††ÆbÖÆ—fW2L+Ò’"—ĞĞ¢Â÷FW‡CàĞ¢Â÷7fsàĞ¢ÂöF—càĞ¢Â÷6V7F–öãàĞ Ğ¢ÄçV6Æ–FTvVæVÆöwĞ¢&W6WC×·&W6WGĞĞ¢öå6VÆV7E&W6WC×·6VÆV7E&W6WGĞĞ¢ÆæwVvS×¶ÆæwVvWĞĞ¢óàĞ Ğ¢ÄFWFV7F÷$Æ ¢&W6WC×·&W6WGĞĞ¢&VÖ–æ–æs×·&VÖ–æ–æwĞĞ¢FöÔ6÷VçC×¶FöÔ6÷VçGĞĞ¢FWFV7F÷$¶W“×¶FWFV7F÷$¶W—ĞĞ¢öäFWFV7F÷$6†ævS×·6WDFWFV7F÷$¶W—ĞĞ¢6†–VÆD¶W“×·6†–VÆD¶W—ĞĞ¢öå6†–VÆD6†ævS×·6WE6†–VÆD¶W—ĞĞ¢F—7Fæ6S×¶FWFV7F÷$F—7Fæ6WĞĞ¢öäF—7Fæ6T6†ævS×·6WDFWFV7F÷$F—7Fæ6WĞĞ¢F†–6¶æW73×·6†–VÆEF†–6¶æW77ĞĞ¢öåF†–6¶æW746†ævS×·6WE6†–VÆEF†–6¶æW77ĞĞ¢ÖV7W&VÖVçE6V6öæG3×¶ÖV7W&VÖVçE6V6öæG7ĞĞ¢öäÖV7W&VÖVçE6V6öæG46†ævS×·6WDÖV7W&VÖVçE6V6öæG7ĞĞ¢ÆæwVvS×¶ÆæwVvWĞ¢óà ¢ÄÖöFVÄF—66Æ÷7W&RÆ#×¶FV6”Æ'ÒÆæwVvS×¶ÆæwVvWÒóà¢Å6fWG”æ÷FRÆ#×¶FV6”Æ'ÒÆæwVvS×¶ÆæwVvWÒóà ¢Æfö÷FW#à¢ÆF—b6Æ74æÖSÒ&fö÷FW"Ö'&æB#àĞ¢Ç7G&öæså„TäôÔTäÂ÷7G&öæsà¢Ç7ãädõTäDD”ôâcòÔôåDR4$ÄòDT4’Ä#Â÷7ãà¢ÂöF—càĞ¢Ææb&–ÖÆ&VÃ×·B‚%6‡–Öö†î889~8:Ş8+8*~8*ş8888î8:®8;>8*ò"Â$Æ–æ·2Fò6‡–Öö†âæBF†—2&ö¦V7B"—ÓàĞ¢Æ‡&VcÒ&‡GG3¢ò÷‚æ6öÒõ6‡–Öö†â"F&vWCÒ%ö&Ææ²"&VÃÒ&æö÷VæW"æ÷&VfW'&W"#àĞ¢6‡–Öö†âöâ‚(ipĞ¢ÂöàĞ¢Æ‡&VcÒ&‡GG3¢òöv—F‡V"æ6öÒ÷6‡–Öö†ã“’"F&vWCÒ%ö&Ææ²"&VÃÒ&æö÷VæW"æ÷&VfW'&W"#àĞ¢v—D‡V"&öf–ÆR(ipĞ¢ÂöàĞ¢ÆĞ¢‡&VcÒ&‡GG3¢ò÷6‡–Öö†ã“’æv—F‡V"æ–ò÷÷'FföÆ–òò Ğ¢F&vWCÒ%ö&Ææ² Ğ¢&VÃÒ&æö÷VæW"æ÷&VfW'&W" Ğ¢àĞ¢6‡–Öö†â÷'FföÆ–ò(ipĞ¢ÂöàĞ¢ÆĞ¢6Æ74æÖSÒ'&W÷6—F÷'’ÖÆ–æ² Ğ¢‡&VcÒ&‡GG3¢òöv—F‡V"æ6öÒ÷6‡–Öö†ã“’öçV6ÆV"ÖFV6’ÖÆ" Ğ¢F&vWCÒ%ö&Ææ² Ğ¢&VÃÒ&æö÷VæW"æ÷&VfW'&W" Ğ¢àĞ¢f–Wr6÷W&6R(ipĞ¢ÂöàĞ¢ÂöæcàĞ¢Çç·B‚,*’##b6‡–Öö†î8.8+Ş89^888*n8*~8*#¢Ô•BòjzŠî88~8;Î8+ó¢XŠ^iÚK»b"Â,*’##b6‡–Öö†ââ6ögGv&S¢Ô•BòçV6ÆV"FF¢6W&FRFW&×2â"—ÓÂ÷à¢Âöfö÷FW#àĞ¢ÂöÖ–ãàĞ¢ÂóàĞ¢“°Ğ§ĞĞ