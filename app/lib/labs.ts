export type Language = "ja" | "en";

export type LocalizedText = Readonly<{
  ja: string;
  en: string;
}>;

export type LabId = "decay" | "atlas" | "detector" | "pulse";

export type DatasetReference = Readonly<{
  id: string;
  version: string;
  display: LocalizedText;
  role: LocalizedText;
  source: string;
  license: string;
  sourceHref?: string;
  licenseHref?: string;
}>;

export type LabVariable = Readonly<{
  id: string;
  label: LocalizedText;
  unit: LocalizedText;
  kind: "parameter" | "observation";
  range?: Readonly<{ min: number; max: number; step: number }>;
}>;

export type LabManifest = Readonly<{
  id: LabId;
  slug: string;
  labNumber: string;
  collection: LocalizedText;
  discipline: LocalizedText;
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  status: "foundation";
  datasets: readonly DatasetReference[];
  assumptions: readonly LocalizedText[];
  constraints: readonly LocalizedText[];
  languages: readonly Language[];
  variables: readonly LabVariable[];
  stateKey: string;
  citations: readonly string[];
  licenses: readonly string[];
  safety: readonly LocalizedText[];
}>;

export const localize = (language: Language, text: LocalizedText): string =>
  text[language];

export const labPath = (lab: Pick<LabManifest, "slug">): string =>
  `/labs/${lab.slug}`;

export const NUCLEAR_DATASET: DatasetReference = {
  id: "radionuclide-catalog",
  version: "radioactivedecay 0.6.1 derived catalog (992 records)",
  display: { ja: "ICRP核種表", en: "ICRP nuclide catalog" },
  role: {
    ja: "核種地図と代表的な主壊変分岐、3核種の教育用分岐モデル",
    en: "Nuclide map, representative principal branches, and a curated model for three nuclides",
  },
  source: "Bundled catalog derived from ICRP-107, AME2020, and Nubase2020.",
  license: "ICRP-07 terms are bundled at public/data/LICENSE.TXT; code is MIT. See DATA_PROVENANCE.md.",
  sourceHref: "https://radioactivedecay.github.io/overview.html",
  licenseHref: "/data/LICENSE.TXT",
};

export const NUDAT_FOOTPRINT_DATASET: DatasetReference = {
  id: "nudat-footprint",
  version: "static educational footprint in the original application",
  display: { ja: "地図フットプリント", en: "Map footprint" },
  role: {
    ja: "核種地図の背景領域",
    en: "Background extent for the nuclide map",
  },
  source: "Original application snapshot; not a current or complete NuDat export.",
  license: "Citation and provenance notes in DATA_PROVENANCE.md.",
};

export const ENSDF_ATLAS_DATASET: DatasetReference = {
  id: "nndc-ensdf-atlas",
  version: "ENSDF API snapshot 2026-08-10",
  display: { ja: "ENSDF 評価済み核構造データ", en: "ENSDF evaluated nuclear structure data" },
  role: {
    ja: "核種、核状態、評価済み壊変レコードによるAtlas地図",
    en: "Atlas map of nuclides, nuclear states, and evaluated decay records",
  },
  source: "National Nuclear Data Center ENSDF public beta API snapshot.",
  license: "Local evaluation only while redistribution terms are under review. See ENSDF_IMPORT.md.",
  sourceHref: "https://www.nndc.bnl.gov/ensdf-api/",
  licenseHref: "https://www.nndc.bnl.gov/nudat3/guide/#terms",
};

export const TEACHING_MODEL_DATASET: DatasetReference = {
  id: "phenomena-teaching-models",
  version: "Foundation v1",
  display: { ja: "Foundation v1 教育モデル", en: "Foundation v1 teaching model" },
  role: {
    ja: "端末内で動く教育用の相対モデル",
    en: "Device-local educational relative models",
  },
  source: "Phenomena Foundation v1 model notes.",
  license: "MIT for software; values are documented teaching approximations.",
};

const commonSafety: readonly LocalizedText[] = [
  {
    ja: "教育用の概念モデルです。放射線安全、被ばく線量、医療判断、規制適合、線源同定、研究級解析には使用しないでください。",
    en: "Educational conceptual model only. Do not use for radiation safety, dose assessment, medical decisions, regulatory compliance, source identification, or research-grade analysis.",
  },
];

