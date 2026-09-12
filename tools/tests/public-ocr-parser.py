import importlib.util
import os
import unittest
from pathlib import Path
root = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("public_ocr", root / "tools/ocr/ocr_invoice.py")
ocr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ocr)
class OCRParserTests(unittest.TestCase):
    def tearDown(self):
        os.environ.pop("KSESSION_OCR_BUYER_NAME", None)
    def test_configured_buyer_is_recognized_text_not_invented(self):
        os.environ["KSESSION_OCR_BUYER_NAME"] = "合成购买方有限公司"
        result=ocr.extract_invoice_fields(["合成销售方有限公司", "合成购买方有限公司", "发票号码：90000000000000000001", "开票日期：2026年09月11日", "（小写）¥512.00"])
        self.assertEqual(result["buyerName"],"合成购买方有限公司")
        self.assertEqual(result["sellerName"],"合成销售方有限公司")
        self.assertEqual(result["invoiceNo"],"90000000000000000001")
        self.assertEqual(result["invoiceDate"],"2026-09-11")
        self.assertEqual(result["amount"],512)
        self.assertNotIn("inputPath",result)
    def test_absent_buyer_is_not_fabricated_from_config(self):
        os.environ["KSESSION_OCR_BUYER_NAME"]="不存在的购买方有限公司"
        result=ocr.extract_invoice_fields(["合成销售方有限公司"])
        self.assertNotEqual(result["buyerName"],os.environ["KSESSION_OCR_BUYER_NAME"])
    def test_empty_text_does_not_supply_private_defaults(self):
        r=ocr.extract_invoice_fields([])
        for k in ["buyerName","sellerName","amount","invoiceNo","invoiceDate"]:
            self.assertIsNone(r[k],k)
    def test_bank_and_identifiers_are_not_money(self):
        self.assertEqual(ocr.money_candidates_from_line("银行账号1234567890123456789"),[])
        self.assertIsNone(ocr.normalize_amount("1234567890123456789"))
        self.assertIsNone(ocr.normalize_amount("12.345"))
        self.assertEqual(ocr.normalize_amount("1,234.56"),1234.56)
    def test_date_normalization_is_only_extraction(self):
        self.assertEqual(ocr.normalize_date("2026年9月1日"),"2026-09-01")
        self.assertEqual(ocr.normalize_date("unknown"),"unknown")
    def test_optional_packages_not_needed_for_text_parser(self):
        import sys
        self.assertNotIn("paddleocr",sys.modules)
        self.assertNotIn("pypdfium2",sys.modules)
if __name__=="__main__":
    unittest.main()
