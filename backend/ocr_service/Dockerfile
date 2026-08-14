FROM python:3.10-slim

# System dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    build-essential \
    python3-dev \
    swig \
    && rm -rf /var/lib/apt/lists/*

# Application directory
WORKDIR /app

# PaddleOCR / PaddleX cache directories
RUN mkdir -p \
    /opt/paddleocr/.paddlex \
    /opt/paddleocr/.cache

ENV PADDLE_HOME=/opt/paddleocr
ENV PADDLEX_HOME=/opt/paddleocr/.paddlex
ENV XDG_CACHE_HOME=/opt/paddleocr/.cache

# PaddleX configuration
ENV PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True

# OpenMP configuration
ENV KMP_DUPLICATE_LIB_OK=TRUE

# Disable MKLDNN
ENV FLAGS_use_mkldnn=0
ENV FLAGS_enable_mkldnn=0

# Python dependency installation
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade \
    pip \
    setuptools \
    wheel

# PaddleOCR 2.7 compatibility
RUN pip install --no-cache-dir "Cython<3"

# Remove conflicting OpenCV packages if present
RUN pip uninstall -y \
    opencv-python \
    opencv-contrib-python \
    opencv-python-headless \
    || true

# Install application dependencies
RUN pip install --no-cache-dir -r requirements.txt


# Copy application
COPY . .

# Verify required bundled OCR models exist
RUN test -f /app/models/det/en_PP-OCRv3_det_infer/inference.pdmodel

RUN test -f /app/models/rec/en_PP-OCRv3_rec_infer/inference.pdmodel

RUN test -f /app/models/cls/ch_ppocr_mobile_v2.0_cls_infer/inference.pdmodel

# Cloud Run

CMD ["gunicorn", \
     "--bind", "0.0.0.0:8080", \
     "--workers", "1", \
     "--threads", "8", \
     "--timeout", "120", \
     "medi_ocr:app"]