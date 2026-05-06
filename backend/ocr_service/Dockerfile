# Use the version matching your local environment
FROM python:3.11-slim

# Install system dependencies required for OpenCV and PaddleOCR
# These replace the deprecated libgl1-mesa-glx found in your logs
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code
COPY . .

# Use gunicorn to run your specific entry point script (medi_ocr.py)
# This assumes your Flask instance inside medi_ocr.py is named 'app'
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5001", "medi_ocr:app"]