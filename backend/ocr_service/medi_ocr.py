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

os.environ['FLAGS_use_mkldnn'] = '0'
os.environ['FLAGS_enable_mkldnn'] = '0'

app = Flask(__name__)

ocr_engine = None


def parse_id_fields(text_lines: list[str]) -> dict:
    # Join with space AND newline so multi-line patterns still match
    full_text = " ".join(text_lines)
    
    # ── DEBUG: always print what OCR actually saw ──────────────────────────
    print(f"[DEBUG] raw text_lines: {text_lines}", flush=True)
    print(f"[DEBUG] full_text: {full_text}", flush=True)
    # ──────────────────────────────────────────────────────────────────────

    fields = {}

    # --- ID Number ---
    # Matches: 2023-0149, 23-0149, 2023.0149, 20230149, etc.
    id_match = re.search(r"(\d{2,4})\s*[\-\.\s\_]\s*(\d{4,6})", full_text)
    if id_match:
        fields["id_number"] = f"{id_match.group(1)}-{id_match.group(2)}"
        print(f"[DEBUG] id_number matched: {fields['id_number']}", flush=True)
    else:
        print("[DEBUG] id_number NOT matched", flush=True)

    # --- Role Detection (ordered by priority, most specific first) ---
    # Each entry: (regex_pattern, role_label, id_type)
    role_patterns = [
        # Medical
        (re.compile(r"\b(DOCTOR|PHYSICIAN|MEDICAL\s*DOCTOR|MD)\b", re.IGNORECASE), "Doctor", "Employee ID"),
        (re.compile(r"\b(DENTIST|DENTAL)\b", re.IGNORECASE), "Dentist", "Employee ID"),
        (re.compile(r"\b(NURSE|NURSING)\b", re.IGNORECASE), "Nurse", "Employee ID"),
        # Academic
        (re.compile(r"\b(LECTURER)\b", re.IGNORECASE), "Lecturer", "Employee ID"),
        (re.compile(r"\b(PROFESSOR|PROF\.?)\b", re.IGNORECASE), "Professor", "Employee ID"),
        (re.compile(r"\b(INSTRUCTOR)\b", re.IGNORECASE), "Instructor", "Employee ID"),
        (re.compile(r"\b(ADMINISTRATOR|ADMIN)\b", re.IGNORECASE), "Administrator", "Employee ID"),
        (re.compile(r"\b(LIBRARIAN)\b", re.IGNORECASE), "Librarian", "Employee ID"),
        # Staff
        (re.compile(r"\b(TECHNICIAN|TECH)\b", re.IGNORECASE), "Technician", "Employee ID"),
        (re.compile(r"\b(GUARD|SECURITY)\b", re.IGNORECASE), "Guard", "Employee ID"),
        (re.compile(r"\b(JANITOR|CLEANER|MAINTENANCE)\b", re.IGNORECASE), "Staff", "Employee ID"),
        (re.compile(r"\b(STAFF|EMPLOYEE|FACULTY)\b", re.IGNORECASE), "Staff", "Employee ID"),
        # Student
        (re.compile(r"\b(BSIT|BSIS|BSBA|BSED|BSCS|BSCRIM|BSHM|BSENT|BSOA)\b", re.IGNORECASE), "Student", "Student ID"),
        (re.compile(r"\b(COURSE|ENROLLMENT|YEAR\s*LEVEL)\b", re.IGNORECASE), "Student", "Student ID"),
        (re.compile(r"\b(STUDENT)\b", re.IGNORECASE), "Student", "Student ID"),
    ]

    matched = False
    for pattern, role_name, id_type in role_patterns:
        m = pattern.search(full_text)
        if m:
            fields["role"] = role_name
            fields["id_type"] = id_type
            print(f"[DEBUG] role matched: '{role_name}' via pattern '{pattern.pattern}' (matched token: '{m.group(0)}')", flush=True)
            matched = True
            break

    if not matched:
        fields["role"] = "Unknown"
        fields["id_type"] = "Unknown"
        print("[DEBUG] No role pattern matched — defaulting to Unknown", flush=True)

    # --- Name (LASTNAME, FIRSTNAME format) ---
    name_match = re.search(r"([A-Z]{2,}(?:\s+[A-Z]{2,})*,\s+[A-Z][A-Z\s\.]+)", full_text)
    if name_match:
        fields["name"] = name_match.group(1).strip()
        print(f"[DEBUG] name matched: {fields['name']}", flush=True)

    # --- Institution ---
    inst_pattern = re.compile(r"((?:PAMANTASAN|UNIVERSITY|COLLEGE)[^\n,]{3,60})", re.IGNORECASE)
    inst_match = inst_pattern.search(full_text)
    if inst_match:
        fields["institution"] = inst_match.group(1).strip()
        print(f"[DEBUG] institution matched: {fields['institution']}", flush=True)

    return fields


@app.route("/ocr", methods=["POST"])
def perform_ocr():
    global ocr_engine
    print(">>> Request Received", flush=True)

    try:
        if ocr_engine is None:
            print(">>> Importing Paddle Libraries...", flush=True)
            from paddleocr import PaddleOCR
            
            print(">>> Initializing AI Models (This may take 40s)...", flush=True)
            ocr_engine = PaddleOCR(use_angle_cls=True, lang="en")
            
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

        print(f"[DEBUG] Final parsed result: {structured}", flush=True)

        return jsonify({
            "success": True,
            "file_type": "pdf" if filename.endswith('.pdf') else "image",
            "raw_text": " ".join(text_lines),
            "parsed": structured
        })

    except Exception as e:
        error_msg = traceback.format_exc()
        print(f"[FATAL CRASH] {error_msg}", flush=True)
        return jsonify({"success": False, "error": str(e), "trace": error_msg}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=False)