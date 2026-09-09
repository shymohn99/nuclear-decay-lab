"use client";

import Link from "next/link";
import { LanguageToggle, usePhenomenaLanguage } from "../components/PhenomenaShell";
import { translate } from "../lib/experiment";
import { LAB_REGISTRY, labPath, localize, type LabId, type Language } from "../lib/labs";

const modelNotes: Record<LabId, {
  label: string;
  title: { ja: string; en: string };
  formula: string;
  formulaLabel: { ja: string; en: string };
  explanation: { ja: string; en: string };
}> = {
  decay: {
    label: "STOCHASTIC DECAY",
    title: { ja: "独立な壊変と指数則", en: "Independent decay and the exponential law" },
    formula: "P(survive to t) = 2^(−t / T½)",
    formulaLabel: { ja: "時刻 t まで未壊変である確率", en: "Probability of remaining undecayed at time t" },
    explanation: {
      ja: "各原子核を独立な確率過程として更新し、粒子の集団と同じ半減期をもつ理論曲線を重ねます。現行版の系列表示は代表分岐を使います。",
      en: "Each nucleus is updated as an independent stochastic process and compared with a theory curve using the same half-life. The current series view uses representative branches.",
    },
  },
  atlas: {
    label: "NUCLIDE MAP",
    title: { ja: "陽子数と中性子数の座標", en: "Coordinates of protons and neutrons" },
    formula: "position = (N, Z) = (A − Z, Z)",
    formulaLabel: { ja: "核種地図上の座標", en: "Position on the nuclide map" },
    explanation: {
      ja: "核種を中性子数 N と陽子数 Z で配置し、カタログに収録された代表的な娘核種と近傍の祖先をたどります。完全な壊変図式ではありません。",
      en: "Nuclides are placed by neutron number N and proton number Z, then linked to a representative daughter and nearby ancestors in the catalog. This is not a complete decay scheme.",
    },
  },
  detector: {
    label: "RELATIVE RESPONSE",
    title: { ja: "標準仮想装置の相対応答", en: "Relative response of a standard virtual instrument" },
    formula: "Rrel = εdetector × G(r) × T(shield) + B",
    formulaLabel: { ja: "検出効率・距離・透過・背景の教育モデル", en: "Teaching model of efficiency, distance, transmission, and background" },
    explanation: {
      ja: "同じ線源を固定した仮想配置で、検出器特性・距離・遮蔽による相対的な変化を比較します。実在装置の校正値、活動度、線量は計算しません。",
      en: "A fixed virtual setup compares relative changes from detector characteristics, distance, and shielding. It does not calculate calibrated response, real activity, or dose.",
    },
  },
  pulse: {
    label: "SYNTHETIC SPECTRUM",
    title: { ja: "確率イベントからつくるスペクトル", en: "A spectrum built from probabilistic events" },
    formula: "N ~ Poisson(μ) · Eᵢ ~ teaching distribution",
    formulaLabel: { ja: "イベント数と各イベントの合成エネルギー", en: "Event total and synthetic energy per event" },
    explanation: {
      ja: "代表的なピーク位置と分解能からイベントを合成し、低い平均ではPoisson標本、高い平均では正規近似を用います。核種同定や校正には使えません。",
      en: "Events are synthesized from representative peak positions and resolution, using Poisson sampling at low means and a normal approximation at high means. It cannot identify nuclides or calibrate an instrument.",
    },
  },
};

