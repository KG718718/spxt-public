import argparse
import json
import os
import re
import sys
import tempfile
from pathlib import Path



try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


def normalize_amount(value):
    if not value:
        return None
    cleaned = str(value).replace(",", "").replace("，", "")
    if not re.fullmatch(r"\d+(?:\.\d{1,2})?", cleaned):
        return None
    integer_digits = cleaned.split(".")[0]
    total_digits = re.sub(r"\D", "", cleaned)
    if len(integer_digits) > 9 or len(total_digits) > 11:
        return None
    try:
        amount = float(cleaned)
        if amount <= 0 or amount > 999999999.99:
            return None
        return amount
    except ValueError:
        return None


def normalize_date(value):
    match = re.search(r"(20\d{2}|19\d{2})[年\-/.](\d{1,2})[月\-/.](\d{1,2})日?", str(value or ""))
    if not match:
        return str(value or "").strip()
    return f"{match.group(1)}-{match.group(2).zfill(2)}-{match.group(3).zfill(2)}"


def is_usable_company_name(value):
    text = str(value or "").strip()
    if not re.search(r"(?:有限责任公司|股份有限公司|有限公司|公司|个体工商户)$", text):
        return False
    return not re.search(r"(?:开户|银行|支行|账号|地址|电话)", text)


def is_likely_business_name(value):
    text = re.sub(r"^名称\s*[:：]\s*", "", str(value or "")).strip()
    if not re.search(r"[\u4e00-\u9fa5]{4,}", text):
        return False
    if re.search(r"(?:统一社会信用代码|纳税人识别号|发票号码|开票日期|项目名称|规格型号|价税合计|开户|银行|账号|地址|电话)", text):
        return False
    if re.fullmatch(r"[A-Z0-9]{8,}", text):
        return False
    if re.search(r"[￥¥]|\d{4}年|%", text):
        return False
    return True


def find_seller_near_buyer(lines, buyer_name):
    if not buyer_name:
        return None
    buyer_index = next((index for index, line in enumerate(lines) if buyer_name in line), -1)
    if buyer_index < 0:
        return None
    for line in lines[buyer_index + 1:buyer_index + 8]:
        cleaned_line = re.sub(r"^名称\s*[:：]\s*", "", line).strip()
        if cleaned_line == buyer_name:
            continue
        if is_likely_business_name(cleaned_line):
            return cleaned_line
    return None


BAD_AMOUNT_LINE_KEYWORDS = (
    "年", "月", "日", "号码", "账号", "地址", "电话", "税号", "识别号",
    "开户", "银行", "身份证", "证件",
)


def money_candidates_from_line(line):
    text = str(line or "").strip()
    if not text:
        return []
    if re.search(r"[A-Za-z]", text) or "%" in text:
        return []
    if any(keyword in text for keyword in BAD_AMOUNT_LINE_KEYWORDS):
        return []
    if re.search(r"\d{3,}\.\d{3,}", text):
        return []
    values = [
        normalize_amount(match.group(0))
        for match in re.finditer(r"\d+(?:[,，]\d{3})*(?:\.\d{1,2})?", text)
    ]
    return [value for value in values if value and value > 0]


def extract_amount_from_small_total_zone(lines):
    normalized_lines = [str(line).strip() for line in lines if str(line).strip()]
    for index, line in enumerate(normalized_lines):
        compact_line = re.sub(r"\s+", "", line)
        if "小写" not in compact_line:
            continue

        candidates = []
        for candidate_line in normalized_lines[index:index + 36]:
            candidates.extend(money_candidates_from_line(candidate_line))
        if candidates:
            return max(candidates)
    return None


