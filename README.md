# Project

## Stack
- **Backend**: Node.js + Express + MongoDB + Firebase Admin
- **OCR Service**: Python + Flask + PaddleOCR
- **Frontend**: React

## Setup

### 1. Environment Variables
Create a `.env` file:
```
MONGO_URI=mongodb://localhost:27017/yourdb
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
OCR_SERVICE_URL=http://localhost:5001
```

### 2. Node Backend
```bash
npm install
node app.js
```

### 3. Python OCR Service
```bash
cd backend/ocr_service
pip install -r requirements.txt
python ocr_service.py
# or for production:
gunicorn -w 2 -b 0.0.0.0:5001 ocr_service:app
```

### 4. Frontend
```bash
cd frontend/public
npm install
npm start
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/users/register | Register with email/password |
| POST | /api/users/login | Login with email/password |
| POST | /api/users/firebase-auth | Login via Firebase (Google/Facebook) |
| GET  | /api/users/profile | Get user profile (auth required) |
| POST | /ocr | Submit image for OCR (port 5001) |