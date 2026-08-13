export type Language = "ja" | "en";

export type LabId = "decay" | "atlas" | "detector" | "pulse";

export type LocalizedText = {
  ja: string;
  en: string;
};

export type DatasetReference = {
  id: string;
  version: string;
  role: LocalizedText;
  source: string;
  license: string;
};

export type LabParameter = {
  id: string;
  label: LocalizedText;
  unit: LocalizedText;
  range?: { min: number; max: number; step: number };
};

export type LabObservation = {
  id: string;
  label: LocalizedText;
  unit: LocalizedText;
};

export type LabManifest = {
  id: LabId;
  slug: string;
  labNumber: string;
  collection: LocalizedText;
  discipline: LocalizedText;
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  status: "foundation" | "planned";
  datasets: readonly DatasetReference[];
  assumptions: readonly LocalizedText[];
  constraints: readonly LocalizedText[];
  languages: readonly Language[];
  parameters: readonly LabParameter[];
  observations: readonly LabObservation[];
  citations: readonly string[];
  licenses: readonly string[];
  safety: readonly LocalizedText[];
};

const LOCAL_DATASET: DatasetReference = {
  id: "phenomena-educational-models",
  version: "1.0.0",
  role: {
    ja: "端末内の教育用モデルと代表値",
    en: "Local educational models and representative values",
  },
  source: "Phenomena Foundation v1 model notes",
  license: "MIT (software); model values are documented approximations",
};

const NUCLEAR_DATASET: DatasetReference = {
  id: "icrp-107-ame2020-nubase2020",
  version: "radioactivedecay 0.6.1 catalog",
  role: {
    ja: "核種マップと主壊変分岐",
    en: "Nuclide map and principal decay branches",
  },
  source: "Bundled generated catalog; see public/data/LICENSE.ICRP-07.txt",
  license: "See bundled ICRP-07 terms and repository license",
};

const COMMON_SAFETY: readonly LocalizedText[] = [
  {
    ja: "教育用の簡略モデルです。放射線安全、医療、線量評価、規制適合、研究級解析には使用しないでください。",
    en: "This is a simplified educational model. Do not use it for radiation safety, medical, dosimetry, regulatory, or research-grade decisions.",
  },
];

const COMMON_CONSTRAINTS: readonly LocalizedText[] = [
  {
    ja: "実在の線源・検出器・遮蔽体を再現するものではありません。",
    en: "The model does not reproduce a particular real source, detector, or shielding assembly.",
  },
];

