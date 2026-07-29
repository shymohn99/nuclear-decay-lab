"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

type DecayMode = "alpha" | "beta" | "gamma";
type DecaySeries = "independent" | "uranium-238" | "thorium-232" | "uranium-235";
type SimulationMode = "single" | "chain";
type CatalogView = "table" | "map";

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
  mode?: DecayMode;
  stable?: boolean;
};

type MapViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

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
          modeLabel: "α壊変",
          emission: "ヘリウム原子核",
          emissionSymbol: "⁴₂He",
        }
      : preset.mode === "beta"
        ? {
            modeLabel: "β⁻壊変",
            emission: "電子・反電子ニュートリノ",
            emissionSymbol: "e⁻ + ν̄ₑ",
          }
        : {
            modeLabel: "γ放出",
            emission: "γ線",
            emissionSymbol: "γ",
          };
  const emissionSymbol = preset.emissionSymbol ?? defaults.emissionSymbol;

  return {
    ...preset,
    modeLabel: preset.modeLabel ?? defaults.modeLabel,
    emission: preset.emission ?? defaults.emission,
    emissionSymbol,
    equation: `${formatNuclideText(preset.parentNuclide)} → ${formatNuclideText(
      preset.daughterNuclide,
    )} + ${emissionSymbol}`,
  };
}

