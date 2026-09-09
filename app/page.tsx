"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type PointerEvent } from "react";
import { LanguageToggle, usePhenomenaLanguage } from "./components/PhenomenaShell";
import { translate } from "./lib/experiment";
import { LAB_REGISTRY, labPath, localize, type LabId } from "./lib/labs";

const labCardCopy: Record<LabId, {
  purpose: { ja: string; en: string };
  time: string;
  readout: { ja: string; en: string };
}> = {
  decay: {
    purpose: { ja: "一つずつのランダムな壊変から、指数曲線が現れる。", en: "Watch an exponential curve emerge from individual random decays." },
    time: "3 MIN",
    readout: { ja: "粒子を走らせ、理論曲線と比べる", en: "Run particles and compare them with theory" },
  },
  atlas: {
    purpose: { ja: "陽子数と中性子数の地図から、核種のつながりをたどる。", en: "Trace nuclide relationships on a proton–neutron map." },
    time: "4 MIN",
    readout: { ja: "核種を選び、親核種と娘核種を追う", en: "Select a nuclide and follow its family" },
  },
  detector: {
    purpose: { ja: "距離・遮蔽・検出器で、応答がどう変わるか比べる。", en: "Compare how distance, shielding, and detector type change response." },
    time: "3 MIN",
    readout: { ja: "仮想装置の条件を動かして比較する", en: "Change a virtual instrument and compare" },
  },
  pulse: {
    purpose: { ja: "一つずつの検出イベントを積み、スペクトルを形づくる。", en: "Accumulate detection events into a spectrum." },
    time: "4 MIN",
    readout: { ja: "パルスを集め、構造が育つ様子を見る", en: "Collect pulses and watch structure grow" },
  },
};

