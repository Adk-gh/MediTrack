# C:\Users\HP\MediTrack\backend\ocr_service\medi_ocr.py
import os
import uuid
import re
import json
import fitz  # PyMuPDF
import tempfile
import traceback
from flask import Flask, request, jsonify
from PIL import Image
from flask_cors import CORS

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
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

@app.route("/config", methods=["OPTIONS"])
def config_options():
    return '', 204

@app.route("/ocr", methods=["OPTIONS"])
def ocr_options():
    return '', 204

ocr_engine = None

# --- 2. CONFIG FILE SETUP ---
CONFIG_FILE = os.path.join(temp_dir, "ocr_config.json")

DEFAULT_CONFIG = {
    "institution_keywords": ["PAMANTASAN", "UNIVERSITY", "COLLEGE"],
    "role_mappings": [
        # Medical (most specific first — order matters!)
        {"name": "Doctor",        "id_type": "Employee ID", "keywords": ["DOCTOR", "PHYSICIAN", "MEDICAL DOCTOR", "MD"]},
        {"name": "Dentist",       "id_type": "Employee ID", "keywords": ["DENTIST", "DENTAL"]},
        {"name": "Nurse",         "id_type": "Employee ID", "keywords": ["NURSE", "NURSING"]},
        # Academic
        {"name": "Lecturer",      "id_type": "Employee ID", "keywords": ["LECTURER"]},
        {"name": "Professor",     "id_type": "Employee ID", "keywords": ["PROFESSOR", "PROF"]},
        {"name": "Instructor",    "id_type": "Employee ID", "keywords": ["INSTRUCTOR"]},
        {"name": "Administrator", "id_type": "Employee ID", "keywords": ["ADMINISTRATOR", "ADMIN"]},
        {"name": "Librarian",     "id_type": "Employee ID", "keywords": ["LIBRARIAN"]},
        # Staff
        {"name": "Technician",    "id_type": "Employee ID", "keywords": ["TECHNICIAN", "TECH"]},
        {"name": "Guard",         "id_type": "Employee ID", "keywords": ["GUARD", "SECURITY"]},
        {"name": "Staff",         "id_type": "Employee ID", "keywords": ["STAFF", "EMPLOYEE", "FACULTY", "JANITOR", "CLEANER", "MAINTENANCE"]},
        # Student (last — least specific)
        {"name": "Student",       "id_type": "Student ID",  "keywords": ["BSIT", "BSIS", "BSBA", "BSED", "BSCS", "BSCRIM", "BSHM", "BSENT", "BSOA", "COURSE", "ENROLLMENT", "YEAR LEVEL", "STUDENT"]},
    ]
}


def load_config() -> dict:
    """Load config from file, creating it with defaults if it doesn't exist."""
    if not os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'w') as f:
            json.dump(DEFAULT_CONFIG, f, indent=2)
        return DEFAULT_CONFIG
    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)


# --- 3. CONFIG API ENDPOINTS ---

@app.route("/config", methods=["GET"])
def get_config():
    return jsonify(load_config())


@app.route("/config", methods=["POST"])
def update_config():
    new_config = request.json
    if not new_config:
        return jsonify({"success": False, "error": "No config data received"}), 400
    with open(CONFIG_FILE, 'w') as f:
        json.dump(new_config, f, indent=2)
    return jsonify({"success": True, "message": "Configuration updated successfully"})


# --- 4. PARSING LOGIC ---

def parse_id_fields(text_lines: list) -> dict:
    full_text = " ".join(text_lines)

    # DEBUG: always print what OCR actually saw
    print(f"[DEBUG] raw text_lines: {text_lines}", flush=True)
    print(f"[DEBUG] full_text: {full_text}", flush=True)

    fields = {
        "id_number":   None,
        "role":        "Unknown",
        "id_type":     "Unknown",
        "name":        None,
        "institution": None,
    }

    config = load_config()

    # --- ID Number ---
    # Matches formats like: 2023-0149, 23-0149, 2023.0149, 20230149
    id_match = re.search(r"(\d{2,4})\s*[\-\.\s\_]\s*(\d{4,6})", full_text)
    if id_match:
        fields["id_number"] = f"{id_match.group(1)}-{id_match.group(2)}"
        print(f"[DEBUG] id_number matched: {fields['id_number']}", flush=True)
    else:
        print("[DEBUG] id_number NOT matched", flush=True)

    # --- Dynamic Role Detection ---
    # Uses (?<!\w) / (?!\w) instead of \b so multi-word keywords like
    # "MEDICAL DOCTOR" are not broken by re.escape() turning the space.
    matched = False
    for mapping in config.get("role_mappings", []):
        escaped_keywords = [re.escape(kw) for kw in mapping["keywords"]]
        pattern_str = r"(?<!\w)(" + "|".join(escaped_keywords) + r")(?!\w)"

        m = re.search(pattern_str, full_text, re.IGNORECASE)
        if m:
            fields["role"]    = mapping["name"]
            fields["id_type"] = mapping["id_type"]
            print(f"[DEBUG] role matched: '{mapping['name']}' (matched token: '{m.group(0)}')", flush=True)
            matched = True
            break

    if not matched:
        print("[DEBUG] No role pattern matched — defaulting to Unknown", flush=True)

    # --- Name (LASTNAME, FIRSTNAME format) ---
    name_match = re.search(r"([A-Z]{2,}(?:\s+[A-Z]{2,})*,\s+[A-Z][A-Z\s\.]+)", full_text)
    if name_match:
        fields["name"] = name_match.group(1).strip()
        print(f"[DEBUG] name matched: {fields['name']}", flush=True)

    # --- Dynamic Institution Detection ---
    inst_keywords = config.get("institution_keywords", [])
    if inst_keywords:
        escaped_inst  = [re.escape(kw) for kw in inst_keywords]
        inst_pattern  = r"((?:" + "|".join(escaped_inst) + r")[^\n,]{3,60})"
        inst_match    = re.search(inst_pattern, full_text, re.IGNORECASE)
        if inst_match:
            fields["institution"] = inst_match.group(1).strip()
            print(f"[DEBUG] institution matched: {fields['institution']}", flush=True)

    return fields


# --- 5. OCR ENDPOINT ---

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

        file     = request.files['image']
        filename = file.filename.lower()
        temp_path = os.path.join(temp_dir, f"scan_{uuid.uuid4().hex}.jpg")

        if filename.endswith('.pdf'):
            print("[LOG] Processing PDF...", flush=True)
            doc  = fitz.open(stream=file.read(), filetype="pdf")
            page = doc.load_page(0)
            pix  = page.get_pixmap()
            img  = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
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
            "success":   True,
            "file_type": "pdf" if filename.endswith('.pdf') else "image",
            "raw_text":  " ".join(text_lines),
            "parsed":    structured
        })

    except Exception as e:
        error_msg = traceback.format_exc()
        print(f"[FATAL CRASH] {error_msg}", flush=True)
        return jsonify({"success": False, "error": str(e), "trace": error_msg}), 500


# --- 6. ENTRY POINT ---

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=False)