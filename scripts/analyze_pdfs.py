#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

import fitz
import pytesseract
from PIL import Image


FULLWIDTH_TABLE = str.maketrans("０１２３４５６７８９", "0123456789")
QUESTION_PATTERN = re.compile(r"［問\s*(\d+)］")
PAGE_LABEL_PATTERN = re.compile(r"^丙－\d+$")


@dataclass
class PageResult:
  page_number: int
  method: str
  text: str


def normalize_text(value: str) -> str:
  return value.translate(FULLWIDTH_TABLE)


def extract_page_text(page: fitz.Page) -> PageResult:
  text = page.get_text("text").strip()
  if len(text) >= 40 or "［問" in text or "解 答" in text:
    return PageResult(page.number + 1, "text", text)

  pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
  image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
  text = pytesseract.image_to_string(image, lang="jpn+eng", config="--psm 6").strip()
  return PageResult(page.number + 1, "ocr", text)


def detect_sections(page_results: List[PageResult]) -> Dict[str, List[int]]:
  current_section = "未分類"
  sections: Dict[str, List[int]] = {}

  for page_result in page_results:
    for raw_line in page_result.text.splitlines():
      line = raw_line.strip()
      if not line or PAGE_LABEL_PATTERN.match(line):
        continue
      if line.startswith("［問"):
        match = QUESTION_PATTERN.search(line)
        if match:
          sections.setdefault(current_section, []).append(int(match.group(1)))
        continue
      if "危険物に関する法令" in line:
        current_section = "危険物に関する法令"
      elif "燃焼及び消火に関する基礎知識" in line:
        current_section = "燃焼及び消火に関する基礎知識"
      elif "危険物の性質並びにその火災予防及び消火の方法" in line:
        current_section = "危険物の性質並びにその火災予防及び消火の方法"

  return sections


def extract_answers(last_page_text: str) -> Dict[int, int]:
  tokens = re.findall(r"\d+", normalize_text(last_page_text))
  start_index = 0
  for index in range(len(tokens) - 1):
    if tokens[index] == "1" and tokens[index + 1] in {"1", "2", "3", "4"}:
      start_index = index
      break

  answers: Dict[int, int] = {}
  for index in range(start_index, len(tokens) - 1, 2):
    question_number = int(tokens[index])
    answer = int(tokens[index + 1])
    if 1 <= question_number <= 99 and 1 <= answer <= 4:
      answers[question_number] = answer
  return answers


def analyze_pdf(pdf_path: Path) -> dict:
  document = fitz.open(pdf_path)
  page_results = [extract_page_text(document.load_page(i)) for i in range(document.page_count)]
  full_text = "\n\n".join(page_result.text for page_result in page_results)
  question_numbers = sorted({int(number) for number in QUESTION_PATTERN.findall(full_text)})
  sections = detect_sections(page_results)
  answers = extract_answers(page_results[-1].text if page_results else "")
  methods = Counter(page_result.method for page_result in page_results)

  return {
    "id": pdf_path.stem,
    "file": str(pdf_path),
    "title": "危険物取扱者試験 丙種",
    "pageCount": document.page_count,
    "questionCount": len(question_numbers),
    "answerCount": len(answers),
    "questionNumbers": question_numbers,
    "answerNumbers": sorted(answers.keys()),
    "sections": [
      {"name": name, "questionNumbers": numbers, "count": len(numbers)}
      for name, numbers in sections.items()
    ],
    "extraction": {
      "textPages": methods.get("text", 0),
      "ocrPages": methods.get("ocr", 0),
      "fallbackEnabled": True
    }
  }


def build_report(pdf_dir: Path) -> dict:
  pdf_files = sorted(pdf_dir.glob("*.pdf"))
  return {
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "directory": str(pdf_dir),
    "sourceCount": len(pdf_files),
    "sources": [analyze_pdf(pdf_path) for pdf_path in pdf_files]
  }


def main() -> None:
  parser = argparse.ArgumentParser(description="Analyze local PDF exams with OCR fallback.")
  parser.add_argument("--pdf-dir", default="pdf", help="Directory that contains source PDFs")
  parser.add_argument("--out", help="Optional JSON output path")
  args = parser.parse_args()

  report = build_report(Path(args.pdf_dir))
  payload = json.dumps(report, ensure_ascii=False, indent=2)
  if args.out:
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(payload, encoding="utf-8")
  print(payload)


if __name__ == "__main__":
  main()
