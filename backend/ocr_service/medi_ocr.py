import os
import uuid
import re
import fitz  # PyMuPDF
from flask import Flask, request, jsonify
from paddleocr import PaddleOCR
from PIL import Image

os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'

app = Flask(__name__)

print("--- [STARTUP] INITIALIZING PADDLEOCR ---")
ocr = PaddleOCR(use_angle_cls=True, lang="en", use_gpu=False, show_log=False)
print("--- [STARTUP] PADDLEOCR IS READY ---")


def parse_id_fields(text_lines: list[str]) -> dict:
    """
    Heuristically extract structured fields from raw OCR lines.
    Optimized for PLSP Student and Employee ID formats.
    """
    full_text = " ".join(text_lines)
    fields = {}

    # --- 1. ID Number Extraction ---
    id_match = re.search(r"\b(\d{2,4}[\s\-]+\d{3,5})\b", full_text)
    if id_match:
        fields["id_number"] = id_match.group(1).replace(" ", "-").strip()

    # --- 2. ID Type & Role Identification ---
    # SEPARATE specific roles from generic terms
    specific_clinic_pattern = re.compile(r"\b(NURSE|DOCTOR|PHYSICIAN)\b", re.IGNORECASE)
    specific_acad_pattern = re.compile(r"\b(LECTURER|PROFESSOR|INSTRUCTOR|ADMINISTRATOR|LIBRARIAN)\b", re.IGNORECASE)
    student_pattern = re.compile(r"\b(STUDENT|BSIT|BSIS|BSBA|BSED|BSCS|COURSE|ENROLLMENT)\b", re.IGNORECASE)
    
    # Generic catch-alls (checked LAST)
    generic_emp_pattern = re.compile(r"\b(EMPLOYEE|STAFF|FACULTY)\b", re.IGNORECASE)

    clc_match = specific_clinic_pattern.search(full_text)
    acad_match = specific_acad_pattern.search(full_text)
    stu_match = student_pattern.search(full_text)
    gen_emp_match = generic_emp_pattern.search(full_text)

    # PRIORITY CHECKING: Look for specific job titles BEFORE generic words!
    if clc_match:
        fields["id_type"] = "Employee ID"
        fields["role"] = clc_match.group(1).title() # Will capture "Nurse"
    elif acad_match:
        fields["id_type"] = "Employee ID"
        fields["role"] = acad_match.group(1).title()
    elif stu_match:
        fields["id_type"] = "Student ID"
        fields["role"] = "Student"
    elif gen_emp_match:
        fields["id_type"] = "Employee ID"
        fields["role"] = "Employee" # Only falls back to this if specific titles aren't found
    else:
        fields["id_type"] = "Unknown"
        fields["role"] = "Unknown"

    # --- 3. Name Extraction ---
    name_match = re.search(r"([A-Z]{2,}(?:\s+[A-Z]{2,})*,\s+[A-Z][A-Z\s\.]+)", full_text)
    if name_match:
        fields["name"] = name_match.group(1).strip()

    # --- 4. Institution ---
    inst_pattern = re.compile(r"((?:PAMANTASAN|UNIVERSITY|COLLEGE)[^\n,]{3,60})", re.IGNORECASE)
    inst_match = inst_pattern.search(full_text)
    if inst_match:
        fields["institution"] = inst_match.group(1).strip()

    return fields


@app.route("/ocr", methods=["POST"])
def perform_ocr():
    print(">>> Request Received")
    if 'image' not in request.files:
        return jsonify({"error": "Missing 'image' key"}), 400

    file = request.files['image']
    filename = file.filename.lower()
    temp_path = f"scan_{uuid.uuid4().hex}.jpg"

    try:
        if filename.endswith('.pdf'):
            print("[LOG] Processing PDF...")
            doc = fitz.open(stream=file.read(), filetype="pdf")
            page = doc.load_page(0)
            pix = page.get_pixmap()
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            img.save(temp_path)
            doc.close()
        else:
            print("[LOG] Processing Image...")
            img = Image.open(file.stream).convert("RGB")
            img.save(temp_path)

        result = ocr.ocr(temp_path, cls=True)

        text_lines = []
        if result and result[0]:
            for line in result:
                for word_info in line:
                    text_lines.append(word_info[1][0])

        structured = parse_id_fields(text_lines)

        return jsonify({
            "success": True,
            "file_type": "pdf" if filename.endswith('.pdf') else "image",
            "raw_text": " ".join(text_lines),
            "parsed": structured
        })

    except Exception as e:
        print(f"[CRASH] {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False, threaded=False)