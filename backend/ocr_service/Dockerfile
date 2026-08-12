FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    build-essential \
    python3-dev \
    swig \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /opt/paddleocr/.paddlex /opt/paddleocr/.cache

ENV PADDLE_HOME=/opt/paddleocr
ENV PADDLEX_HOME=/opt/paddleocr/.paddlex
ENV XDG_CACHE_HOME=/opt/paddleocr/.cache
ENV PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True
ENV KMP_DUPLICATE_LIB_OK=True
ENV FLAGS_use_mkldnn=0
ENV FLAGS_enable_mkldnn=0

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

RUN pip install --no-cache-dir "Cython<3"

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python -c "import paddle; print('PaddlePaddle:', paddle.__version__)"

RUN python -c "import paddleocr; print('PaddleOCR imported successfully')"

RUN test -f /app/models/det/en_PP-OCRv3_det_infer/inference.pdmodel

RUN test -f /app/models/rec/en_PP-OCRv3_rec_infer/inference.pdmodel

RUN test -f /app/models/cls/ch_ppocr_mobile_v2.0_cls_infer/inference.pdmodel

CMD ["gunicorn", "--bind", ":8080", "--workers", "1", "--threads", "8", "--timeout", "120", "medi_ocr:app"]