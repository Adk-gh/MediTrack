import os
import uuid
import re
import json
import fitz
import tempfile
import traceback
from copy import deepcopy
from datetime import datetime, timezone

from flask import Flask, request, jsonify
from PIL import Image
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from supabase import create_client, Client


temp_dir = tempfile.gettempdir()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DET_MODEL_DIR = os.path.join(
    BASE_DIR,
    "models",
    "det",
    "en_PP-OCRv3_det_infer"
)

REC_MODEL_DIR = os.path.join(
    BASE_DIR,
    "models",
    "rec",
    "en_PP-OCRv3_rec_infer"
)

CLS_MODEL_DIR = os.path.join(
    BASE_DIR,
    "models",
    "cls",
    "ch_ppocr_mobile_v2.0_cls_infer"
)

MODEL_DIR = os.environ.get(
    "PADDLE_HOME",
    "/opt/paddleocr"
)

PADDLEX_DIR = os.environ.get(
    "PADDLEX_HOME",
    os.path.join(MODEL_DIR, ".paddlex")
)

CACHE_DIR = os.environ.get(
    "XDG_CACHE_HOME",
    os.path.join(MODEL_DIR, ".cache")
)

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(PADDLEX_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

os.environ["PADDLE_HOME"] = MODEL_DIR
os.environ["PADDLEX_HOME"] = PADDLEX_DIR
os.environ["XDG_CACHE_HOME"] = CACHE_DIR

os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"
os.environ["KMP_DUPLICATE_LIB_OK"] = "True"
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_mkldnn"] = "0"


app = Flask(__name__)


limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

OCR_RATE_LIMIT = "10 per minute"


CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=False
)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = (
        "Content-Type, Authorization"
    )
    return response


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        "success": False,
        "error": "Rate limit exceeded. Please try again later.",
        "retry_after": e.description
    }), 429


@app.route("/config", methods=["OPTIONS"])
def config_options():
    return "", 204


@app.route("/ocr", methods=["OPTIONS"])
def ocr_options():
    return "", 204


ocr_engine = None


SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")


if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print(
        "[WARNING] SUPABASE_URL or SUPABASE_SERVICE_KEY not set. "
        "Using fallback mode.",
        flush=True
    )


if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    supabase_client: Client = create_client(
        SUPABASE_URL,
        SUPABASE_SERVICE_KEY
    )
else:
    supabase_client = None


DEFAULT_CONFIG = {
    "institution_keywords": [
        "PAMANTASAN",
        "UNIVERSITY",
        "COLLEGE"
    ],
    "role_mappings": [
        {
            "name": "Doctor",
            "id_type": "Employee ID",
            "keywords": [
                "DOCTOR",
                "PHYSICIAN",
                "MEDICAL DOCTOR",
                "MD"
            ]
        },
        {
            "name": "Dentist",
            "id_type": "Employee ID",
            "keywords": [
                "DENTIST",
                "DENTAL"
            ]
        },
        {
            "name": "Nurse",
            "id_type": "Employee ID",
            "keywords": [
                "NURSE"
            ]
        },
        {
            "name": "Lecturer",
            "id_type": "Employee ID",
            "keywords": [
                "LECTURER"
            ]
        },
        {
            "name": "Professor",
            "id_type": "Employee ID",
            "keywords": [
                "PROFESSOR",
                "PROF"
            ]
        },
        {
            "name": "Instructor",
            "id_type": "Employee ID",
            "keywords": [
                "INSTRUCTOR"
            ]
        },
        {
            "name": "Administrator",
            "id_type": "Employee ID",
            "keywords": [
                "ADMINISTRATOR",
                "ADMIN"
            ]
        },
        {
            "name": "Librarian",
            "id_type": "Employee ID",
            "keywords": [
                "LIBRARIAN"
            ]
        },
        {
            "name": "Technician",
            "id_type": "Employee ID",
            "keywords": [
                "TECHNICIAN",
                "TECH"
            ]
        },
        {
            "name": "Guard",
            "id_type": "Employee ID",
            "keywords": [
                "GUARD",
                "SECURITY"
            ]
        },
        {
            "name": "Staff",
            "id_type": "Employee ID",
            "keywords": [
                "STAFF",
                "EMPLOYEE",
                "FACULTY",
                "JANITOR",
                "CLEANER",
                "MAINTENANCE"
            ]
        },
        {
            "name": "Student",
            "id_type": "Student ID",
            "keywords": [
                "BSIT",
                "BSIS",
                "BSBA",
                "BSED",
                "BSCS",
                "BSCRIM",
                "BSHM",
                "BSENT",
                "BSOA",
                "COURSE",
                "ENROLLMENT",
                "YEAR LEVEL",
                "STUDENT"
            ]
        }
    ]
}