function LabModelSection({ labId, language }: Readonly<{ labId: LabId; language: Language }>) {
  const lab = LAB_REGISTRY.find((item) => item.id === labId);
  if (!lab) return null;
  const note = modelNotes[labId];

  return (
    <section className={`about-lab about-lab--${lab.id}`} id={lab.id} aria-labelledby={`${lab.id}-model-title`}>
      <header className="about-lab__header">
        <div>
          <span>LAB {lab.labNumber} / {note.label}</span>
          <h2 id={`${lab.id}-model-title`}>{localize(language, lab.title)}</h2>
          <p>{localize(language, lab.summary)}</p>
        </div>
        <Link href={labPath(lab)}>{translate(language, "Labを開く", "Open lab")} <span aria-hidden="true">↗</span></Link>
      </header>

      <div className="about-lab__grid">
        <section className="about-lab__block about-lab__block--model">
          <p className="eyebrow">MODEL / {translate(language, "現在の実装", "CURRENT IMPLEMENTATION")}</p>
          <h3>{translate(language, note.title.ja, note.title.en)}</h3>
          <div className="about-formula" role="figure" aria-label={translate(language, note.formulaLabel.ja, note.formulaLabel.en)}>
            <code>{note.formula}</code>
            <span>{translate(language, note.formulaLabel.ja, note.formulaLabel.en)}</span>
          </div>
          <p>{translate(language, note.explanation.ja, note.explanation.en)}</p>
        </section>

        <section className="about-lab__block">
          <h3>{translate(language, "仮定", "Assumptions")}</h3>
          <ul>{lab.assumptions.map((item) => <li key={item.en}>{localize(language, item)}</li>)}</ul>
        </section>

        <section className="about-lab__block">
          <h3>{translate(language, "既知の制約", "Known limits")}</h3>
          <ul>{lab.constraints.map((item) => <li key={item.en}>{localize(language, item)}</li>)}</ul>
        </section>

        <section className="about-lab__block about-lab__block--sources">
          <h3>{translate(language, "データと出典", "Data and sources")}</h3>
          <ul className="about-source-list">
            {lab.datasets.map((dataset) => (
              <li key={dataset.id}>
                <div><strong>{localize(language, dataset.display)}</strong><span>{dataset.version}</span></div>
                <p>{localize(language, dataset.role)}</p>
                <p>
                  {dataset.sourceHref ? <Link href={dataset.sourceHref} target="_blank" rel="noreferrer">{dataset.source} <span aria-hidden="true">↗</span></Link> : dataset.source}
                </p>
                <p>
                  {dataset.licenseHref ? <Link href={dataset.licenseHref} target="_blank" rel="noreferrer">{dataset.license} <span aria-hidden="true">↗</span></Link> : dataset.license}
                </p>
              </li>
            ))}
          </ul>
          <h3>{translate(language, "引用とライセンス", "Citations and licenses")}</h3>
          <ul>{[...lab.citations, ...lab.licenses].map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>

      <a className="about-anchor-link" href="#about-index">{translate(language, "モデル索引へ戻る", "Back to model index")} ↑</a>
    </section>
  );
}

export default function AboutPage() {
  const [language, setLanguage] = usePhenomenaLanguage();

  return (
    <div className="phenomena-app about-page">
      <a className="skip-link" href="#about-main">{translate(language, "本文へ移動", "Skip to main content")}</a>
      <header className="phenomena-header">
        <Link className="phenomena-wordmark" href="/" aria-label="Phenomena home">
          <span>PHENOMENA</span>
          <small>MAKE THE INVISIBLE TANGIBLE</small>
        </Link>
        <div className="phenomena-current-lab">
          <span>REFERENCE / 00</span>
          <strong>About the models</strong>
        </div>
        <div className="phenomena-header-actions">
          <nav className="phenomena-nav" aria-label={translate(language, "Aboutナビゲーション", "About navigation")}>
            <Link href="/">{translate(language, "← Lab一覧", "← All labs")}</Link>
            <a href="#about-index">MODEL INDEX</a>
          </nav>
          <LanguageToggle language={language} onChange={setLanguage} />
        </div>
      </header>

      <main className="about-main" id="about-main" tabIndex={-1}>
        <section className="about-hero" aria-labelledby="about-title">
          <div className="about-hero__index"><span>REF</span><strong>00</strong><small>FOUNDATION v1</small></div>
          <div className="about-hero__copy">
            <p className="eyebrow">PRINCIPLES / MODELS / SOURCES</p>
            <h1 id="about-title">{translate(language, "装置の内側。", "Inside the instruments.")}</h1>
            <p>{translate(language, "式、仮定、データ、限界を、観察の邪魔をしない一か所に。", "Equations, assumptions, data, and limits—kept in one inspectable place.")}</p>
          </div>
          <div className="about-summary-grid" aria-label={translate(language, "このページの内容", "Contents of this page")}>
            <div><span>04</span><strong>{translate(language, "モデル", "Models")}</strong></div>
            <div><span>01</span><strong>{translate(language, "共通境界", "Shared boundary")}</strong></div>
            <div><span>JA / EN</span><strong>{translate(language, "表示言語", "Languages")}</strong></div>
          </div>
        </section>

        <nav className="about-index" id="about-index" aria-label={translate(language, "Labモデル索引", "Lab model index")}>
          <span>MODEL INDEX</span>
          {LAB_REGISTRY.map((lab) => (
            <a href={`#${lab.id}`} key={lab.id}>
              <small>{lab.labNumber}</small>
              <strong>{localize(language, lab.title)}</strong>
            </a>
          ))}
        </nav>

        <section className="about-principles" aria-labelledby="principles-title">
          <div>
            <p className="eyebrow">THE INSTRUMENT</p>
            <h2 id="principles-title">Make the invisible tangible.</h2>
          </div>
          <div className="about-principle-grid">
            <article><span>01 / OPERATE</span><h3>{translate(language, "まず動かす", "Operate first")}</h3><p>{translate(language, "説明より先に状態を変え、目の前の応答を観察します。", "Change a state before reading an explanation, then observe the response in front of you.")}</p></article>
            <article><span>02 / INSPECT</span><h3>{translate(language, "仮定へ戻れる", "Return to assumptions")}</h3><p>{translate(language, "各Labから、このページの対応する式・出典・制約へ直接移動できます。", "Each lab links directly to its equations, sources, and limits on this page.")}</p></article>
            <article><span>03 / LOCAL</span><h3>{translate(language, "端末内で動く", "Runs on device")}</h3><p>{translate(language, "主要な実験は外部AIや有料APIに依存せず、状態を再現できます。", "Core experiments do not depend on external AI or paid APIs, and their state can be reproduced.")}</p></article>
          </div>
        </section>

        <section className="about-boundary" aria-labelledby="boundary-title">
          <div><span>USE BOUNDARY</span><strong aria-hidden="true">!</strong></div>
          <div>
            <h2 id="boundary-title">{translate(language, "大学教育のためのモデルです。", "Models for university education.")}</h2>
            <p>{translate(language, "放射線安全、被ばく線量、医療判断、規制適合、線源同定、実機校正、研究級解析には使用しないでください。数値は、明記した仮定の中で現象を比較するためのものです。", "Do not use these models for radiation safety, dose assessment, medical decisions, regulatory compliance, source identification, instrument calibration, or research-grade analysis. Values are for comparing phenomena within the stated assumptions.")}</p>
          </div>
        </section>

        <div className="about-labs">
          {LAB_REGISTRY.map((lab) => <LabModelSection key={lab.id} labId={lab.id} language={language} />)}
        </div>
      </main>

      <footer className="phenomena-footer">
        <div><strong>PHENOMENA</strong><span>FOUNDATION v1 / MODEL NOTES</span></div>
        <p>{translate(language, "観察に戻り、条件を変えて確かめてください。", "Return to an instrument, change a condition, and test what you read.")}</p>
        <Link href="/">{translate(language, "4つのLabへ", "Back to four labs")} <span aria-hidden="true">→</span></Link>
      </footer>
    </div>
  );
}