const SERIES_OPTIONS: Array<{
  key: DecaySeries;
  label: string;
  caption: string;
}> = [
  { key: "independent", label: "単独核種", caption: "代表的な人工・天然核種" },
  { key: "uranium-238", label: "U-238系列", caption: "ウラン系列" },
  { key: "thorium-232", label: "Th-232系列", caption: "トリウム系列" },
  { key: "uranium-235", label: "U-235系列", caption: "アクチニウム系列" },
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

const PRESETS: IsotopePreset[] = [
  createPreset({
    key: "iodine-131",
    series: "independent",
    parent: "ヨウ素131",
    daughter: "キセノン131",
    parentNuclide: { massNumber: 131, protonNumber: 53, element: "I" },
    daughterNuclide: { massNumber: 131, protonNumber: 54, element: "Xe" },
    halfLife: 8.02,
    unit: "日",
    mode: "beta",
    parentRgb: "221, 80, 78",
    daughterRgb: "49, 163, 177",
  }),
  createPreset({
    key: "carbon-14",
    series: "independent",
    parent: "炭素14",
    daughter: "窒素14",
    parentNuclide: { massNumber: 14, protonNumber: 6, element: "C" },
    daughterNuclide: { massNumber: 14, protonNumber: 7, element: "N" },
    halfLife: 5730,
    unit: "年",
    mode: "beta",
    parentRgb: "205, 120, 38",
    daughterRgb: "39, 145, 102",
  }),
  createPreset({
    key: "cobalt-60",
    series: "independent",
    parent: "コバルト60",
    daughter: "ニッケル60",
    parentNuclide: { massNumber: 60, protonNumber: 27, element: "Co" },
    daughterNuclide: { massNumber: 60, protonNumber: 28, element: "Ni" },
    halfLife: 5.27,
    unit: "年",
    mode: "gamma",
    modeLabel: "β⁻壊変 + γ放出",
    emission: "電子・反電子ニュートリノ・γ線",
    emissionSymbol: "e⁻ + ν̄ₑ + γ",
    parentRgb: "132, 85, 183",
    daughterRgb: "43, 132, 185",
  }),
  createPreset({
    key: "uranium-238",
    series: "uranium-238",
    parent: "ウラン238",
    daughter: "トリウム234",
    parentNuclide: { massNumber: 238, protonNumber: 92, element: "U" },
    daughterNuclide: { massNumber: 234, protonNumber: 90, element: "Th" },
    halfLife: 4.468e9,
    unit: "年",
    mode: "alpha",
    parentRgb: "78, 103, 153",
    daughterRgb: "174, 108, 53",
  }),
  createPreset({
    key: "thorium-234",
    series: "uranium-238",
    parent: "トリウム234",
    daughter: "プロトアクチニウム234m",
    parentNuclide: { massNumber: 234, protonNumber: 90, element: "Th" },
    daughterNuclide: { massNumber: 234, protonNumber: 91, element: "Paᵐ" },
    halfLife: 24.1,
    unit: "日",
    mode: "beta",
    parentRgb: "78, 103, 153",
    daughterRgb: "174, 108, 53",
  }),
  createPreset({
    key: "uranium-234",
    series: "uranium-238",
    parent: "ウラン234",
    daughter: "トリウム230",
    parentNuclide: { massNumber: 234, protonNumber: 92, element: "U" },
    daughterNuclide: { massNumber: 230, protonNumber: 90, element: "Th" },
    halfLife: 245500,
    unit: "年",
    mode: "alpha",
    parentRgb: "78, 103, 153",
    daughterRgb: "174, 108, 53",
  }),
  createPreset({
    key: "radium-226",
    series: "uranium-238",
    parent: "ラジウム226",
    daughter: "ラドン222",
    parentNuclide: { massNumber: 226, protonNumber: 88, element: "Ra" },
    daughterNuclide: { massNumber: 222, protonNumber: 86, element: "Rn" },
    halfLife: 1600,
    unit: "年",
    mode: "alpha",
    parentRgb: "78, 103, 153",
    daughterRgb: "174, 108, 53",
  }),
  createPreset({
    key: "radon-222",
    series: "uranium-238",
    parent: "ラドン222",
    daughter: "ポロニウム218",
    parentNuclide: { massNumber: 222, protonNumber: 86, element: "Rn" },
    daughterNuclide: { massNumber: 218, protonNumber: 84, element: "Po" },
    halfLife: 3.8222,
    unit: "日",
    mode: "alpha",
    parentRgb: "78, 103, 153",
    daughterRgb: "174, 108, 53",
  }),
  createPreset({
    key: "polonium-210",
    series: "uranium-238",
    parent: "ポロニウム210",
    daughter: "鉛206",
    parentNuclide: { massNumber: 210, protonNumber: 84, element: "Po" },
    daughterNuclide: { massNumber: 206, protonNumber: 82, element: "Pb" },
    halfLife: 138.4,
    unit: "日",
    mode: "alpha",
    parentRgb: "194, 66, 60",
    daughterRgb: "38, 119, 173",
  }),
  createPreset({
    key: "thorium-232",
    series: "thorium-232",
    parent: "トリウム232",
    daughter: "ラジウム228",
    parentNuclide: { massNumber: 232, protonNumber: 90, element: "Th" },
    daughterNuclide: { massNumber: 228, protonNumber: 88, element: "Ra" },
    halfLife: 1.405e10,
    unit: "年",
    mode: "alpha",
    parentRgb: "94, 111, 75",
    daughterRgb: "177, 104, 72",
  }),
  createPreset({
    key: "radium-228",
    series: "thorium-232",
    parent: "ラジウム228",
    daughter: "アクチニウム228",
    parentNuclide: { massNumber: 228, protonNumber: 88, element: "Ra" },
    daughterNuclide: { massNumber: 228, protonNumber: 89, element: "Ac" },
    halfLife: 5.75,
    unit: "年",
    mode: "beta",
    parentRgb: "94, 111, 75",
    daughterRgb: "177, 104, 72",
  }),
  createPreset({
    key: "actinium-228",
    series: "thorium-232",
    parent: "アクチニウム228",
    daughter: "トリウム228",
    parentNuclide: { massNumber: 228, protonNumber: 89, element: "Ac" },
    daughterNuclide: { massNumber: 228, protonNumber: 90, element: "Th" },
    halfLife: 6.15,
    unit: "時間",
    mode: "beta",
    parentRgb: "94, 111, 75",
    daughterRgb: "177, 104, 72",
  }),
  createPreset({
    key: "thorium-228",
    series: "thorium-232",
    parent: "トリウム228",
    daughter: "ラジウム224",
    parentNuclide: { massNumber: 228, protonNumber: 90, element: "Th" },
    daughterNuclide: { massNumber: 224, protonNumber: 88, element: "Ra" },
    halfLife: 1.9125,
    unit: "年",
    mode: "alpha",
    parentRgb: "94, 111, 75",
    daughterRgb: "177, 104, 72",
  }),
  createPreset({
    key: "radium-224",
    series: "thorium-232",
    parent: "ラジウム224",
    daughter: "ラドン220",
    parentNuclide: { massNumber: 224, protonNumber: 88, element: "Ra" },
    daughterNuclide: { massNumber: 220, protonNumber: 86, element: "Rn" },
    halfLife: 3.66,
    unit: "日",
    mode: "alpha",
    parentRgb: "94, 111, 75",
    daughterRgb: "177, 104, 72",
  }),
  createPreset({
    key: "radon-220",
    series: "thorium-232",
    parent: "ラドン220",
    daughter: "ポロニウム216",
    parentNuclide: { massNumber: 220, protonNumber: 86, element: "Rn" },
    daughterNuclide: { massNumber: 216, protonNumber: 84, element: "Po" },
    halfLife: 55.6,
    unit: "秒",
    mode: "alpha",
    parentRgb: "94, 111, 75",
    daughterRgb: "177, 104, 72",
  }),
  createPreset({
    key: "uranium-235",
    series: "uranium-235",
    parent: "ウラン235",
    daughter: "トリウム231",
    parentNuclide: { massNumber: 235, protonNumber: 92, element: "U" },
    daughterNuclide: { massNumber: 231, protonNumber: 90, element: "Th" },
    halfLife: 7.038e8,
    unit: "年",
    mode: "alpha",
    parentRgb: "117, 82, 135",
    daughterRgb: "184, 112, 49",
  }),
  createPreset({
    key: "thorium-231",
    series: "uranium-235",
    parent: "トリウム231",
    daughter: "プロトアクチニウム231",
    parentNuclide: { massNumber: 231, protonNumber: 90, element: "Th" },
    daughterNuclide: { massNumber: 231, protonNumber: 91, element: "Pa" },
    halfLife: 25.52,
    unit: "時間",
    mode: "beta",
    parentRgb: "117, 82, 135",
    daughterRgb: "184, 112, 49",
  }),
  createPreset({
    key: "protactinium-231",
    series: "uranium-235",
    parent: "プロトアクチニウム231",
    daughter: "アクチニウム227",
    parentNuclide: { massNumber: 231, protonNumber: 91, element: "Pa" },
    daughterNuclide: { massNumber: 227, protonNumber: 89, element: "Ac" },
    halfLife: 32760,
    unit: "年",
    mode: "alpha",
    parentRgb: "117, 82, 135",
    daughterRgb: "184, 112, 49",
  }),
  createPreset({
    key: "actinium-227",
    series: "uranium-235",
    parent: "アクチニウム227",
    daughter: "トリウム227",
    parentNuclide: { massNumber: 227, protonNumber: 89, element: "Ac" },
    daughterNuclide: { massNumber: 227, protonNumber: 90, element: "Th" },
    halfLife: 21.772,
    unit: "年",
    mode: "beta",
    modeLabel: "β⁻壊変（98.62%）",
    parentRgb: "117, 82, 135",
    daughterRgb: "184, 112, 49",
  }),
  createPreset({
    key: "thorium-227",
    series: "uranium-235",
    parent: "トリウム227",
    daughter: "ラジウム223",
    parentNuclide: { massNumber: 227, protonNumber: 90, element: "Th" },
    daughterNuclide: { massNumber: 223, protonNumber: 88, element: "Ra" },
    halfLife: 18.68,
    unit: "日",
    mode: "alpha",
    parentRgb: "117, 82, 135",
    daughterRgb: "184, 112, 49",
  }),
  createPreset({
    key: "radium-223",
    series: "uranium-235",
    parent: "ラジウム223",
    daughter: "ラドン219",
    parentNuclide: { massNumber: 223, protonNumber: 88, element: "Ra" },
    daughterNuclide: { massNumber: 219, protonNumber: 86, element: "Rn" },
    halfLife: 11.4366,
    unit: "日",
    mode: "alpha",
    parentRgb: "117, 82, 135",
    daughterRgb: "184, 112, 49",
  }),
  createPreset({
    key: "radon-219",
    series: "uranium-235",
    parent: "ラドン219",
    daughter: "ポロニウム215",
    parentNuclide: { massNumber: 219, protonNumber: 86, element: "Rn" },
    daughterNuclide: { massNumber: 215, protonNumber: 84, element: "Po" },
    halfLife: 3.96,
    unit: "秒",
    mode: "alpha",
    parentRgb: "117, 82, 135",
    daughterRgb: "184, 112, 49",
  }),
];

function getChainStages(series: DecaySeries): ChainStage[] {
  if (series === "independent") return [];

  const presets = PRESETS.filter((item) => item.series === series);
  const stages: ChainStage[] = presets.map((item) => ({
    key: item.key,
    name: item.parent,
    nuclide: item.parentNuclide,
    halfLifeLabel: `${formatNumber(item.halfLife)} ${item.unit}`,
    mode: item.mode,
  }));
  const terminal = presets.at(-1);

  if (terminal) {
    stages.push({
      key: `${terminal.key}-stable`,
      name: terminal.daughter,
      nuclide: terminal.daughterNuclide,
      halfLifeLabel: "安定核種",
      stable: true,
    });
  }

  return stages;
}

function getChainStageColor(index: number, total: number) {
  if (index === total - 1) return "#d8d4c9";
  return CHAIN_STAGE_COLORS[index % CHAIN_STAGE_COLORS.length];
}

const SIMULATED_HALF_LIVES_PER_SECOND = 0.18;
const HIS…10611 tokens truncated….map((stage, index) => (
                    <div className="chain-stage-group" key={stage.key}>
                      <article
                        className={`chain-stage ${stage.stable ? "is-stable" : ""}`}
                        aria-label={`${index + 1}段階目、${stage.name}、半減期${stage.halfLifeLabel}、現在${chainStageCounts[index] ?? 0}個`}
                        style={
                          {
                            "--stage-color": getChainStageColor(
                              index,
                              chainStages.length,
                            ),
                          } as React.CSSProperties
                        }
                      >
                        <span className="chain-stage-index">
                          STEP {String(index + 1).padStart(2, "0")}
                        </span>
                        <NuclideSymbol
                          nuclide={stage.nuclide}
                          className="nuclide-symbol-chain"
                        />
                        <div className="chain-stage-copy">
                          <strong>{stage.name}</strong>
                          <small>
                            <span>{stage.stable ? "状態" : "半減期"}</span>
                            {stage.halfLifeLabel}
                          </small>
                        </div>
                        <output>
                          <b>{chainStageCounts[index] ?? 0}</b>
                          <span>個</span>
                        </output>
                      </article>
                      {index < chainStages.length - 1 && (
                        <span className="chain-arrow" aria-hidden="true">
                          <span>
                            {stage.mode === "beta" ? "β⁻" : stage.mode === "gamma" ? "γ" : "α"}
                          </span>
                          <b>→</b>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p>
                  <span>観察メモ</span>
                  主要核種のみを表示しています。横にスクロールして連鎖を追えます。
                  半減期の差が大きいため、各段階の時間尺度は観察用に正規化しています。
                </p>
              </div>
            )}

            <div className="particle-field">
              <svg
                className="particle-svg"
                viewBox="0 0 1000 520"
                preserveAspectRatio="none"
                onPointerDown={handleDetectorPulse}
                role="img"
                aria-label={
                  simulationMode === "chain"
                    ? `${seriesLabel}の原子核${atomCount}個が主要核種を順に壊変する連鎖シミュレーション`
                    : `${preset.parent}の原子核${atomCount}個が確率的に壊変し、${preset.daughter}へ変わる粒子シミュレーション`
                }
              >
                <defs>
                  <pattern id="field-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" className="field-grid-line" />
                  </pattern>
                </defs>
                <rect width="1000" height="520" className="field-background" />
                <rect width="1000" height="520" fill="url(#field-grid)" />
                <ellipse cx="500" cy="260" rx="390" ry="196" className="field-orbit" />
                {particles.map((particle) => {
                  const particleColor =
                    simulationMode === "chain"
                      ? getChainStageColor(
                          particle.chainStage,
                          chainStages.length,
                        )
                      : particle.phase === "parent"
                        ? parentColor
                        : daughterColor;
                  return (
                    <g
                      key={particle.id}
                      ref={(node) => {
                        particleNodeRefs.current[particle.id] = node;
                      }}
                      className={`particle particle-${particle.phase} ${
                        simulationMode === "chain" ? "particle-chain" : ""
                      }`}
                      transform={`translate(${particle.x * 1000} ${particle.y * 520})`}
                    >
                      <circle
                        className="particle-halo"
                        fill={particleColor}
                        r={particle.radius * 3.4}
                      />
                      <circle
                        className="particle-core"
                        fill={particleColor}
                        stroke="#fffdf4"
                        strokeOpacity="0.62"
                        strokeWidth="1.15"
                        r={
                          particle.radius *
                          (1.22 + Math.sin(particle.pulse) * 0.08)
                        }
                      />
                    </g>
                  );
                })}
                {bursts.map((burst) => {
                  const distance = (1 - burst.life) * 88;
                  const x1 = burst.x * 1000;
                  const y1 = burst.y * 520;
                  const x2 = x1 + Math.cos(burst.angle) * (distance + 24);
                  const y2 = y1 + Math.sin(burst.angle) * (distance + 24);
                  return burst.kind === "gamma" ? (
                    <g key={burst.id} className="burst-gamma" opacity={burst.life}>
                      <circle cx={x1} cy={y1} r={18 + distance} />
                      <circle cx={x1} cy={y1} r={34 + distance * 1.2} />
                    </g>
                  ) : (
                    <line
                      key={burst.id}
                      className={`burst-line burst-${burst.kind}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      opacity={burst.life}
                    />
                  );
                })}
              </svg>
              <div className="field-readout" aria-hidden="true">
                <NuclideSymbol nuclide={preset.parentNuclide} className="nuclide-symbol-field" />
                <small>
                  {simulationMode === "chain"
                    ? `${seriesLabel}・${chainStages.length}段階`
                    : preset.modeLabel}
                </small>
              </div>
              <span className="field-hint">画面を押すと検出パルスを表示</span>
            </div>
          </div>

          <aside className="control-panel" aria-label="シミュレーション設定">
            <div className="control-heading">
              <span>実験条件</span>
              <strong>
                {simulationMode === "chain" ? seriesLabel : preset.parent}
              </strong>
              <small>
                {simulationMode === "chain"
                  ? `主要核種 ${chainStages.length}段階`
                  : `半減期 ${preset.halfLife} ${preset.unit}`}
              </small>
            </div>

            <label className="control-field">
              <span>原子核の数 <output>{atomCount}</output></span>
              <input
                type="range"
                min="60"
                max="240"
                step="20"
                value={atomCount}
                style={{ accentColor: parentColor }}
                onChange={(event) => setAtomCount(Number(event.target.value))}
              />
            </label>

            <label className="control-field">
              <span>時間倍率 <output>{speed.toFixed(1)}×</output></span>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={speed}
                style={{ accentColor: parentColor }}
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
            </label>

            {simulationMode === "chain" ? (
              <div className="time-rate chain-time-rate" aria-live="polite">
                <span>CHAIN TIME SCALE</span>
                <strong>段階ごとに時間尺度を正規化</strong>
                <p>
                  半減期が秒未満から億年単位まで異なるため、すべての段階を観察できる速度に揃えています。
                </p>
              </div>
            ) : (
              <div className="time-rate" aria-live="polite">
                <span>TIME SCALE / 現実時間との対応</span>
                <div>
                  <small>現実の</small>
                  <strong>1秒</strong>
                  <b aria-hidden="true">→</b>
                  <small>シミュレーション内</small>
                  <strong>約{simulationRate}</strong>
                </div>
                <p>
                  現実の1秒ごとに、現在の核種の時間が約{simulationRate}進みます。
                </p>
              </div>
            )}

            <div className="control-actions">
              <button
                type="button"
                className="primary-action"
                onClick={() => setPaused((value) => !value)}
              >
                {paused ? "▶ 再開" : "Ⅱ 一時停止"}
              </button>
              <button type="button" onClick={resetSimulation}>↻ リセット</button>
            </div>

            <div className="formula">
              <span>壊変の法則</span>
              <code>N(t) = N₀ · 2<sup>−t / T½</sup></code>
              <small>時間が半減期 T½ だけ進むごとに、親核種は半分になります。</small>
            </div>
          </aside>
        </div>
      </section>

      <section className="data-section" aria-labelledby="observation-title">
        <div className="section-heading">
          <div>
            <p className="section-number">02 / OBSERVATION</p>
            <h2 id="observation-title">観測値と理論値</h2>
          </div>
          <p>
            {simulationMode === "chain"
              ? "初期核種が系列の次段階へ移った割合を、理論的な指数減衰と比較します。"
              : "赤い点と実線が今回の試行、青い破線が理論値です。リセットするたびに、確率による揺らぎ方が変わります。"}
          </p>
        </div>

        <div className="stats-grid">
          <article>
            <span>{simulationMode === "chain" ? "規格化時間" : "経過時間"}</span>
            <strong>
              {simulationMode === "chain"
                ? `${elapsed.toFixed(2)} × 段階T½`
                : formatElapsed(elapsed, preset)}
            </strong>
            <small>
              {simulationMode === "chain"
                ? "各段階の半減期を同じ長さで表示"
                : `${elapsed.toFixed(2)} × T½`}
            </small>
          </article>
          <article>
            <span>
              {simulationMode === "chain" ? "初期核種に残る原子核" : "未壊変の原子核"}
            </span>
            <strong>{remaining}<small> / {atomCount}</small></strong>
            <small>{remainingPercent.toFixed(1)}%</small>
          </article>
          <article>
            <span>
              {simulationMode === "chain" ? "系列へ移った原子核" : "壊変した原子核"}
            </span>
            <strong>{decayed}</strong>
            <small>理論上は {Math.round(atomCount - expected)}</small>
          </article>
        </div>

        <div className="chart-panel">
          <div className="chart-meta">
            <span><i className="observed-line" style={{ backgroundColor: parentColor }} />観測値</span>
            <span><i className="theory-line" style={{ borderTopColor: daughterColor }} />理論値</span>
            <div className="chart-scale-toggle" role="group" aria-label="グラフの目盛り">
              <button
                type="button"
                aria-pressed={chartScale === "linear"}
                onClick={() => setChartScale("linear")}
              >
                線形
              </button>
              <button
                type="button"
                aria-pressed={chartScale === "log"}
                onClick={() => setChartScale("log")}
              >
                対数
              </button>
            </div>
            <strong>推定活動度 {activity.toFixed(1)} / T½</strong>
            <button type="button" className="export-button" onClick={exportHistoryCsv}>
              CSVで保存
            </button>
          </div>
          <svg
            className="decay-chart"
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            role="img"
            aria-labelledby="chart-title chart-description"
          >
            <title id="chart-title">
              {simulationMode === "chain" ? "初期核種数" : "未壊変原子核数"}
              の時間変化（{chartScale === "log" ? "対数" : "線形"}目盛り）
            </title>
            <desc id="chart-description">
              {simulationMode === "chain" ? seriesLabel : preset.parent}
              の観測値と指数関数による理論値を
              {chartScale === "log" ? "対数" : "線形"}目盛りで比較したグラフです。
            </desc>
            {chart.yTicks.map((tick) => {
              return (
                <g key={tick.label}>
                  <line
                    className="chart-grid-line"
                    x1={chart.left}
                    x2={chart.width - chart.right}
                    y1={tick.y}
                    y2={tick.y}
                  />
                  <text x="8" y={tick.y + 4}>{tick.label}</text>
                </g>
              );
            })}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const x = chart.left + ratio * chart.plotWidth;
              return (
                <g key={ratio}>
                  <line
                    className="chart-tick"
                    x1={x}
                    x2={x}
                    y1={chart.height - chart.bottom}
                    y2={chart.height - chart.bottom + 6}
                  />
                  <text className="x-tick-label" x={x} y={chart.height - 18}>
                    {(chart.maxT * ratio).toFixed(2)}
                  </text>
                </g>
              );
            })}
            <line
              className="chart-axis"
              x1={chart.left}
              x2={chart.width - chart.right}
              y1={chart.height - chart.bottom}
              y2={chart.height - chart.bottom}
            />
            <path
              className="theory-path"
              d={chart.theoreticalPath}
              stroke={daughterColor}
            />
            <path
              className="observed-path"
              d={chart.observedPath}
              stroke={parentColor}
            />
            {chart.observedPoints.map((point, index) => (
              <circle
                className="observed-point"
                cx={point.x}
                cy={point.y}
                fill={parentColor}
                stroke="#faf8f2"
                r="3.2"
                key={`${index}-${point.x}`}
              />
            ))}
            <text className="axis-caption" x={chart.width - chart.right} y={chart.height - 2}>
              経過時間（半減期 T½）
            </text>
          </svg>
        </div>
      </section>

      <footer>
        <span>NUCLEAR DECAY LAB / 2026</span>
        <nav aria-label="ShymohnのSNS">
          <a href="https://x.com/Shymohn" target="_blank" rel="noopener noreferrer">X</a>
          <a href="https://github.com/shymohn99" target="_blank" rel="noopener noreferrer">GitHub</a>
        </nav>
        <p>2026 @Shymohn all rights reserved.</p>
      </footer>
    </main>
  );
}
