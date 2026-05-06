import os
import uuid
import re
import fitz  # PyMuPDF
import tempfile
import traceback
from flask import Flask, request, jsonify
from PIL import Image

# --- 1. ENVIRONMENT SETUP ---
temp_dir = tempfile.gettempdir()

# Redirect ALL AI hidden folders to /tmp
os.environ['HOME'] = temp_dir 
os.environ['PADDLE_HOME'] = os.path.join(temp_dir, ".paddleocr")
os.environ['PADDLEX_HOME'] = os.path.join(temp_dir, ".paddlex")
os.environ['XDG_CACHE_HOME'] = os.path.join(temp_dir, ".cache")

os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'

app = Flask(__name__)

# --- 2. THE SAFETY NET ---
# We start with the engine OFF. This guarantees the server boots perfectly instantly.
ocr_engine = None

def parse_id_fields(text_lines: list[str]) -> dict:
    full_text = " ".join(text_lines)
    fields = {}

    id_match = re.search(r"\b(\d{2,4}[\s\-]+\d{3,5})\b", full_text)
    if id_match: fields["id_number"] = id_match.group(1).replace(" ", "-").strip()

    specific_clinic_pattern = re.compile(r"\b(NURSE|DOCTOR|PHYSICIAN)\b", re.IGNORECASE)
    specific_acad_pattern = re.compile(r"\b(LECTURER|PROFESSOR|INSTRUCTOR|ADMINISTRATOR|LIBRARIAN)\b", re.IGNORECASE)
    student_pattern = re.compile(r"\b(STUDENT|BSIT|BSIS|BSBA|BSED|BSCS|COURSE|ENROLLMENT)\b", re.IGNORECASE)
    generic_emp_pattern = re.compile(r"\b(EMPLOYEE|STAFF|FACULTY)\b", re.IGNORECASE)

    clc_match = specific_clinic_pattern.search(full_text)
    acad_match = specific_acad_pattern.search(full_text)
    stu_match = student_pattern.search(full_text)
    gen_emp_match = generic_emp_pattern.search(full_text)

    if clc_match: fields["id_type"] = "Employee ID"; fields["role"] = clc_match.group(1).title()
    elif acad_match: fields["id_type"] = "Employee ID"; fields["role"] = acad_match.group(1).title()
    elif stu_match: fields["id_type"] = "Student ID"; fields["role"] = "Student"
    elif gen_emp_match: fields["id_type"] = "Employee ID"; fields["role"] = "Employee"
    else: fields["id_type"] = "Unknown"; fields["role"] = "Unknown"

    name_match = re.search(r"([A-Z]{2,}(?:\s+[A-Z]{2,})*,\s+[A-Z][A-Z\s\.]+)", full_text)
    if name_match: fields["name"] = name_match.group(1).strip()

    inst_pattern = re.compile(r"((?:PAMANTASAN|UNIVERSITY|COLLEGE)[^\n,]{3,60})", re.IGNORECASE)
    inst_match = inst_pattern.search(full_text)
    if inst_match: fields["institution"] = inst_match.group(1).strip()

    return fields


@app.route("/ocr", methods=["POST"])
def perform_ocr():
    global ocr_engine
    # flush=True forces the log to appear in Google Cloud instantly
    print(">>> Request Received", flush=True)

    try:
        # --- THE LAZY LOAD ---
        # We only turn the AI on when you actually click the Register button
        if ocr_engine is None:
            print(">>> Importing Paddle Libraries...", flush=True)
            from paddleocr import PaddleOCR
            
            print(">>> Initializing AI Models (This may take 40s)...", flush=True)
            ocr_engine = PaddleOCR(use_angle_cls=True, lang="en", enable_mkldnn=False)
            
            print(">>> AI Engine Ready!", flush=True)

        if 'image' not in request.files:
            return jsonify({"error": "Missing 'image' key"}), 400

        file = request.files['image']
        filename = file.filename.lower()
        temp_path = os.path.join(temp_dir, f"scan_{uuid.uuid4().hex}.jpg")

        if filename.endswith('.pdf'):
            print("[LOG] Processing PDF...", flush=True)
            doc = fitz.open(stream=file.read(), filetype="pdf")
            page = doc.load_page(0)
            pix = page.get_pixmap()
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            img.save(temp_path)
            doc.close()
        else:
            print("[LOG] Processing Image...", flush=True)
            img = Image.open(file.stream).convert("RGB")
            img.save(temp_path)

        print("[LOG] Starting OCR Scan...", flush=True)
        result = ocr_engine.ocr(temp_path) 
        print("[LOG] Scan Complete.", flush=True)

        text_lines = []
        if result and result[0]:
            for line in result:
                for word_info in line:
                    text_lines.append(word_info[1][0])

        structured = parse_id_fields(text_lines)

        if os.path.exists(temp_path):
            os.remove(temp_path)

        return jsonify({
            "success": True,
            "file_type": "pdf" if filename.endswith('.pdf') else "image",
            "raw_text": " ".join(text_lines),
            "parsed": structured
        })

    except Exception as e:
        error_msg = traceback.format_exc()
        print(f"[FATAL CRASH] {error_msg}", flush=True)
        # This sends the error back to your frontend/Node.js so you can see it!
        return jsonify({"success": False, "error": str(e), "trace": error_msg}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=False)