def normalize_config(config: dict) -> dict:
    """
    Validate and normalize the OCR configuration before saving or using it.
    Both institution_keywords and role_mappings are always preserved.
    """
    if not isinstance(config, dict):
        raise ValueError("Configuration must be a JSON object.")

    raw_institution_keywords = config.get("institution_keywords", [])
    raw_role_mappings = config.get("role_mappings", [])

    if not isinstance(raw_institution_keywords, list):
        raise ValueError("institution_keywords must be an array.")

    if not isinstance(raw_role_mappings, list):
        raise ValueError("role_mappings must be an array.")

    institution_keywords = []
    seen_institution_keywords = set()

    for keyword in raw_institution_keywords:
        normalized_keyword = str(keyword).strip().upper()

        if (
            normalized_keyword
            and normalized_keyword not in seen_institution_keywords
        ):
            seen_institution_keywords.add(normalized_keyword)
            institution_keywords.append(normalized_keyword)

    role_mappings = []

    for index, mapping in enumerate(raw_role_mappings):
        if not isinstance(mapping, dict):
            raise ValueError(
                f"role_mappings[{index}] must be an object."
            )

        name = str(mapping.get("name", "")).strip()
        id_type = str(mapping.get("id_type", "")).strip()
        raw_keywords = mapping.get("keywords", [])

        if not name:
            raise ValueError(
                f"role_mappings[{index}].name is required."
            )

        if not id_type:
            raise ValueError(
                f"role_mappings[{index}].id_type is required."
            )

        if not isinstance(raw_keywords, list):
            raise ValueError(
                f"role_mappings[{index}].keywords must be an array."
            )

        keywords = []
        seen_keywords = set()

        for keyword in raw_keywords:
            normalized_keyword = str(keyword).strip().upper()

            if (
                normalized_keyword
                and normalized_keyword not in seen_keywords
            ):
                seen_keywords.add(normalized_keyword)
                keywords.append(normalized_keyword)

        normalized_mapping = {
            **mapping,
            "name": name,
            "id_type": id_type,
            "keywords": keywords
        }

        role_mappings.append(normalized_mapping)

    return {
        **config,
        "institution_keywords": institution_keywords,
        "role_mappings": role_mappings
    }


def load_config() -> dict:
    if supabase_client is None:
        return load_config_fallback()

    try:
        response = (
            supabase_client
            .table("ocr_settings")
            .select("config")
            .eq("id", "default")
            .execute()
        )

        if response.data and len(response.data) > 0:
            stored_config = response.data[0].get("config") or {}

            # Merge with defaults so older database rows that are missing
            # role_mappings still receive the default role mappings.
            merged_config = {
                **deepcopy(DEFAULT_CONFIG),
                **stored_config
            }

            normalized_config = normalize_config(merged_config)

            print(
                "\n========== OCR CONFIG LOADED ==========\n"
                + json.dumps(normalized_config, indent=2)
                + "\n=======================================\n",
                flush=True
            )

            return normalized_config

        default_config = normalize_config(
            deepcopy(DEFAULT_CONFIG)
        )

        insert_response = (
            supabase_client
            .table("ocr_settings")
            .insert({
                "id": "default",
                "config": default_config,
                "updated_at": datetime.now(
                    timezone.utc
                ).isoformat()
            })
            .execute()
        )

        if not insert_response.data:
            raise RuntimeError(
                "The default OCR settings row could not be created."
            )

        return default_config

    except Exception as e:
        print(
            f"[ERROR] Failed to load config from Supabase: {e}",
            flush=True
        )

        # Reading may still use the local fallback so OCR remains available.
        return load_config_fallback()


def load_config_fallback() -> dict:
    config_file = os.path.join(
        temp_dir,
        "ocr_config.json"
    )

    try:
        if not os.path.exists(config_file):
            default_config = normalize_config(
                deepcopy(DEFAULT_CONFIG)
            )

            with open(config_file, "w", encoding="utf-8") as f:
                json.dump(
                    default_config,
                    f,
                    indent=2,
                    ensure_ascii=False
                )

            return default_config

        with open(config_file, "r", encoding="utf-8") as f:
            stored_config = json.load(f)

        merged_config = {
            **deepcopy(DEFAULT_CONFIG),
            **stored_config
        }

        return normalize_config(merged_config)

    except Exception as e:
        print(
            f"[ERROR] Failed to load local config: {e}",
            flush=True
        )

        return normalize_config(
            deepcopy(DEFAULT_CONFIG)
        )