export const LAB_REGISTRY = [
  {
    id: "decay",
    slug: "decay",
    labNumber: "01",
    collection: { ja: "Nuclear Collection", en: "Nuclear Collection" },
    discipline: { ja: "核物理 / 確率過程", en: "Nuclear physics / stochastic processes" },
    title: { ja: "Decay Lab", en: "Decay Lab" },
    summary: { ja: "一つずつの壊変から指数曲線へ", en: "From individual decays to the exponential curve" },
    description: {
      ja: "モンテカルロ壊変、理論曲線、放射系列、速度操作を同じ画面で観測します。",
      en: "Observe Monte Carlo decay, theory, decay chains, and time-scale controls in one experiment.",
    },
    status: "foundation",
    datasets: [LOCAL_DATASET, NUCLEAR_DATASET],
    assumptions: [
      { ja: "各核種は一定の半減期を持ち、壊変事象は独立です。", en: "Each nuclide has a constant half-life and decay events are independent." },
      { ja: "観測用の系列モードでは時間比を意図的に圧縮します。", en: "Observation mode intentionally compresses chain time ratios." },
    ],
    constraints: [
      { ja: "表示上の粒子数は最大500個です。", en: "The visible particle population is capped at 500." },
      ...COMMON_CONSTRAINTS,
    ],
    languages: ["ja", "en"],
    parameters: [
      { id: "population", label: { ja: "初期原子核数", en: "Initial nuclei" }, unit: { ja: "個", en: "nuclei" }, range: { min: 20, max: 500, step: 10 } },
      { id: "speed", label: { ja: "時間倍率", en: "Time multiplier" }, unit: { ja: "×", en: "×" } },
    ],
    observations: [
      { id: "remaining", label: { ja: "未壊変原子核", en: "Undecayed nuclei" }, unit: { ja: "個", en: "nuclei" } },
      { id: "elapsed", label: { ja: "経過時間", en: "Elapsed time" }, unit: { ja: "半減期", en: "half-lives" } },
    ],
    citations: ["ICRP Publication 107", "AME2020 / Nubase2020-derived catalog"],
    licenses: ["Repository MIT license", "Bundled data terms in public/data/LICENSE.ICRP-07.txt"],
    safety: COMMON_SAFETY,
  },
  {
    id: "atlas",
    slug: "atlas",
    labNumber: "02",
    collection: { ja: "Nuclear Collection", en: "Nuclear Collection" },
    discipline: { ja: "核種データ / 系譜", en: "Nuclide data / genealogy" },
    title: { ja: "Nuclide Atlas", en: "Nuclide Atlas" },
    summary: { ja: "核種を地図として読む", en: "Read nuclides as a map" },
    description: {
      ja: "陽子数・中性子数の地図から核種を選び、主壊変と前後の系譜を辿ります。",
      en: "Select a nuclide on the proton–neutron map and trace its principal decay genealogy.",
    },
    status: "foundation",
    datasets: [NUCLEAR_DATASET],
    assumptions: [
      { ja: "各レコードは主壊変分岐を一つだけ表示します。", en: "Each record displays one principal decay branch." },
      { ja: "安定核種は壊変レコードの末端として扱います。", en: "Stable nuclides are treated as terminal nodes." },
    ],
    constraints: COMMON_CONSTRAINTS,
    languages: ["ja", "en"],
    parameters: [
      { id: "selectedNuclide", label: { ja: "選択核種", en: "Selected nuclide" }, unit: { ja: "核種", en: "nuclide" } },
      { id: "mapZoom", label: { ja: "地図倍率", en: "Map zoom" }, unit: { ja: "×", en: "×" } },
    ],
    observations: [
      { id: "halfLife", label: { ja: "半減期", en: "Half-life" }, unit: { ja: "表示単位", en: "display unit" } },
      { id: "branch", label: { ja: "主壊変", en: "Principal decay" }, unit: { ja: "分岐", en: "branch" } },
    ],
    citations: ["NNDC NuDat 3", "radioactivedecay 0.6.1 default catalog"],
    licenses: ["Bundled ICRP-07 terms; see public/data/LICENSE.ICRP-07.txt"],
    safety: COMMON_SAFETY,
  },
  {
    id: "detector",
    slug: "detector",
    labNumber: "03",
    collection: { ja: "Nuclear Collection", en: "Nuclear Collection" },
    discipline: { ja: "放射線計測 / 簡略モデル", en: "Radiation detection / simplified model" },
    title: { ja: "Detector Lab", en: "Detector Lab" },
    summary: { ja: "同じ信号を、違う検出器で読む", en: "Read the same signal with different detectors" },
    description: {
      ja: "GM、シンチレーション、半導体検出器と距離・遮蔽・測定時間を比較します。",
      en: "Compare GM, scintillation, and semiconductor responses while changing distance, shielding, and time.",
    },
    status: "foundation",
    datasets: [LOCAL_DATASET, NUCLEAR_DATASET],
    assumptions: [
      { ja: "計数率は距離の逆二乗、検出効率、遮蔽透過率の積で近似します。", en: "Count rate is approximated by inverse-square distance, efficiency, and transmission." },
      { ja: "統計誤差はポアソン計数の近似です。", en: "Statistical error uses a Poisson-count approximation." },
    ],
    constraints: [
      { ja: "検出器のエネルギー応答、死時間、幾何学を詳細には扱いません。", en: "Energy response, dead time, and detailed geometry are not modeled." },
      ...COMMON_CONSTRAINTS,
    ],
    languages: ["ja", "en"],
    parameters: [
      { id: "detector", label: { ja: "検出器", en: "Detector" }, unit: { ja: "種類", en: "type" } },
      { id: "distance", label: { ja: "距離", en: "Distance" }, unit: { ja: "cm", en: "cm" }, range: { min: 5, max: 100, step: 5 } },
      { id: "shieldThickness", label: { ja: "遮蔽厚", en: "Shield thickness" }, unit: { ja: "mm", en: "mm" }, range: { min: 0, max: 20, step: 1 } },
      { id: "measurementTime", label: { ja: "測定時間", en: "Measurement time" }, unit: { ja: "秒", en: "s" }, range: { min: 1, max: 60, step: 1 } },
    ],
    observations: [
      { id: "countRate", label: { ja: "計数率", en: "Count rate" }, unit: { ja: "cps", en: "cps" } },
      { id: "transmission", label: { ja: "透過率", en: "Transmission" }, unit: { ja: "%", en: "%" } },
      { id: "uncertainty", label: { ja: "統計誤差", en: "Statistical error" }, unit: { ja: "%", en: "%" } },
    ],
    citations: ["ICRP Publication 107 representative nuclide choices"],
    licenses: ["Repository MIT license", "Bundled data terms in public/data/LICENSE.ICRP-07.txt"],
    safety: COMMON_SAFETY,
  },
  {
    id: "pulse",
    slug: "pulse",
    labNumber: "04",
    collection: { ja: "Nuclear Collection", en: "Nuclear Collection" },
    discipline: { ja: "核種 / パルス計測", en: "Nuclides / pulse measurement" },
    title: { ja: "Pulse Lab", en: "Pulse Lab" },
    summary: { ja: "一つずつのイベントからスペクトルへ", en: "From individual events to a spectrum" },
    description: {
      ja: "バックグラウンドの中にイベントが積み上がり、ピークらしい構造が見えるまでを観察します。",
      en: "Watch events accumulate through background noise until peak-like structures emerge.",
    },
    status: "foundation",
    datasets: [LOCAL_DATASET],
    assumptions: [
      { ja: "代表核種のエネルギー線を正規分布でぼかします。", en: "Representative nuclide lines are broadened with a normal response." },
      { ja: "背景は一様な低エネルギー連続分布として生成します。", en: "Background is generated as a low-rate uniform continuum." },
      { ja: "乱数シードを固定すれば同じイベント列を再生できます。", en: "A fixed seed reproduces the same event sequence." },
    ],
    constraints: [
      { ja: "核種同定、線量判断、安全判断のためのスペクトル解析ではありません。", en: "This is not a spectrum-analysis tool for nuclide identification, dose, or safety decisions." },
      { ja: "実在検出器の校正・効率・線幅を再現しません。", en: "It does not reproduce calibration, efficiency, or line widths of a real detector." },
    ],
    languages: ["ja", "en"],
    parameters: [
      { id: "source", label: { ja: "代表核種", en: "Representative source" }, unit: { ja: "核種", en: "nuclide" } },
      { id: "detector", label: { ja: "検出器特性", en: "Detector response" }, unit: { ja: "種類", en: "type" } },
      { id: "measurementTime", label: { ja: "測定時間", en: "Measurement time" }, unit: { ja: "秒", en: "s" }, range: { min: 2, max: 60, step: 1 } },
      { id: "background", label: { ja: "バックグラウンド", en: "Background" }, unit: { ja: "cps", en: "cps" }, range: { min: 0, max: 20, step: 1 } },
      { id: "seed", label: { ja: "乱数シード", en: "Random seed" }, unit: { ja: "整数", en: "integer" } },
    ],
    observations: [
      { id: "events", label: { ja: "蓄積イベント", en: "Accumulated events" }, unit: { ja: "イベント", en: "events" } },
      { id: "peakEnergy", label: { ja: "見えているピーク", en: "Visible peak" }, unit: { ja: "keV", en: "keV" } },
    ],
    citations: ["Representative educational line energies are documented in docs/DATA_PROVENANCE.md"],
    licenses: ["Repository MIT license", "No external runtime data is fetched"],
    safety: COMMON_SAFETY,
  },
] as const satisfies readonly LabManifest[];

export function getLabBySlug(slug: string): LabManifest | undefined {
  return LAB_REGISTRY.find((lab) => lab.slug === slug);
}

export function labPath(lab: Pick<LabManifest, "slug">): string {
  return `/labs/${lab.slug}`;
}

export function localized(language: Language, text: LocalizedText): string {
  return text[language];
}
