import os
import uuid
import fitz  # PyMuPDF
from flask import Flask, request, jsonify
from paddleocr import PaddleOCR
from PIL import Image
import io

os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'

app = Flask(__name__)

# Initialize Stable Engine
print("--- [STARTUP] INITIALIZING PADDLEOCR ---")
ocr = PaddleOCR(use_angle_cls=True, lang="en", use_gpu=False, show_log=False)
print("--- [STARTUP] PADDLEOCR IS READY ---")

@app.route("/ocr", methods=["POST"])
def perform_ocr():
    print(">>> Request Received")
    if 'image' not in request.files:
        return jsonify({"error": "Missing 'image' key"}), 400

    file = request.files['image']
    filename = file.filename.lower()
    temp_path = f"test_{uuid.uuid4().hex}.jpg"

    try:
        if filename.endswith('.pdf'):
            print("[LOG] Processing PDF...")
            # Read PDF from memory
            doc = fitz.open(stream=file.read(), filetype="pdf")
            page = doc.load_page(0)  # Get the first page
            pix = page.get_pixmap()   # Render page to an image
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            img.save(temp_path)
            doc.close()
        else:
            print("[LOG] Processing Image...")
            img = Image.open(file.stream).convert("RGB")
            img.save(temp_path)

        # Run OCR
        result = ocr.ocr(temp_path, cls=True)
        
        extracted_text = []
        if result and result[0]:
            for line in result:
                for word_info in line:
                    extracted_text.append(word_info[1][0])

        return jsonify({
            "success": True,
            "file_type": "pdf" if filename.endswith('.pdf') else "image",
            "text": " ".join(extracted_text)
        })

    except Exception as e:
        print(f"[CRASH] {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False, threaded=False)