def save_config(config: dict) -> tuple[bool, dict | None, str | None]:
    """
    Save the complete OCR configuration to Supabase.

    Returns:
        (success, saved_config, error_message)
    """
    try:
        normalized_config = normalize_config(config)
    except ValueError as e:
        return False, None, str(e)

    print(
        "\n========== OCR CONFIG SAVING ==========\n"
        + json.dumps(normalized_config, indent=2)
        + "\n=======================================\n",
        flush=True
    )

    if supabase_client is None:
        success = save_config_fallback(normalized_config)

        if success:
            return True, normalized_config, None

        return (
            False,
            None,
            "Supabase is not configured and the local fallback save failed."
        )

    try:
        # Upsert ensures the row is created when id='default' does not exist.
        # It also saves institution_keywords and role_mappings together inside
        # the same JSONB config column.
        response = (
            supabase_client
            .table("ocr_settings")
            .upsert(
                {
                    "id": "default",
                    "config": normalized_config,
                    "updated_at": datetime.now(
                        timezone.utc
                    ).isoformat()
                },
                on_conflict="id"
            )
            .execute()
        )

        if not response.data:
            return (
                False,
                None,
                "Supabase returned no saved OCR settings row."
            )

        saved_row = response.data[0]
        saved_config = normalize_config(
            saved_row.get("config") or normalized_config
        )

        print(
            "\n========== OCR CONFIG SAVED ==========\n"
            + json.dumps(saved_config, indent=2)
            + "\n======================================\n",
            flush=True
        )

        return True, saved_config, None

    except Exception as e:
        print(
            f"[ERROR] Failed to save config to Supabase: {e}",
            flush=True
        )

        # Do not report success when the database write failed.
        # A local fallback copy is still written for diagnostics/runtime use.
        save_config_fallback(normalized_config)

        return (
            False,
            None,
            f"Failed to save OCR configuration to Supabase: {e}"
        )


def save_config_fallback(config: dict) -> bool:
    try:
        normalized_config = normalize_config(config)

        config_file = os.path.join(
            temp_dir,
            "ocr_config.json"
        )

        with open(config_file, "w", encoding="utf-8") as f:
            json.dump(
                normalized_config,
                f,
                indent=2,
                ensure_ascii=False
            )

        return True

    except Exception as e:
        print(
            f"[ERROR] Failed to save config locally: {e}",
            flush=True
        )

        return False


