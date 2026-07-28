# Decay Lab

原子核が確率的に崩壊する様子と、集団として指数関数的な減衰曲線へ近づく過程を観察できるインタラクティブ・シミュレーターです。

**Live Demo:** https://nuclear-decay-lab-shymohn.shymohn.chatgpt.site

**GitHub Pages:** https://shymohn99.github.io/nuclear-decay-lab/

## Features

- ヨウ素131、炭素14、コバルト60、ポロニウム210を切り替え
- モンテカルロ法による確率的な核崩壊
- α線・β線・γ線に応じた放出エフェクト
- 観測値と理論曲線 `N(t) = N₀ · 2^(-t/T½)` のリアルタイム比較
- 原子核数、時間倍率、一時停止、リセット操作
- スマートフォン表示と `prefers-reduced-motion` に対応

## Physics model

各時間ステップで、未崩壊の原子核に

```text
P(decay) = 1 - 2^(-Δt / T½)
```

の確率を適用しています。一つの原子核が崩壊する時刻は予測できませんが、十分な数を観測すると理論上の指数関数に近づく様子を確認できます。

本作は核崩壊の確率的性質を理解するための教育用可視化です。

## Development

```bash
npm install
npm run dev
```

ビルドとテスト：

```bash
npm run build
npm test
```

## Tech

- React 19
- TypeScript
- vinext / Vite
- Canvas 2D
- Cloudflare Workers
