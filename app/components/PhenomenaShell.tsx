"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { clearExperimentState, loadExperimentState, saveExperimentState, translate } from "../lib/experiment";
import { LAB_REGISTRY, labPath, localize, type LabManifest, type Language } from "../lib/labs";

const LANGUAGE_KEY = "phenomena-language";

export function usePhenomenaLanguage(): [Language, (next: Language) => void] {
  const [language, setLanguage] = useState<Language>("ja");

  useEffect(() => {
    let timer: number | undefined;
    try {
      const saved = window.localStorage.getItem(LANGUAGE_KEY);
      if (saved === "ja" || saved === "en") {
        timer = window.setTimeout(() => setLanguage(saved), 0);
      }
    } catch {
      // Language still works for the current visit when storage is unavailable.
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const update = (next: Language) => {
    setLanguage(next);
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // Persistence is optional.
    }
  };

  return [language, update];
}

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

export function LanguageToggle({ language, onChange }: Readonly<{
  language: Language;
  onChange: (next: Language) => void;
}>) {
  return (
    <div className="phenomena-language-toggle" role="group" aria-label={translate(language, "表示言語", "Display language")}>
      <button type="button" aria-pressed={language === "ja"} onClick={() => onChange("ja")}>日本語</button>
      <button type="button" aria-pressed={language === "en"} onClick={() => onChange("en")}>English</button>
    </div>
  );
}

export function PhenomenaHeader({ language, onLanguageChange, currentLab }: Readonly<{
  language: Language;
  onLanguageChange: (next: Language) => void;
  currentLab?: LabManifest;
}>) {
  return (
    <header className="phenomena-header">
      <Link className="phenomena-wordmark" href="/" aria-label="Phenomena home">
        <span>PHENOMENA</span>
        <small>MAKE THE INVISIBLE TANGIBLE</small>
      </Link>
      <div className="phenomena-current-lab" aria-label={translate(language, "現在のLab", "Current lab")}>
        <span>{currentLab ? `LAB ${currentLab.labNumber}` : "FOUNDATION v1"}</span>
        <strong>{currentLab ? localize(language, currentLab.title) : "Nuclear Collection"}</strong>
      </div>
      <div className="phenomena-header-actions">
        <nav className="phenomena-nav" aria-label={translate(language, "Labナビゲーション", "Lab navigation")}>
          {LAB_REGISTRY.map((lab) => (
            <Link href={labPath(lab)} key={lab.id} className={currentLab?.id === lab.id ? "is-current" : ""} aria-current={currentLab?.id === lab.id ? "page" : undefined}>
              {lab.labNumber} / {localize(language, lab.title)}
            </Link>
          ))}
        </nav>
        <LanguageToggle language={language} onChange={onLanguageChange} />
      </div>
    </header>
  );
}

export function LabMeta({ lab, language }: Readonly<{ lab: LabManifest; language: Language }>) {
  const datasetDisplay = lab.datasets.map((dataset) => localize(language, dataset.display)).join(" / ");
  const datasetDetail = lab.datasets.map((dataset) => dataset.version).join(" / ");
  return (
    <aside className="lab-meta" aria-label={translate(language, "Labメタデータ", "Lab metadata")}>
      <div><span>{translate(language, "分野", "FIELD")}</span><strong>{localize(language, lab.discipline)}</strong></div>
      <div><span>{translate(language, "状態", "STATUS")}</span><strong>Foundation v1</strong></div>
      <div><span>{translate(language, "データ", "DATA")}</span><strong title={datasetDetail}>{datasetDisplay}</strong></div>
    </aside>
  );
}

export function SafetyNote({ lab, language }: Readonly<{ lab: LabManifest; language: Language }>) {
  return (
    <section className="safety-note" aria-labelledby={`${lab.id}-safety-title`}>
      <div>
        <p className="eyebrow">{translate(language, "使用上の境界", "USE BOUNDARY")}</p>
        <h2 id={`${lab.id}-safety-title`}>{translate(language, "教育用の実験器具であり、安全判断の器具ではありません", "An educational instrument, not a safety instrument")}</h2>
      </div>
      <div>
        {lab.safety.map((note) => <p key={note.en}>{localize(language, note)}</p>)}
        {lab.constraints.slice(0, 1).map((note) => <p key={note.en}>{localize(language, note)}</p>)}
      </div>
    </section>
  );
}

export function ModelDisclosure({ lab, language }: Readonly<{ lab: LabManifest; language: Language }>) {
  return (
    <details className="model-disclosure">
      <summary>{translate(language, "モデル、データ、出典、制約を確認", "Inspect model, data, sources, and limits")}</summary>
      <div className="model-disclosure-grid">
        <section>
          <h3>{translate(language, "仮定", "Assumptions")}</h3>
          <ul>{lab.assumptions.map((item) => <li key={item.en}>{localize(language, item)}</li>)}</ul>
        </section>
        <section>
          <h3>{translate(language, "制約", "Constraints")}</h3>
          <ul>{lab.constraints.map((item) => <li key={item.en}>{localize(language, item)}</li>)}</ul>
        </section>
        <section>
          <h3>{translate(language, "データ", "Data")}</h3>
          <ul>{lab.datasets.map((item) => <li key={item.id}><strong>{item.version}</strong><br />{item.sourceHref ? <Link className="provenance-link" href={item.sourceHref} target="_blank" rel="noreferrer">{item.source} <span aria-hidden="true">↗</span><span className="visually-hidden">{translate(language, "（新しいタブで開きます）", " (opens in a new tab)")}</span></Link> : item.source}<br />{item.licenseHref ? <Link className="provenance-link" href={item.licenseHref} target="_blank" rel="noreferrer"><small>{item.license} <span aria-hidden="true">↗</span><span className="visually-hidden">{translate(language, "（新しいタブで開きます）", " (opens in a new tab)")}</span></small></Link> : <small>{item.license}</small>}</li>)}</ul>
        </section>
        <section>
          <h3>{translate(language, "引用とライセンス", "Citations and licenses")}</h3>
          <ul>{[...lab.citations, ...lab.licenses].map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>
    </details>
  );
}

export function LabStateTools<T>({ lab, language, state, onRestore, restoreOnMount = true }: Readonly<{
  lab: LabManifest;
  language: Language;
  state: T;
  onRestore: (next: T) => void;
  restoreOnMount?: boolean;
}>) {
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [stateStatus, setStateStatus] = useState("");
  const restoreRef = useRef(onRestore);
  const restoredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    restoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    if (!restoreOnMount || restoredKeyRef.current === lab.stateKey) return;
    restoredKeyRef.current = lab.stateKey;
    let timer: number | undefined;
    const saved = loadExperimentState<T>(lab.stateKey);
    if (saved) {
      timer = window.setTimeout(() => {
        restoreRef.current(saved.state);
        setSavedAt(saved.savedAt);
      }, 0);
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [lab.stateKey, restoreOnMount]);

  return (
    <div className="lab-state-tools" role="group" aria-label={translate(language, "実験状態", "Experiment state")}>
      <button type="button" onClick={() => {
        const saved = saveExperimentState(lab.stateKey, state);
        setSavedAt(saved?.savedAt ?? null);
        setStateStatus(saved
          ? translate(language, "状態を保存しました。", "Experiment state saved.")
          : translate(language, "状態を保存できませんでした。", "Experiment state could not be saved."));
      }}>
        {translate(language, "状態を保存", "Save state")}
      </button>
      <button type="button" onClick={() => {
        clearExperimentState(lab.stateKey);
        setSavedAt(null);
        setStateStatus(translate(language, "保存状態を消去しました。", "Saved experiment state cleared."));
      }}>
        {translate(language, "保存を消去", "Clear saved state")}
      </button>
      <p className="visually-hidden" role="status" aria-atomic="true">{stateStatus}</p>
      {savedAt ? <small>{translate(language, "保存済み", "Saved")} {new Date(savedAt).toLocaleString(language === "ja" ? "ja-JP" : "en-US")}</small> : null}
    </div>
  );
}

export function LabLayout({ lab, language, onLanguageChange, children }: Readonly<{
  lab: LabManifest;
  language: Language;
  onLanguageChange: (next: Language) => void;
  children: ReactNode;
}>) {
  return (
    <div className="phenomena-app">
      <a className="skip-link" href="#lab-main">{translate(language, "本文へ移動", "Skip to lab content")}</a>
      <PhenomenaHeader language={language} onLanguageChange={onLanguageChange} currentLab={lab} />
      <main id="lab-main" tabIndex={-1}>
        <section className="lab-hero">
          <div className="lab-hero-index"><span>LAB</span><strong>{lab.labNumber}</strong><small>{localize(language, lab.collection)}</small></div>
          <div className="lab-hero-copy">
            <p className="eyebrow">{localize(language, lab.discipline)}</p>
            <h1>{localize(language, lab.title)}</h1>
            <p className="lab-hero-summary">{localize(language, lab.summary)}</p>
            <p className="lab-hero-description">{localize(language, lab.description)}</p>
          </div>
          <aside className="lab-hero-context">
            <div className="lab-hero-mode">
              <span>OBSERVATION MODE</span>
              <strong>{translate(language, "操作可能な教育モデル", "Interactive teaching model")}</strong>
            </div>
            <LabMeta lab={lab} language={language} />
          </aside>
        </section>
        {children}
        <ModelDisclosure lab={lab} language={language} />
        <SafetyNote lab={lab} language={language} />
      </main>
      <footer className="phenomena-footer">
        <div><strong>PHENOMENA</strong><span>FOUNDATION v1 / NUCLEAR COLLECTION</span></div>
        <p>{translate(language, "端末内で動く、小さく検証できる科学の実験器具。", "Small, inspectable scientific instruments that run on your device.")}</p>
        <Link href="/">{translate(language, "Labカタログへ", "Back to Lab catalogue")} →</Link>
      </footer>
    </div>
  );
}