const commonConstraints: readonly LocalizedText[] = [
  {
    ja: "端末内の可視化は、実在する線源・検出器・遮蔽体の校正や再現を意図しません。",
    en: "The visualizations are not calibrated reproductions of a particular source, detector, or shielding assembly.",
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
      ja: "モンテカルロ粒子、理論曲線、観察用の放射系列、核種系譜を使って、確率的な壊変を観察します。",
      en: "Observe stochastic decay with Monte Carlo particles, a theory curve, observation-friendly series, and nuclide genealogy.",
    },
    status: "foundation",
    datasets: [NUCLEAR_DATASET, NUDAT_FOOTPRINT_DATASET],
    assumptions: [
      { ja: "単一核種では半減期が一定で、各原子核は独立に壊変します。", en: "For a single nuclide, half-life is constant and nuclei decay independently." },
      { ja: "PhysicsモードのI-131、Cs-137、Co-60は、カタログ分率から作った完全な結果分割（I-131/Cs-137は群化された残余を含む）を壊変ごとに抽選します。", en: "Physics mode samples a complete outcome split for I-131, Cs-137, and Co-60 from catalog fractions; I-131 and Cs-137 include grouped remainders." },
      { ja: "系列表示は観察のために中間核種を省略したマイルストーン列を含みます。", en: "Series views include observation-oriented milestone sequences that omit intermediate nuclides." },
    ],
    constraints: [
      { ja: "分岐モデルは3核種に限る教育用の結果分割で、その他の核種は代表分岐のみです。レベル図式、γ線カスケード、放出エネルギー、実活動度を網羅するものではありません。", en: "The outcome split is a teaching model for three nuclides only; other nuclides retain representative branches. It is not a full level scheme, gamma scheme, emission-energy model, or real source activity model." },
      ...commonConstraints,
    ],
    languages: ["ja", "en"],
    variables: [
      { id: "nucleus-count", label: { ja: "原子核の数", en: "Nucleus count" }, unit: { ja: "個", en: "nuclei" }, kind: "parameter", range: { min: 20, max: 500, step: 10 } },
      { id: "time-scale", label: { ja: "時間倍率", en: "Time scale" }, unit: { ja: "倍率", en: "multiplier" }, kind: "parameter" },
      { id: "reset-seed", label: { ja: "リセットシード", en: "Reset seed" }, unit: { ja: "整数", en: "integer" }, kind: "parameter", range: { min: 1, max: 2147483647, step: 1 } },
      { id: "remaining", label: { ja: "未壊変の原子核", en: "Undecayed nuclei" }, unit: { ja: "個", en: "nuclei" }, kind: "observation" },
      { id: "normalized-decay-rate", label: { ja: "正規化壊変率", en: "Normalized decay rate" }, unit: { ja: "T½ あたり", en: "per T½" }, kind: "observation" },
    ],
    stateKey: "decay-v1",
    citations: ["Bundled catalog: ICRP-107 / AME2020 / Nubase2020 via radioactivedecay 0.6.1; curated outcome splits are documented in DATA_PROVENANCE.md."],
    licenses: ["MIT software license; separate ICRP-07 data terms."],
    safety: commonSafety,
  },
  {
    id: "atlas",
    slug: "atlas",
    labNumber: "02",
    collection: { ja: "Nuclear Collection", en: "Nuclear Collection" },
    discipline: { ja: "核図表 / 核種系譜", en: "Nuclide chart / genealogy" },
    title: { ja: "Nuclide Atlas", en: "Nuclide Atlas" },
    summary: { ja: "陽子数と中性子数の地図から系譜をたどる", en: "Navigate genealogy from a proton–neutron map" },
    description: {
      ja: "核種地図から基底・準安定状態を選び、評価済みの壊変先をたどって関連Labへ移動できます。",
      en: "Choose ground or metastable states on the nuclide map, trace evaluated decay destinations, and continue to related Labs.",
    },
    status: "foundation",
    datasets: [ENSDF_ATLAS_DATASET],
    assumptions: [{ ja: "地図上は核種ごとに一点を置き、基底状態の安定性または代表的な壊変形式で色分けします。", en: "The map places one point per nuclide and colors it by evaluated ground-state stability or a representative decay mode." }],
    constraints: [{ ja: "APIの娘核種データには状態指定がないため、壊変先は基底状態として表示します。分岐比未収録は推定せず、レベル図式や放射線放出を再構成しません。", en: "Because the API daughter payload does not identify a state, destinations are shown as ground states. Missing branching ratios are not inferred, and level or emission schemes are not reconstructed." }],
    languages: ["ja", "en"],
    variables: [
      { id: "selected-nuclide", label: { ja: "選択核種", en: "Selected nuclide" }, unit: { ja: "核種", en: "nuclide" }, kind: "parameter" },
      { id: "selected-state", label: { ja: "選択状態", en: "Selected state" }, unit: { ja: "g / mN", en: "g / mN" }, kind: "parameter" },
      { id: "decay-destinations", label: { ja: "収録壊変先", en: "Recorded decay destinations" }, unit: { ja: "核種", en: "nuclides" }, kind: "observation" },
    ],
    stateKey: "atlas-v1",
    citations: ["National Nuclear Data Center, ENSDF public beta API, data release generated 2026-08-10."],
    licenses: ["MIT software; ENSDF snapshot remains local-only pending redistribution review."],
    safety: commonSafety,
  },
  {
    id: "detector",
    slug: "detector",
    labNumber: "03",
    collection: { ja: "Nuclear Collection", en: "Nuclear Collection" },
    discipline: { ja: "放射線検出 / 相対応答", en: "Radiation detection / relative response" },
    title: { ja: "Detector Lab", en: "Detector Lab" },
    summary: { ja: "検出器・距離・遮蔽を比較する", en: "Compare detector, distance, and shielding" },
    description: {
      ja: "GM、シンチレーション、半導体という三つの性質を、距離と遮蔽を変えながら相対的な期待応答として比較します。",
      en: "Compare relative expected response for GM, scintillation, and semiconductor characteristics while changing distance and shielding.",
    },
    status: "foundation",
    datasets: [TEACHING_MODEL_DATASET],
    assumptions: [{ ja: "距離因子、透過、効率、背景は相対的な教育用係数です。", en: "Distance, transmission, efficiency, and background are relative teaching coefficients." }],
    constraints: [...commonConstraints, { ja: "実活動度、線量、幾何、死時間、散乱、校正は扱いません。", en: "The model excludes real activity, dose, geometry, dead time, scattering, and calibration." }, { ja: "相対変動指標は実測の不確かさや信頼区間ではありません。", en: "The relative variation index is not a measured uncertainty or confidence interval." }],
    languages: ["ja", "en"],
    variables: [
      { id: "distance", label: { ja: "線源からの距離", en: "Source distance" }, unit: { ja: "cm", en: "cm" }, kind: "parameter", range: { min: 5, max: 100, step: 5 } },
      { id: "shielding", label: { ja: "遮蔽厚", en: "Shield thickness" }, unit: { ja: "mm", en: "mm" }, kind: "parameter", range: { min: 0, max: 20, step: 1 } },
      { id: "measurement-time", label: { ja: "測定時間", en: "Measurement time" }, unit: { ja: "秒", en: "s" }, kind: "parameter", range: { min: 1, max: 60, step: 1 } },
      { id: "expected-response", label: { ja: "相対期待計数", en: "Relative expected counts" }, unit: { ja: "相対値", en: "relative units" }, kind: "observation" },
    ],
    stateKey: "detector-v1",
    citations: ["Phenomena Foundation v1 educational detector model."],
    licenses: ["MIT software and model implementation."],
    safety: commonSafety,
  },
  {
    id: "pulse",
    slug: "pulse",
    labNumber: "04",
    collection: { ja: "Nuclear Collection", en: "Nuclear Collection" },
    discipline: { ja: "放射線パルス / スペクトル形成", en: "Radiation pulses / spectrum formation" },
    title: { ja: "Pulse Lab", en: "Pulse Lab" },
    summary: { ja: "一つずつのイベントからスペクトルらしい構造へ", en: "From individual events to spectrum-like structure" },
    description: {
      ja: "代表核種、検出器分解能、背景、測定時間、再現可能な乱数を変えながら、イベントが蓄積される様子を観察します。",
      en: "Change representative nuclides, detector resolution, background, measurement time, and a reproducible seed while events accumulate.",
    },
    status: "foundation",
    datasets: [TEACHING_MODEL_DATASET],
    assumptions: [{ ja: "ピーク位置と形状は教育用の代表値で、各イベントは合成した確率モデルです。イベント数は低平均でPoissonサンプル、高平均で正規近似を使います。", en: "Peak positions and shapes are representative teaching values generated by a synthetic probability model. Event totals use Poisson sampling at low means and a normal approximation at high means." }],
    constraints: [...commonConstraints, { ja: "この表示は核種同定、定量、校正、線源の安全判断を行いません。", en: "This display does not perform nuclide identification, quantification, calibration, or source safety assessment." }],
    languages: ["ja", "en"],
    variables: [
      { id: "source", label: { ja: "代表核種", en: "Representative nuclide" }, unit: { ja: "選択", en: "selection" }, kind: "parameter" },
      { id: "resolution", label: { ja: "分解能", en: "Resolution" }, unit: { ja: "% FWHM", en: "% FWHM" }, kind: "parameter" },
      { id: "background", label: { ja: "背景", en: "Background" }, unit: { ja: "相対イベント/秒", en: "relative events/s" }, kind: "parameter" },
      { id: "seed", label: { ja: "乱数シード", en: "Random seed" }, unit: { ja: "整数", en: "integer" }, kind: "parameter" },
      { id: "events", label: { ja: "蓄積イベント", en: "Accumulated events" }, unit: { ja: "イベント", en: "events" }, kind: "observation" },
    ],
    stateKey: "pulse-v1",
    citations: ["Representative gamma-line anchors are documented in DATA_PROVENANCE.md; synthetic event model is Phenomena Foundation v1."],
    licenses: ["MIT software and synthetic teaching model implementation."],
    safety: commonSafety,
  },
] as const satisfies readonly LabManifest[];

export function getLab(id: LabId): LabManifest {
  const lab = LAB_REGISTRY.find((item) => item.id === id);
  if (!lab) throw new Error(`Unknown lab: ${id}`);
  return lab;
}
