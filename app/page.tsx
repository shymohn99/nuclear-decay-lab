"use client";

import Link from "next/link";
import { LabMeta, LanguageToggle, SafetyNote, usePhenomenaLanguage } from "./components/PhenomenaShell";
import { LAB_REGISTRY, labPath, localized } from "./lib/labs";
import { translate } from "./lib/experiment";

export default function Home() {
  const [language, setLanguage] = usePhenomenaLanguage();
  return (
    <div className="phenomena-app phenomena-home">
      <header className="phenomena-header">
        <Link className="phenomena-wordmark" href="/" aria-label="Phenomena home">
          <span>PHENOMENA</span>
          <small>MAKE THE INVISIBLE TANGIBLE</small>
        </Link>
        <div className="phenomena-current-lab">
          <span>FOUNDATION / 2026</span>
          <strong>{translate(language, "Labカタログ", "Lab catalogue")}</strong>
        </div>
        <div className="phenomena-header-actions">
          <nav className="phenomena-nav" aria-label={translate(language, "Labナビゲーション", "Lab navigation")}>
            <a href="#nuclear-collection">{translate(language, "Nuclear Collection", "Nuclear Collection")}</a>
            <a href="#about">{translate(language, "About", "About")}</a>
          </nav>
          <LanguageToggle language={language} onChange={setLanguage} />
        </div>
      </header>

      <main>
        <section className="catalog-hero" aria-labelledby="phenomena-title">
          <p className="eyebrow">PHENOMENA / FOUNDATION v1</p>
          <h1 id="phenomena-title"><span>触れられないものを、</span><span>触れられる現象へ。</span></h1>
          <p>
            {translate(language,
              "Phenomenaは、見えない現象を操作と観測で理解するための、端末内で動作する科学プラットフォームです。最初のコレクションは核物理から始まります。",
              "Phenomena is a device-first scientific platform for understanding invisible phenomena through manipulation and observation. The first collection begins with nuclear physics.",
            )}
          </p>
          <div className="catalog-hero-rule" aria-hidden="true" />
          <div className="catalog-hero-caption">
            <span>01—04 / NUCLEAR COLLECTION</span>
            <span>{translate(language, "読むより、動かす。", "Operate first. Read second.")}</span>
          </div>
        </section>

        <section className="catalog-section" id="nuclear-collection" aria-labelledby="collection-title">
          <div className="section-heading catalog-section-heading">
            <div><p className="eyebrow">COLLECTION 01</p><h2 id="collection-title">Nuclear Collection</h2></div>
            <p>{translate(language, "同じ核種データを、壊変・地図・検出・パルスという異なる観測窓から見ます。", "Look at the same nuclear world through four different windows: decay, atlas, detection, and pulses.")}</p>
          </div>
          <div className="lab-catalog-grid">
            {LAB_REGISTRY.map((lab) => (
              <article className="lab-catalog-card" key={lab.id}>
                <div className="lab-card-top"><span>LAB {lab.labNumber}</span><span>{localized(language, lab.discipline)}</span></div>
                <div className="lab-card-body">
                  <p className="lab-card-kicker">{localized(language, lab.collection)}</p>
                  <h3><Link href={labPath(lab)}>{localized(language, lab.title)} ↗</Link></h3>
                  <p>{localized(language, lab.description)}</p>
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
            <p>{translate(language, "説明を積み上げるのではなく、状態を変え、結果を観測し、仮定へ戻れる道具をつくります。", "Instead of stacking explanations, we build instruments that let you change a state, observe a result, and return to the assumptions.")}</p>
            <div className="principle-list">
              <div><span>01</span><strong>{translate(language, "端末内で動く", "Runs locally")}</strong><p>{translate(language, "主要な実験は外部AIや有料APIに依存しません。", "Core experiments do not depend on external AI or paid APIs.")}</p></div>
              <div><span>02</span><strong>{translate(language, "仮定を明示する", "Shows assumptions")}</strong><p>{translate(language, "モデル、簡略化、データ出典を各Labのメタデータとして追跡できます。", "Models, simplifications, and sources are traceable in each lab's metadata.")}</p></div>
              <div><span>03</span><strong>{translate(language, "安全境界を守る", "Keeps boundaries")}</strong><p>{translate(language, "教育用の観測装置であり、実用の安全・医療・線量判断装置ではありません。", "These are educational instruments, not tools for safety, medical, or dose decisions.")}</p></div>
            </div>
          </div>
        </section>
        <SafetyNote lab={LAB_REGISTRY[0]} language={language} />
      </main>
      <footer className="phenomena-footer">
        <div><strong>PHENOMENA</strong><span>FOUNDATION v1 / 2026</span></div>
        <p>{translate(language, "Nuclear Collectionから始まる、見えない現象のカタログ。", "A catalogue of invisible phenomena, beginning with the Nuclear Collection.")}</p>
        <a href="https://github.com/shymohn99/nuclear-decay-lab" target="_blank" rel="noopener noreferrer">{translate(language, "ソースを見る", "View source")} ↗</a>
      </footer>
    </div>
  );
}
