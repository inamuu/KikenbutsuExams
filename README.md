# 危険物丙種トレーナー

危険物取扱者丙種の学習用に、手元の公開問題 PDF を解析して論点だけを再構成した、解説付きの静的サイトです。公開元 PDF の問題文は二次利用制限を考慮し、サイトには掲載していません。

## 構成

- `pdf/`: ローカルで解析する元 PDF 置き場。Git には含めません。
- `scripts/analyze_pdfs.py`: PyMuPDF + Tesseract OCR フォールバックで PDF の問題数・解答数・分野を集計します。
- `data/`: 公開用に再構成した問題データと解析サマリです。
- `src/`: 静的サイトのテンプレートです。
- `dist/`: `npm run build` で生成される配布物です。

## セットアップ

1. PDF を `pdf/` に置きます。
2. OCR 用の仮想環境を作ります。

```bash
python3 -m venv .venv
.venv/bin/python -m pip install pymupdf pillow rapidfuzz pytesseract
```

3. PDF を解析します。

```bash
npm run analyze:pdf
```

4. サイトを生成します。

```bash
npm run build
```

## デプロイ

`main` ブランチへ push すると GitHub Actions が `dist/` をビルドし、GitHub Pages へデプロイします。

## 補足

- 2026-03-13 時点で、追加の丙種過去問 PDF は公開再利用しやすい形では確認できませんでした。
- 現状の公開用セットは、手元の `kikenbutsu_hei.pdf` から確認した 25 論点をもとにしたオリジナル問題です。