function LabPreview({ id }: Readonly<{ id: LabId }>) {
  if (id === "decay") {
    return (
      <div className="lab-preview lab-preview--decay" aria-hidden="true">
        <div className="preview-grid" />
        {Array.from({ length: 18 }, (_, index) => (
          <span className="preview-dot" key={index} style={{ "--dot-index": index } as CSSProperties} />
        ))}
        <svg viewBox="0 0 240 100" preserveAspectRatio="none">
          <path className="preview-curve-guide" d="M4 8 C48 50 96 76 236 92" />
          <path className="preview-curve" d="M4 8 C48 50 96 76 236 92" />
        </svg>
      </div>
    );
  }

  if (id === "atlas") {
    return (
      <div className="lab-preview lab-preview--atlas" aria-hidden="true">
        <div className="preview-grid" />
        <svg viewBox="0 0 240 120" preserveAspectRatio="none">
          <path className="preview-atlas-band" d="M8 105 C54 102 67 69 111 70 C154 70 166 28 232 15" />
          <path className="preview-atlas-route" d="M52 91 L77 78 L101 78 L126 62 L151 62 L175 45" />
        </svg>
        {["a", "b", "c", "d", "e", "f"].map((key, index) => (
          <span className={`preview-dot preview-dot--${key}`} key={key} style={{ "--dot-index": index } as CSSProperties} />
        ))}
        <span className="preview-atlas-cursor" />
      </div>
    );
  }

  if (id === "detector") {
    return (
      <div className="lab-preview lab-preview--detector" aria-hidden="true">
        <div className="preview-grid" />
        <span className="preview-source"><i /></span>
        <span className="preview-wave preview-wave--one" />
        <span className="preview-wave preview-wave--two" />
        <span className="preview-wave preview-wave--three" />
        <span className="preview-shield" />
        <span className="preview-detector"><i /><i /><i /><i /></span>
      </div>
    );
  }

  return (
    <div className="lab-preview lab-preview--pulse" aria-hidden="true">
      <div className="preview-grid" />
      <svg className="preview-pulse-line" viewBox="0 0 240 68" preserveAspectRatio="none">
        <path d="M0 56 L31 56 L35 50 L39 56 L70 56 L75 12 L80 56 L113 56 L119 32 L125 56 L155 56 L159 43 L164 56 L240 56" />
      </svg>
      <div className="preview-spectrum">
        {[3, 5, 8, 11, 15, 21, 32, 48, 68, 82, 61, 38, 25, 18, 14, 11, 9, 8, 7, 6, 8, 15, 30, 57, 76, 49, 24, 13, 8, 5].map((height, index) => (
          <i className="preview-bar" key={index} style={{ "--bar-height": `${height}%`, "--bar-index": index } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}

export default function PhenomenaHome() {
  const [language, setLanguage] = usePhenomenaLanguage();
  const [activeLab, setActiveLab] = useState<LabId | null>(null);
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

  const activateFromPointer = (event: PointerEvent<HTMLElement>, id: LabId) => {
    if (event.pointerType === "mouse" || event.pointerType === "pen" || event.pointerType === "touch") {
      setActiveLab(id);
    }
  };

  return (
    <div className="phenomena-app phenomena-home home-index">
      <a className="skip-link" href="#labs">{translate(language, "Labを選ぶ", "Skip to labs")}</a>
      <header className="phenomena-header">
        <Link className="phenomena-wordmark" href="/" aria-label="Phenomena home">
          <span>PHENOMENA</span>
          <small>MAKE THE INVISIBLE TANGIBLE</small>
        </Link>
        <div className="phenomena-current-lab">
          <span>FOUNDATION v1</span>
          <strong>{translate(language, "4つの観察装置", "Four instruments")}</strong>
        </div>
        <div className="phenomena-header-actions">
          <nav className="phenomena-nav" aria-label={translate(language, "ページ内ナビゲーション", "Page navigation")}>
            <a href="#labs">04 LABS</a>
            <Link href="/about">{translate(language, "ABOUT / モデル", "ABOUT / MODELS")}</Link>
          </nav>
          <LanguageToggle language={language} onChange={setLanguage} />
        </div>
      </header>

      <main>
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero__copy">
            <p className="eyebrow">NUCLEAR COLLECTION / 01—04</p>
            <h1 id="home-title">
              <span>{translate(language, "核の世界を、", "See the nuclear world.")}</span>
              <span>{translate(language, "動かして見る。", "Move it. Measure it.")}</span>
            </h1>
            <p>{translate(language, "地図、壊変、検出、パルス。四つの装置から観察を始めます。", "Map, decay, detection, and pulses—start with any of four instruments.")}</p>
          </div>
          <div className="home-hero__status" aria-label={translate(language, "コレクション概要", "Collection status")}>
            <span>COLLECTION 01</span>
            <strong>NUCLEAR / ACTIVE</strong>
            <div><i aria-hidden="true" /> 04 LABS · JA / EN · ON DEVICE</div>
          </div>
          <a className="home-hero__index" href="#labs">
            <span>{translate(language, "装置を選ぶ", "Choose an instrument")}</span>
            <b aria-hidden="true">↓</b>
          </a>
        </section>

        <section className="home-labs" id="labs" aria-labelledby="labs-title">
          <div className="home-section-heading">
            <div>
              <p className="eyebrow">SELECT A LAB</p>
              <h2 id="labs-title">{translate(language, "何を観察しますか？", "What will you observe?")}</h2>
            </div>
            <p>{translate(language, "カードに触れると装置が反応します。", "Hover, focus, or tap to wake an instrument.")}</p>
          </div>

          <div className="home-lab-grid">
            {LAB_REGISTRY.map((lab) => {
              const copy = labCardCopy[lab.id];
              const isActive = activeLab === lab.id;
              return (
                <article
                  className={`home-lab-card home-lab-card--${lab.id}${isActive ? " is-active" : ""}`}
                  key={lab.id}
                  onPointerEnter={(event) => activateFromPointer(event, lab.id)}
                  onPointerDown={(event) => activateFromPointer(event, lab.id)}
                  onFocusCapture={() => setActiveLab(lab.id)}
                >
                  <div className="home-lab-card__head">
                    <span>LAB {lab.labNumber}</span>
                    <span>{localize(language, lab.discipline)}</span>
                  </div>
                  <figure className="home-lab-card__preview">
                    <LabPreview id={lab.id} />
                    <figcaption className="home-lab-card__readout">
                      <i aria-hidden="true" />
                      {translate(language, copy.readout.ja, copy.readout.en)}
                    </figcaption>
                    <button
                      className="home-lab-card__preview-trigger"
                      type="button"
                      aria-label={`${localize(language, lab.title)} — ${translate(language, "プレビューを起動", "Wake preview")}`}
                      onFocus={() => setActiveLab(lab.id)}
                      onClick={() => setActiveLab(lab.id)}
                    />
                  </figure>
                  <div className="home-lab-card__body">
                    <h3>{localize(language, lab.title)}</h3>
                    <p>{translate(language, copy.purpose.ja, copy.purpose.en)}</p>
                    <div className="home-lab-card__time">
                      <span>{translate(language, "観察時間", "OBSERVATION")}</span>
                      <strong>{copy.time}</strong>
                    </div>
                  </div>
                  <Link
                    className="home-lab-card__action"
                    href={labPath(lab)}
                    aria-label={`${localize(language, lab.title)} — ${translate(language, "Labを開く", "Open lab")}`}
                  >
                    <span>{translate(language, "Labを開く", "OPEN LAB")}</span>
                    <b aria-hidden="true">↗</b>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="phenomena-footer">
        <div><strong>PHENOMENA</strong><span>FOUNDATION v1 / 2026</span></div>
        <p>{translate(language, "式、出典、仮定、安全上の境界はAboutに集約しています。", "Equations, sources, assumptions, and safety boundaries live in About.")}</p>
        <Link href="/about">{translate(language, "モデルを確認", "Inspect the models")} <span aria-hidden="true">→</span></Link>
      </footer>
    </div>
  );
}
