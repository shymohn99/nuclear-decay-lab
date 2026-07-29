# nuclear-decay-lab

An interactive Monte Carlo laboratory for exploring nuclear decay, decay chains, nuclide relationships, and radiation detection in the browser.

[GitHub Pages](https://shymohn99.github.io/nuclear-decay-lab/) · [Repository](https://github.com/shymohn99/nuclear-decay-lab) · [@Shymohn on X](https://x.com/Shymohn)

## English

### About

`nuclear-decay-lab` turns the statistical nature of radioactive decay into an interactive visual experiment. Individual nuclei decay unpredictably, while a large population gradually approaches the familiar exponential decay curve. The site combines this particle-level view with decay-chain diagrams, a nuclide map, charts, and a simplified detector laboratory.

The project is designed for learning and visual exploration. It is not a radiation-safety, medical, dosimetry, or research-grade calculation tool.

### Features

- **Monte Carlo decay simulation** — watch individual nuclei decay probabilistically and compare the observed population with the theoretical curve.
- **Independent nuclides** — quickly start with representative nuclides such as iodine-131, carbon-14, cobalt-60, and polonium-210.
- **Major decay chains** — follow the uranium-238, thorium-232, and uranium-235 series through their principal stages.
- **Two chain timing modes** — preserve real half-life ratios or use a clearly marked observation-friendly timing model.
- **Nuclide map** — pan, zoom, inspect known nuclides, and select implemented nuclides directly from the neutron-number/proton-number map.
- **Nuclide genealogy** — trace ancestors, daughters, and descendants around the selected nuclide.
- **Detector lab** — compare GM, scintillation, and semiconductor detectors while changing source distance, shielding material, shielding thickness, and measurement time.
- **Linear and logarithmic charts** — compare observed and theoretical decay, including long-running simulations.
- **Wide logarithmic speed control** — move from `10⁻¹⁵×` to `10⁶×` without losing fine control near each order of magnitude.
- **Adjustable population** — choose the number of simulated nuclei and restart the experiment at any time.
- **Data tools** — copy the current decay equation and export the observation history as CSV.
- **Responsive, accessible interface** — keyboard-visible focus states, reduced-motion support, and layouts for desktop and mobile.

### How to use

1. **Choose a decay series.** Select “Independent nuclides” for a single isotope, or choose one of the three major natural decay series.
2. **Choose a nuclide.** Use the compact list for representative nuclides, or open the nuclide map to browse the wider catalog.
3. **Select a simulation mode.** Use single-nuclide mode for one decay step, or chain mode to follow successive daughter nuclides.
4. **Choose the chain timing model.** “Physical ratio” is the default and preserves nuclide-specific half-life ratios. “Observation” applies one shared visual timescale so every stage can be seen.
5. **Set the experiment.** Adjust the nucleus count and the logarithmic time multiplier, then pause or reset whenever needed.
6. **Read the results.** Compare the live particle field, decay equation, remaining population, estimated activity, and linear or logarithmic graph.
7. **Try the detector lab.** Change detector type, distance, shield material, shield thickness, and measurement duration to compare count-rate responses.
8. **Export your run.** Copy the displayed equation or download the observed history as a CSV file.

### Chain timing modes

#### Physical ratio — default

Each stage uses its nuclide-specific half-life. The simulation advances all stages on the same physical clock, so very short-lived daughters can pass almost instantly when they follow a parent with a geological half-life. This is the mode to use when relative timescales matter.

#### Observation

Each chain stage uses a shared, modified decay constant. This makes the complete sequence easier to watch, but it intentionally does **not** preserve real half-life ratios. The interface labels this as a non-physical observation mode to avoid confusing it with measured nuclear data.

### Physics model

For a single decay step, the probability that an undecayed nucleus changes during a timestep `Δt` is:

```text
P(decay) = 1 - 2^(-Δt / T½)
```

The theoretical population is:

```text
N(t) = N₀ × 2^(-t / T½)
```

Physical chain mode samples the waiting time for each stage from the exponential distribution associated with that stage’s half-life. Observation mode retains the probabilistic animation while replacing the different stage constants with one shared visual constant.

Nuclide data in the project is based on the bundled ICRP-107 / AME2020 / Nubase2020-derived catalog. The interface focuses on educational readability and may simplify branching paths, emissions, detector response, and shielding.

### Local development

Requirements: Node.js 22.13 or later.

```bash
npm install
npm run dev
```

Open the local address printed in the terminal. Before submitting a change, run:

```bash
npm run lint
npm test
npm run build:pages
```

### Technology

- React 19 and TypeScript
- vinext and Vite
- SVG-based particle, map, and chart rendering
- Cloudflare Workers deployment
- GitHub Pages static build

### Feedback and contributions

Bug reports, scientific corrections, design feedback, translations, and feature proposals are welcome through [GitHub Issues](https://github.com/shymohn99/nuclear-decay-lab/issues). If you submit a pull request, please describe the user-facing change and include the validation commands you ran.

---

## 日本語

### このサイトについて

`nuclear-decay-lab` は、放射性壊変の確率的な性質をブラウザ上で観察できる、インタラクティブなモンテカルロ実験室です。個々の原子核が壊変する瞬間は予測できませんが、多数の原子核を観察すると、残存数は指数関数的な壊変曲線へ近づきます。このサイトでは、その粒子レベルの動きに加えて、放射系列、核種マップ、系譜図、グラフ、簡易的な検出器ラボをまとめて探索できます。

本プロジェクトは学習と可視化を目的としています。放射線安全、医療、線量評価、研究用途の計算には使用しないでください。

### 使える機能

- **モンテカルロ壊変シミュレーション** — 個々の原子核が確率的に壊変する様子と、観測値が理論曲線へ近づく過程を比較できます。
- **単独核種** — ヨウ素131、炭素14、コバルト60、ポロニウム210など、代表的な核種からすぐに実験を始められます。
- **主要な放射系列** — ウラン238系列、トリウム232系列、ウラン235系列の主要段階を追跡できます。
- **2種類の連鎖時間モデル** — 実在の半減期比を保つモードと、アニメーションを観察しやすくするモードを選べます。
- **核種マップ** — 中性子数と陽子数のマップをドラッグ・拡大縮小し、既知の核種を調べたり、実装済み核種を直接選択したりできます。
- **核種の系譜図** — 選択中の核種について、親核種、娘核種、その先の子孫を確認できます。
- **検出器ラボ** — GM計数管、シンチレーション検出器、半導体検出器を切り替え、距離、遮蔽物、厚さ、測定時間による計数率の違いを比べられます。
- **線形・対数グラフ** — 観測値と理論値を比較し、長時間進めたシミュレーションも追跡できます。
- **幅広い対数時間倍率** — `10⁻¹⁵×` から `10⁶×` まで、桁をまたいで操作できます。
- **粒子数の変更** — 実験に使う原子核の数を変更し、いつでも一時停止・リセットできます。
- **データ出力** — 表示中の壊変式をコピーし、観測履歴をCSVとして保存できます。
- **レスポンシブ・アクセシブル設計** — スマートフォン表示、キーボード操作時のフォーカス表示、視差効果を減らす設定に対応しています。

### 使い方

1. **放射系列を選ぶ。** 1種類の核種を試す場合は「単独核種」、連続した壊変を追う場合は3つの主要放射系列から選択します。
2. **核種を選ぶ。** 代表的な核種は一覧から選べます。より多くの核種を探す場合は核種マップを開いてください。
3. **シミュレーション方式を選ぶ。** 1段階の壊変を見る場合は単独モード、娘核種へ連続して移る様子を見る場合は連鎖モードを使います。
4. **連鎖の壊変定数を選ぶ。** 既定の「実時間比」は核種固有の半減期比を保ちます。「観察用」は全段階へ共通の時間尺度を適用します。
5. **実験条件を調整する。** 原子核数と対数時間倍率を変更し、必要に応じて一時停止またはリセットします。
6. **結果を読む。** 粒子表示、壊変式、未壊変数、推定活量、線形・対数グラフを比較します。
7. **検出器ラボを試す。** 検出器、線源との距離、遮蔽物、厚さ、測定時間を変更し、計数率の変化を調べます。
8. **データを保存する。** 壊変式をコピーするか、観測履歴をCSVで書き出します。

### 連鎖の時間モデル

#### 実時間比（既定）

各段階で、その核種固有の半減期を使用します。すべての段階を同じ物理時間で進めるため、地質学的に長い半減期を持つ親核種の直後では、短寿命の娘核種が一瞬で通過する場合があります。系列内の相対的な時間差を重視する場合はこちらを使用してください。

#### 観察用

系列内のすべての段階へ、共通の改変した壊変定数を適用します。連鎖全体をアニメーションとして追いやすくなりますが、現実の半減期比は保たれません。実測データと混同しないよう、画面上でも非物理的な観察モードであることを明示しています。

### 物理モデル

単独核種では、時間刻み `Δt` の間に未壊変の原子核が壊変する確率を次の式で計算します。

```text
P(decay) = 1 - 2^(-Δt / T½)
```

理論上の残存数は次の式です。

```text
N(t) = N₀ × 2^(-t / T½)
```

連鎖の実時間比モードでは、各段階の半減期に対応する指数分布から待ち時間を求めます。観察用モードでは、確率的な挙動を残したまま、段階ごとに異なる壊変定数を共通の視覚用定数へ置き換えます。

核種データには、同梱している ICRP-107 / AME2020 / Nubase2020 由来のカタログを利用しています。教育上の見やすさを優先しているため、分岐、放出粒子、検出器応答、遮蔽計算は簡略化されている場合があります。

### ローカルでの起動

Node.js 22.13 以降が必要です。

```bash
npm install
npm run dev
```

変更内容を提出する前に、次の確認を実行してください。

```bash
npm run lint
npm test
npm run build:pages
```

### 使用技術

- React 19 / TypeScript
- vinext / Vite
- SVGによる粒子・核種マップ・グラフ描画
- Cloudflare Workers
- GitHub Pages向け静的ビルド

### フィードバックとコントリビューション

不具合、科学的な誤り、デザイン改善、翻訳、機能提案は [GitHub Issues](https://github.com/shymohn99/nuclear-decay-lab/issues) で受け付けています。プルリクエストには、ユーザーから見た変更内容と、実行した確認コマンドを記載してください。

### リンク

- [公開サイト](https://nuclear-decay-lab-shymohn.shymohn.chatgpt.site)
- [GitHub Pages](https://shymohn99.github.io/nuclear-decay-lab/)
- [GitHubリポジトリ](https://github.com/shymohn99/nuclear-decay-lab)
- [@Shymohn on X](https://x.com/Shymohn)