def extract_invoice_fields(texts):
    lines = [str(line).strip() for line in texts if str(line).strip()]
    joined = "\n".join(lines)
    compact = re.sub(r"\s+", "", joined)

    invoice_no = None
    match = re.search(r"发票号码[:：]?\s*([0-9A-Z]{8,32})", joined, re.I)
    if match:
        invoice_no = match.group(1)
    if not invoice_no:
        match = re.search(r"\b\d{20}\b", joined)
        if match:
            invoice_no = match.group(0)

    invoice_date = None
    match = re.search(r"开票日期[:：]?\s*((?:20\d{2}|19\d{2})[年\-/.]\d{1,2}[月\-/.]\d{1,2}日?)", joined)
    if match:
        invoice_date = normalize_date(match.group(1))
    if not invoice_date:
        match = re.search(r"(?:20\d{2}|19\d{2})[年\-/.]\d{1,2}[月\-/.]\d{1,2}日?", joined)
        if match:
            invoice_date = normalize_date(match.group(0))

    company_matches = []
    for match in re.finditer(r"[\u4e00-\u9fa5A-Za-z0-9（）()·\-]{2,}(?:有限责任公司|股份有限公司|有限公司|公司|个体工商户)", joined):
        name = match.group(0).strip()
        if name and is_usable_company_name(name) and name not in company_matches:
            company_matches.append(name)

    configured_buyer = os.environ.get("KSESSION_OCR_BUYER_NAME", "").strip()
    buyer_name = next((name for name in company_matches if configured_buyer and re.sub(r"\s+", "", name) == re.sub(r"\s+", "", configured_buyer)), None)
    if not buyer_name and company_matches:
        buyer_name = company_matches[0]
    seller_name = next((name for name in company_matches if name != buyer_name), None)
    if not seller_name:
        seller_name = find_seller_near_buyer(lines, buyer_name)

    amount = extract_amount_from_small_total_zone(lines)
    if amount is None:
        money_values = [
            normalize_amount(value)
            for value in re.findall(r"[￥¥]\s*([0-9]+(?:[,，][0-9]{3})*(?:\.[0-9]{1,2})?)", joined)
        ]
        money_values = [value for value in money_values if value and value > 0]
        if money_values:
            amount = max(money_values)
    if amount is None:
        match = re.search(r"[（(]?小写[)）]?[￥¥]?([0-9]+(?:[,，][0-9]{3})*(?:\.[0-9]{1,2})?)", compact)
        if match:
            amount = normalize_amount(match.group(1))

    invoice_type = next((line for line in lines if "发票" in line), "发票")

    return {
        "invoiceNo": invoice_no,
        "invoiceType": invoice_type,
        "invoiceDate": invoice_date,
        "buyerName": buyer_name,
        "sellerName": seller_name,
        "amount": amount,
        "rawText": joined,
        "rawLines": lines,
    }


def render_pdf_pages(input_path, output_dir):
    import pypdfium2 as pdfium
    pdf = pdfium.PdfDocument(str(input_path))
    if len(pdf) > 50:
        raise ValueError("OCR supports at most 50 pages per file; split the file before retrying.")
    image_paths = []
    for index in range(len(pdf)):
        page = pdf[index]
        bitmap = page.render(scale=2.5)
        image = bitmap.to_pil()
        image_path = output_dir / f"page-{index + 1}.png"
        image.save(image_path)
        image_paths.append(image_path)
    return image_paths


def run_ocr(input_path):
    from paddleocr import PaddleOCR
    ocr = PaddleOCR(
        lang="ch",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )
    texts = []
    work_dir = Path(os.environ.get("KSESSION_OCR_WORK_DIR") or Path(__file__).resolve().parents[2] / "runtime" / "ocr-work")
    work_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="k-session-ocr-", dir=work_dir) as tmp:
        input_paths = [input_path]
        if input_path.suffix.lower() == ".pdf":
            input_paths = render_pdf_pages(input_path, Path(tmp))

        for image_path in input_paths:
            results = ocr.predict(str(image_path))
            for result in results:
                texts.extend(result.get("rec_texts", []))
    return extract_invoice_fields(texts)


def main():
    parser = argparse.ArgumentParser(description="Run local OCR on a Chinese invoice PDF or image.")
    parser.add_argument("input", help="Path to invoice PDF/image")
    parser.add_argument("--out", help="Optional JSON output path")
    args = parser.parse_args()

    input_path = Path(args.input)
    parsed = run_ocr(input_path)

    output = json.dumps(parsed, ensure_ascii=False, indent=2)
    print(output)

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(output, encoding="utf-8")


if __name__ == "__main__":
    main()
