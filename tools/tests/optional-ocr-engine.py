"""Hosted optional OCR engine smoke: generated invoice, never real business material."""
import json
import os
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

if os.environ.get("GITHUB_ACTIONS") != "true":
    raise SystemExit("This acceptance test is hosted-only.")
root = Path(__file__).resolve().parents[2]
evidence = root / ".test-work" / "ocr-engine-evidence"
evidence.mkdir(parents=True, exist_ok=True)
font_path = next((p for p in [Path("C:/Windows/Fonts/msyh.ttc"), Path("C:/Windows/Fonts/simhei.ttf")] if p.exists()), None)
if font_path is None:
    raise RuntimeError("Chinese font unavailable on hosted runner.")
font = ImageFont.truetype(str(font_path), 42)
im=Image.new("RGB",(1500,1050),"white")
draw=ImageDraw.Draw(im)
lines=["合成测试发票（不用于报销）","发票号码：80000000000000000009","开票日期：2026年09月11日","名称：合成购买方有限公司","名称：合成销售方有限公司","价税合计（小写）：￥123.45"]
for i,line in enumerate(lines):
    draw.text((60,70+i*135),line,font=font,fill="black")
image_path=evidence/"synthetic-invoice.png"
im.save(image_path)
env={**os.environ,"KSESSION_OCR_BUYER_NAME":"合成购买方有限公司","KSESSION_OCR_WORK_DIR":str(evidence/"temporary"),"PYTHONIOENCODING":"utf-8","PYTHONDONTWRITEBYTECODE":"1"}
result=subprocess.run([sys.executable,str(root/"tools/ocr/ocr_invoice.py"),str(image_path)],capture_output=True,text=True,encoding="utf-8",env=env,timeout=600)
(evidence/"engine-output.txt").write_text(result.stdout+"\n"+result.stderr,encoding="utf-8")
if result.returncode!=0:
    raise RuntimeError("OCR engine failed; inspect hosted engine-output evidence.")
start=result.stdout.find("{")
end=result.stdout.rfind("}")+1
record=json.loads(result.stdout[start:end])
assert record["buyerName"]=="合成购买方有限公司",record
assert record["sellerName"]=="合成销售方有限公司",record
assert record["invoiceNo"]=="80000000000000000009",record
assert record["amount"]==123.45,record
assert record["invoiceDate"]=="2026-09-11",record
assert "inputPath" not in record
(evidence/"report.json").write_text(json.dumps({"synthetic":True,"assertions":6,"result":record},ensure_ascii=False,indent=2),encoding="utf-8")
print("Optional installed OCR actual recognition: 6 passed. Models/runtime are not redistributed.")
