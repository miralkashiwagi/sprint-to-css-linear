# Figma Spring → linear() ジェネレーター

Figmaのプロトタイプ用スプリングイージングを、CSSの `linear()` イージングとして使いやすい形に近似変換するPreact/Viteプロジェクトです。

## 起動方法

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
npm run preview
```

## 主な機能

- Mass / Stiffness / Damping / Duration / Samples の調整
- オーバーシュート抑制トグル
- プリセット切り替え
- `linear(...)` コード生成
- CSS使用例の表示
- プレビューアニメーション
- イージング曲線グラフ

## 注意

Figma内部のスプリング実装を完全に複製するものではなく、物理スプリング式をサンプリングして `linear()` に近似するジェネレーターです。