@app.route("/config", methods=["GET"])
def get_config():
    try:
        return jsonify(load_config()), 200

    except Exception as e:
        print(
            f"[ERROR] Failed to return OCR config: {e}",
            flush=True
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/config", methods=["POST"])
@limiter.limit("5 per minute")
def update_config():
    new_config = request.get_json(silent=True)

    print(
        "\n========== OCR CONFIG RECEIVED ==========\n"
        + json.dumps(new_config, indent=2)
        + "\n=========================================\n",
        flush=True
    )

    if new_config is None:
        return jsonify({
            "success": False,
            "error": "No valid JSON configuration was received."
        }), 400

    success, saved_config, error_message = save_config(
        new_config
    )

    if success:
        return jsonify({
            "success": True,
            "message": "Configuration updated successfully.",
            "config": saved_config
        }), 200

    return jsonify({
        "success": False,
        "error": error_message or "Failed to save configuration."
    }), 500


def parse_id_fields(text_lines: list) -> dict:

    full_text = " ".join(text_lines)

    print(
        f"[DEBUG] raw text_lines: {text_lines}",
        flush=True
    )

    print(
        f"[DEBUG] full_text: {full_text}",
        flush=True
    )

    fields = {
        "id_number": None,
        "role": "Unknown",
        "id_type": "Unknown",
        "name": None,
        "institution": None
    }

    config = load_config()

    id_match = re.search(
        r"(\d{2,4})\s*[\-\.\s\_]\s*(\d{4,6})",
        full_text
    )

    if id_match:
        fields["id_number"] = (
            f"{id_match.group(1)}-{id_match.group(2)}"
        )

        print(
            f"[DEBUG] id_number matched: {fields['id_number']}",
            flush=True
        )
    else:
        print(
            "[DEBUG] id_number NOT matched",
            flush=True
        )

    matched = False

    for mapping in config.get("role_mappings", []):

        escaped_keywords = [
            re.escape(kw)
            for kw in mapping["keywords"]
        ]

        pattern_str = (
            r"(?<!\w)("
            + "|".join(escaped_keywords)
            + r")(?!\w)"
        )

        m = re.search(
            pattern_str,
            full_text,
            re.IGNORECASE
        )

        if m:
            fields["role"] = mapping["name"]
            fields["id_type"] = mapping["id_type"]

            print(
                f"[DEBUG] role matched: "
                f"'{mapping['name']}' "
                f"(matched token: '{m.group(0)}')",
                flush=True
            )

            matched = True
            break

    if not matched:
        print(
            "[DEBUG] No role pattern matched — defaulting to Unknown",
            flush=True
        )

    name_match = re.search(
        r"([A-Z]{2,}(?:\s+[A-Z]{2,})*,\s+[A-Z][A-Z\s\.]+)",
        full_text
    )

    if name_match:
        fields["name"] = name_match.group(1).strip()

        print(
            f"[DEBUG] name matched: {fields['name']}",
            flush=True
        )

    inst_keywords = config.get(
        "institution_keywords",
        []
    )

    if inst_keywords:

        escaped_inst = [
            re.escape(kw)
            for kw in inst_keywords
        ]

        inst_pattern = (
            r"((?:"
            + "|".join(escaped_inst)
            + r")[^\n,]{3,60})"
        )

        inst_match = re.search(
            inst_pattern,
            full_text,
            re.IGNORECASE
        )

        if inst_match:
            fields["institution"] = (
                inst_match.group(1).strip()
            )

            print(
                f"[DEBUG] institution matched: "
                f"{fields['institution']}",
                flush=True
            )

    return fields


@app.route("/ocr", methods=["POST"])
@limiter.limit(OCR_RATE_LIMIT)
def perform_ocr():

    global ocr_engine

    print(">>> Request Received", flush=True)

    try:

        if ocr_engine is None:

            print(
                ">>> Importing Paddle Libraries...",
                flush=True
            )

            from paddleocr import PaddleOCR

            print(
                ">>> Initializing AI Models...",
                flush=True
            )

            print(
                f">>> Detection model: {DET_MODEL_DIR}",
                flush=True
            )

            print(
                f">>> Recognition model: {REC_MODEL_DIR}",
                flush=True
            )

            print(
                f">>> Classification model: {CLS_MODEL_DIR}",
                flush=True
            )

            if not os.path.exists(DET_MODEL_DIR):
                raise FileNotFoundError(
                    f"Detection model not found: {DET_MODEL_DIR}"
                )

            if not os.path.exists(REC_MODEL_DIR):
                raise FileNotFoundError(
                    f"Recognition model not found: {REC_MODEL_DIR}"
                )

            if not os.path.exists(CLS_MODEL_DIR):
                raise FileNotFoundError(
                    f"Classification model not found: {CLS_MODEL_DIR}"
                )

            ocr_engine = PaddleOCR(
                use_angle_cls=True,
                lang="en",
                det_model_dir=DET_MODEL_DIR,
                rec_model_dir=REC_MODEL_DIR,
                cls_model_dir=CLS_MODEL_DIR,
                use_gpu=False
            )

            print(
                ">>> AI Engine Ready!",
                flush=True
            )

        if "image" not in request.files:
            return jsonify({
                "error": "Missing 'image' key"
            }), 400

        file = request.files["image"]

        if not file.filename:
            return jsonify({
                "error": "No filename provided"
            }), 400

        filename = file.filename.lower()

        temp_path = os.path.join(
            temp_dir,
            f"scan_{uuid.uuid4().hex}.jpg"
        )

        try:

            if filename.endswith(".pdf"):

                print(
                    "[LOG] Processing PDF...",
                    flush=True
                )

                doc = fitz.open(
                    stream=file.read(),
                    filetype="pdf"
                )

                if len(doc) == 0:
                    doc.close()

                    return jsonify({
                        "success": False,
                        "error": "PDF contains no pages"
                    }), 400

                page = doc.load_page(0)

                pix = page.get_pixmap()

                img = Image.frombytes(
                    "RGB",
                    [pix.width, pix.height],
                    pix.samples
                )

                img.save(temp_path)

                doc.close()

            else:

                print(
                    "[LOG] Processing Image...",
                    flush=True
                )

                img = Image.open(
                    file.stream
                ).convert("RGB")

                img.save(temp_path)

            print(
                "[LOG] Starting OCR Scan...",
                flush=True
            )

            result = ocr_engine.ocr(temp_path)

            print(
                "[LOG] Scan Complete.",
                flush=True
            )

            text_lines = []

            if result and result[0]:

                for line in result:

                    if not line:
                        continue

                    for word_info in line:

                        if (
                            word_info
                            and len(word_info) > 1
                            and word_info[1]
                        ):
                            text_lines.append(
                                word_info[1][0]
                            )

            structured = parse_id_fields(
                text_lines
            )

            print(
                f"[DEBUG] Final parsed result: {structured}",
                flush=True
            )

            return jsonify({
                "success": True,
                "file_type": (
                    "pdf"
                    if filename.endswith(".pdf")
                    else "image"
                ),
                "raw_text": " ".join(text_lines),
                "parsed": structured
            })

        finally:

            if os.path.exists(temp_path):
                os.remove(temp_path)

    except Exception as e:

        error_msg = traceback.format_exc()

        print(
            f"[FATAL CRASH] {error_msg}",
            flush=True
        )

        return jsonify({
            "success": False,
            "error": str(e),
            "trace": error_msg
        }), 500


if __name__ == "__main__":

    port = int(
        os.environ.get("PORT", 5001)
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False,
        threaded=False
    )