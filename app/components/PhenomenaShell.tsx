"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { LAB_REGISTRY, labPath, localized, type LabManifest, type Language } from "../lib/labs";
import { clearExperimentState, loadExperimentState, saveExperimentState, translate } from "../lib/experiment";

const LANGUAGE_KEY = "phenomena-language";

export function usePhenomenaLanguage(): [Language, (next: Language) => void] {
  const [language, setLanguage] = useState<Language>("ja");
  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_KEY);
    if (stored === "ja" || stored === "en") {
      window.setTimeout(() => setLanguage(stored), 0);
    }
  }, []);
  const update = (next: Language) => {
    setLanguage(next);
    window.localStorage.setItem(LANGUAGE_KEY, next);
    document.documentElement.lang = next;
  };
  return [language, update];
}

export function LanguageToggle({ language, onChange }: { language: Language; onChange: (next: Language) => void }) {
  return (
    <div className="phenomena-language-toggle" role="group" aria-label={translate(language, "表示言語", "Display language")}>
      <button type="button" aria-pressed={language === "ja"} onClick={() => onChange("ja")}>日本語</button>
      <button type="button" aria-pressed={language === "en"} onClick={() => onChange("en")}>English</button>
    </div>
  );
}

export function PhenomenaHeader({ language, onChange, currentLab }: { language: Language; onChange: (next: Language) => void; currentLab?: LabManifest }) {
  return (
    <header className="phenomena-header">
      <Link className="phenomena-wordmark" href="/" aria-label="Phenomena home">
        <span>PHENOMENA</span>
        <small>MAKE THE INVISIBLE TANGIBLE</small>
      </Link>
      {currentLab ? (
        <div className="phenomena-current-lab" aria-label={translate(language, "現在のLab", "Current lab")}>
          <span>LAB {currentLab.labNumber}</span>
          <strong>{localized(language, currentLab.title)}</strong>
        </div>
      ) : (
        <div className="phenomena-current-lab">
          <span>FOUNDATION / 2026</span>
          <strong>{translate(language, "Nuclear Collection", "Nuclear Collection")}</strong>
        </div>
      )}
      <div className="phenomena-header-actions">
        <nav className="phenomena-nav" aria-label={translate(language, "Labナビゲーション", "Lab navigation")}>
          {LAB_REGISTRY.map((lab) => (
            <Link href={labPath(lab)} key={lab.id} className={currentLab?.id === lab.id ? "is-current" : ""}>
              {lab.labNumber} / {localized(language, lab.title)}
            </Link>
          ))}
        </nav>
        <LanguageToggle language={language} onChange={onChange} />
      </div>
    </header>
  );
}

export function LabMeta({ lab, language }: { lab: LabManifest; language: Language }) {
  return (
    <aside className="lab-meta" aria-label={translate(language, "Labのメタデータ", "Lab metadata")}>
      <div>
        <span>{translate(language, "分野", "FIELD")}</span>
        <strong>{localized(language, lab.discipline)}</strong>
      </div>
      <div>
        <span>{translate(language, "状態", "STATUS")}</span>
        <strong>{translate(language, "Foundation v1", "Foundation v1")}</strong>
      </div>
      <div>
        <span>{translate(language, "データ", "DATA")}</span>
        <strong>{lab.datasets.map((dataset) => dataset.version).join(" / ")}</strong>
      </div>
    </aside>
  );
}

export function SafetyNote({ lab, language }: { lab: LabManifest; language: Language }) {
  return (
    <section className="safety-note" aria-labelledby={`${lab.id}-safety-title`}>
      <div>
        <p className="eyebrow">{translate(language, "使用上の注意", "USE NOTE")}</p>
        <h2 id={`${lab.id}-safety-title`}>{translate(language, "これは教育用の観測装置です", "An educational instrument, not a safety instrument")}</h2>
      </div>
      <div>
        {lab.safety.map((note) => <p key={`${note.ja}-${note.en}`}>{localized(language, note)}</p>)}
        {lab.constraints.slice(0, 1).map((note) => <p key={`${note.ja}-${note.en}`}>{localized(language, note)}</p>)}
      </div>
    </section>
  );
}

export function LabStateTools<T>({ labId, language, state, onRestore, fallback }: { labId: string; language: Language; state: T; onRestore: (state: T) => void; fallback: T }) {
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => {
    const saved = loadExperimentState<T>(labId);
    if (saved) {
      onRestore(saved.state);
      window.setTimeout(() => setSavedAt(saved.savedAt), 0);
    }
  // Restoring once on mount is intentional; lab controls own subsequent state updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labId]);
  return (
    <div className="lab-state-tools" aria-label={translate(language, "実験状態", "Experiment state")}>
      <button type="button" onClick={() => { const saved = saveExperimentState(labId, state); setSavedAt(saved?.savedAt ?? null); }}>
        {translate(language, "状態を保存", "Save state")}
      </button>
      <button type="button" onClick={() => { clearExperimentState(labId); onRestore(fallback); setSavedAt(null); }}>
        {translate(language, "保存を消去", "Clear saved state")}
      </button>
      {savedAt ? <small>{translate(language, "保存済み", "Saved")} {new Date(savedAt).toLocaleString(language === "ja" ? "ja-JP" : "en-US")}</small> : null}
    </div>
  );
}

export function LabLayout({ lab, language, onLanguageChange, children }: { lab: LabManifest; language: Language; onLanguageChange: (next: Language) => void; children: ReactNode }) {
  return (
    <div className="phenomena-app">
      <PhenomenaHeader language={language} onChange={onLanguageChange} currentLab={lab} />
      <main>
        <section className="lab-hero">
          <div className="lab-hero-index"><span>LAB</span><strong>{lab.labNumber}</strong><small>{localized(language, lab.collection)}</small></div>
          <div>
            <p className="eyebrow">{localized(language, lab.discipline)}</p>
            <h1>{localized(language, lab.title)}</h1>
            <p className="lab-hero-summary">{localized(language, lab.summary)}</p>
            <p className="lab-hero-description">{localized(language, lab.description)}</p>
          </div>
          <LabMeta lab={lab} language={language} />
        </section>
        {children}
      </main>
      <footer className="phenomena-footer">
        <div><strong>PHENOMENA</strong><span>FOUNDATION v1 / NUCLEAR COLLECTION</span></div>
        <p>{translate(language, "端末内で動作する、検証可能な科学の小さな道具。", "Small, inspectable scientific instruments that run on your device.")}</p>
        <Link href="/">{translate(language, "Labカタログへ", "Back to Lab catalogue")} ↗</Link>
      </footer>
    </div>
  );
}
