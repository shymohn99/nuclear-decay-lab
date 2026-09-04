"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LabMeta, LanguageToggle, SafetyNote, usePhenomenaLanguage } from "./components/PhenomenaShell";
import { translate } from "./lib/experiment";
import { LAB_REGISTRY, labPath, localize } from "./lib/labs";

const co60Journey = [
  {
    number: "01",
    lab: "Nuclide Atlas",
    href: "/labs/atlas?nuclide=Co-60",
    ja: "地図の中に置く",
    en: "Locate it on the map",
  },
  {
    number: "02",
    lab: "Decay Lab",
    href: "/labs/decay?nuclide=Co-60",
    ja: "確率的に壊変させる",
    en: "Let it decay stochastically",
  },
  {
    number: "03",
    lab: "Detector Lab",
    href: "/labs/detector?source=cobalt-60",
    ja: "距離と遮蔽を変える",
    en: "Change distance and shielding",
  },
  {
    number: "04",
    lab: "Pulse Lab",
    href: "/labs/pulse?source=cobalt-60",
    ja: "パルスを積み上げる",
    en: "Accumulate pulses",
  },
] as const;

export default function PhenomenaHome() {
  const [language, setLanguage] = usePhenomenaLanguage();
  const router = useRouter();

  useEffect(() => {
    const legacyTargets: Record<string, string> = {
      "#simulator": "/labs/decay",
      "#detector-lab": "/labs/detector",
      "#genealogy": "/labs/atlas",
    };
    const legacyTarget = legacyTargets[window.location.hash];
    if (legacyTarget) router.replace(`${legacyTarget}${window.location.search}`);
  }, [router]);

  return (
    <div className="phenomena-app phenomena-home">
      <a className="skip-link" href="#catalog-main">{translate(language, "本文へ移動", "Skip to main content")}</a>
      <header className="phenomena-header">
        <Link className="phenomena-wordmark" href="/" aria-label="Phenomena home">
          <span>PHENOMENA</span>
          <small>MAKE THE INVISIBLE TANGIBLE</small>
        </Link>
        <div className="phenomena-current-lab">
          <span>FOUNDATION v1</span>
          <strong>{translate(language, "Labカタログ", "Lab catalogue")}</strong>
        </div>
        <div className="phenomena-header-actions">
          <nav className="phenomena-nav" aria-label={translate(language, "カタログ内ナビゲーション", "Catalogue navigation")}>
            <a href="#nuclear-collection">{translate(language, "Nuclear Collection", "Nuclear Collection")}</a>
            <a href="#about">{translate(language, "方針", "Principles")}</a>
          </nav>
          <LanguageToggle language={language} onChange={setLanguage} />
        </div>
      </header>

      <main id="catalog-main" tabIndex={-1}>
        <section className="catalog-hero" aria-labelledby="phenomena-title">
          <div className="catalog-hero-main">
            <p className="eyebrow">PHENOMENA / FOUNDATION v1</p>
            <h1 id="phenomena-title">
              <span>{translate(language, "見えないものを、", "Make the invisible")}</span>
              <span>{translate(language, "触れて理解する。", "tangible.")}</span>
            </h1>
            <p className="catalog-hero-description">
              {translate(
                language,
                "Phenomenaは、操作と観測を通して見えない現象を理解するための端末内科学プラットフォームです。Foundation v1は核物理から始まります。",
                "Phenomena is a device-first scientific platform for understanding invisible phenomena through manipulation and observation. Foundation v1 begins with nuclear physics.",
              )}
            </p>
            <div className="catalog-hero-actions">
              <Link className="catalog-primary-action" href="/labs/decay">
                {translate(language, "最初の観察を始める", "Begin the first observation")} <span aria-hidden="true">→</span>
              </Link>
              <a href="#nuclear-collection">{translate(language, "4つのLabを見る", "Browse all four labs")}</a>
            </div>
          </div>
          <aside className="catalog-hero-index" aria-label={translate(language, "現在のコレクション概要", "Current collection overview")}>
            <div><span>ACTIVE COLLECTION</span><strong>01 / NUCLEAR</strong></div>
            <dl>
              <div><dt>{translate(language, "実験", "Labs")}</dt><dd>04</dd></div>
              <div><dt>{translate(language, "実行", "Runtime")}</dt><dd>{translate(language, "端末内", "On-device")}</dd></div>
              <div><dt>{translate(language, "言語", "Languages")}</dt><dd>JA / EN</dd></div>
              <div><dt>{translate(language, "用途", "Purpose")}</dt><dd>{translate(language, "教育用", "Education")}</dd></div>
            </dl>
            <p>{translate(language, "確率、核種、検出、スペクトルを一つの観察経路でつなぎます。", "A connected observation path through probability, nuclides, detection, and spectra.")}</p>
          </aside>
          <div className="catalog-hero-rule" aria-hidden="true" />
          <div className="catalog-hero-caption">
            <span>01—04 / NUCLEAR COLLECTION</span>
            <span>{translate(language, "読んでからではなく、動かしてから。", "Operate first. Read second.")}</span>
          </div>
        </section>

        <section className="guided-route" aria-labelledby="guided-route-title">
          <div className="guided-route-intro">
            <p className="eyebrow">A FIRST PASS / CO-60</p>
            <h2 id="guided-route-title">{translate(language, "一つの核種を、四つの窓で。", "One nuclide, four windows.")}</h2>
            <p>{translate(language, "Co-60を共通の出発点にして、地図、壊変、検出、パルスのつながりを短い観察の流れでたどれます。", "Use Co-60 as a shared starting point and trace a short path through map, decay, detection, and pulses.")}</p>
          </div>
          <ol className="guided-route-steps">
            {co60Journey.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <Link href={step.href}>
                  <small>{step.lab}</small>
                  <strong>{translate(language, step.ja, step.en)}</strong>
                  <b aria-hidden="true">→</b>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="catalog-section" id="nuclear-collection" aria-labelledby="collection-title">
          <div className="section-heading catalog-section-heading">
            <div><p className="eyebrow">COLLECTION 01</p><h2 id="collection-title">Nuclear Collection</h2></div>
            <p>{translate(language, "壊変、地図、検出、パルス。四つの窓から同じ核の世界を観察します。", "Decay, atlas, detection, and pulses: four windows onto the same nuclear world.")}</p>
          </div>
          <div className="lab-catalog-grid">
            {LAB_REGISTRY.map((lab) => (
              <article className="lab-catalog-card" key={lab.id}>
                <div className="lab-card-top"><span>LAB {lab.labNumber}</span><span>{localize(language, lab.discipline)}</span></div>
                <div className="lab-card-body">
                  <p className="lab-card-kicker">{localize(language, lab.collection)}</p>
                  <h3><Link href={labPath(lab)}>{localize(language, lab.title)} →</Link></h3>
                  <p>{localize(language, lab.description)}</p>
                </div>
                <LabMeta lab={lab} language={language} />
                <Link className="lab-card-open" href={labPath(lab)}>{translate(language, "Labを開く", "Open lab")} <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="principles-section" id="about" aria-labelledby="principles-title">
          <div><p className="eyebrow">THE INSTRUMENT</p><h2 id="principles-title">Make the invisible tangible.</h2></div>
          <div className="principles-copy">
            <p>{translate(language, "説明を積み重ねる代わりに、状態を変え、結果を観察し、仮定へ戻れる実験器具をつくります。", "Instead of stacking explanations, we build instruments that let you change a state, observe a result, and return to the assumptions.")}</p>
            <div className="principle-list">
              <article><span>01</span><strong>{translate(language, "端末内で動く", "Runs locally")}</strong><p>{translate(language, "主要な実験は外部AIや有料APIに依存しません。", "Core experiments do not depend on external AI or paid APIs.")}</p></article>
              <article><span>02</span><strong>{translate(language, "仮定を見せる", "Shows assumptions")}</strong><p>{translate(language, "モデル、簡略化、出典、ライセンスを各Labのメタデータとして追跡できます。", "Models, simplifications, sources, and licenses remain traceable in each Lab's metadata.")}</p></article>
              <article><span>03</span><strong>{translate(language, "用途の境界を守る", "Keeps boundaries")}</strong><p>{translate(language, "安全、医療、線量、規制、研究級の意思決定を目的にしません。", "The product is not intended for safety, medical, dose, regulatory, or research-grade decisions.")}</p></article>
            </div>
          </div>
        </section>
        <SafetyNote lab={LAB_REGISTRY[0]} language={language} />
      </main>
      <footer className="phenomena-footer">
        <div><strong>PHENOMENA</strong><span>FOUNDATION v1 / 2026</span></div>
        <p>{translate(language, "Nuclear Collectionから始まる、見えない現象のカタログ。", "A catalogue of invisible phenomena, beginning with the Nuclear Collection.")}</p>
        <a href="https://github.com/shymohn99/nuclear-decay-lab" target="_blank" rel="noreferrer">{translate(language, "ソースを見る", "View source")} <span aria-hidden="true">→</span><span className="visually-hidden">{translate(language, "（新しいタブで開きます）", " (opens in a new tab)")}</span></a>
      </footer>
    </div>
  );
}
