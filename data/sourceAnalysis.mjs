export const sourceAnalysis = {
  generatedAt: "2026-03-13T00:55:00+09:00",
  extractionMethod:
    "PyMuPDF の本文抽出を優先し、文字抽出量が不足するページのみ Tesseract OCR を使う構成で確認。",
  searchCheckedAt: "2026-03-13",
  searchSummary:
    "追加の丙種過去問 PDF は公開再利用しやすい形では確認できず、現状は手元の公開問題 PDF 1 件を解析対象にしている。",
  reusePolicy:
    "消防試験研究センター公開問題は二次利用制限があるため、サイトには問題文そのものを載せず、出題論点を再構成したオリジナル練習問題のみ公開する。",
  sources: [
    {
      id: "kikenbutsu_hei",
      localPath: "pdf/kikenbutsu_hei.pdf",
      title: "危険物取扱者試験 丙種",
      yearLabel: "令和6年度以前 公開問題",
      pageCount: 16,
      questionCount: 25,
      answerCount: 25,
      sections: [
        { name: "危険物に関する法令", count: 10 },
        { name: "燃焼及び消火に関する基礎知識", count: 5 },
        { name: "危険物の性質並びにその火災予防及び消火の方法", count: 10 }
      ],
      verified: true
    }
  ]
};
