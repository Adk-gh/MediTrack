# MediTrack Setup Guide

This guide provides step-by-step instructions for cloning and setting up the MediTrack project on a new computer.

## Prerequisites

Before you begin, ensure you have the following installed:

| Software | Version | Required For                 |
| -------- | ------- | ---------------------------- |
| Node.js  | 18+     | Backend & Frontend           |
| Python   | 3.8+    | OCR Service                  |
| Git      | Latest  | Cloning repository           |
| npm      | Latest  | Installing Node dependencies |

***

## Step 1: Clone the Repository

Open your terminal and run:

```Shell
git clone https://github.com/Adk-gh/MediTrack.git
cd MediTrack
```

***

## Step 2: Environment Setup

### Option A: Using Existing Environment Variables

If you're setting up on a new machine, you'll need to configure Supabase:

1. Copy the `.env` file (if provided) to the project root
2. Or create a new `.env` file with the required variables:

```env
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
OCR_SERVICE_URL=http://localhost:5001
PORT=5000

VITE_API_URL=http://localhost:5000/api

# Supabase (optional - for additional features)
supabaseUrl=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

***

## Step 3: Install Backend Dependencies

From the project root:

```Shell
npm install
```

This installs:

* Express.js
* Supabase SDK
* JSON Web Token
* Multer (file uploads)
* Zod (validation)
* Axios
* CORS
* Dotenv

***

## Step 4: Install Frontend Dependencies

```Shell
cd frontend
npm install
```

This installs:

* React 19
* Ionic Framework
* TailwindCSS
* Chart.js
* React Router
* Capacitor (for mobile builds)

After installation, go back to the root:

```Shell
cd ..
```

***

## Step 5: Set Up OCR Service (Python)

### Option A: Using Virtual Environment (Recommended)

```Shell
cd backend/ocr_service

# Create virtual environment
python -m venv venv_ocr

# Activate virtual environment
# On Windows (PowerShell):
.\venv_ocr\Scripts\Activate.ps1

# On Windows (CMD):
venv_ocr\Scripts\activate.bat

# On Linux/Mac:
source venv_ocr/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Option B: Using Conda

```Shell
cd backend/ocr_service
conda create -n meditrack-ocr python=3.10
conda activate meditrack-ocr
pip install -r requirements.txt
```

**Requirements installed:**

* Flask & Flask-CORS
* Pillow (image processing)
* PaddlePaddle 2.6.2
* PaddleOCR 2.7.0.3
* PyMuPDF 1.20.2
* Gunicorn
* NumPy < 2.0.0

***

## Step 6: Run the Application

You need to run **three** separate terminals:

### Terminal 1: Backend (Port 5000)

```Shell
node app.js
```

### Terminal 2: OCR Service (Port 5001)

```Shell
cd backend/ocr_service
.\venv_ocr\Scripts\Activate.ps1
python ocr_service.py
```

For production:

```Shell
gunicorn -w 2 -b 0.0.0.0:5001 ocr_service:app
```

### Terminal 3: Frontend (Port 3000)

```Shell
cd frontend
npm run dev
```

Or for production build:

```Shell
npm start
```

***

## Step 7: Access the Application

| Service     | URL                     |
| ----------- | ----------------------- |
| Frontend    | <http://localhost:3000> |
| Backend API | <http://localhost:5000> |
| OCR Service | <http://localhost:5001> |

***

## Mobile App Setup (Optional)

### Android

```Shell
cd frontend
npx cap sync
npx cap open android
```

This opens Android Studio. Build the APK from there.

### iOS

```Shell
cd frontend
npx cap sync
npx cap open ios
```

This opens Xcode. Build from there.

***

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```Shell
   # Find process using port
   netstat -ano | findstr :5000

   # Kill process (replace PID)
   taskkill /PID <PID> /F
   ```

2. **Supabase Connection Error**
   * Verify your `supabaseUrl` is correct
   * Check that your Supabase keys are valid

3. **OCR Service Not Starting**
   * Ensure PaddlePaddle is properly installed
   * Check if GPU drivers are available (optional)

4. **Frontend Not Loading**
   * Verify backend is running on port 5000
   * Check `.env` has `VITE_API_URL` set correctly

5. **Node Modules Issues**
   ```Shell
   rm -rf node_modules package-lock.json
   npm install
   ```

***

## Project Structure

```
MediTrack/
├── app.js                 # Express backend entry
├── .env                   # Environment variables
├── package.json           # Root dependencies
├── backend/
│   └── ocr_service/       # Python OCR service
│       ├── ocr_service.py
│       ├── requirements.txt
│       └── venv_ocr/      # Virtual environment
├── frontend/              # React application
│   ├── src/
│   ├── package.json
│   └── capacitor.config.json
└── SETUP.md              # This file
```

***

## Additional Resources

* [Supabase Dashboard](https://supabase.com/dashboard)
* [PaddleOCR Documentation](https://github.com/PaddlePaddle/PaddleOCR)
* [Ionic Framework](https://ionicframework.com)
* [Capacitor Docs](https://capacitorjs.com)

***

## Support

For issues, check the main [README.md](./README.md) or open an issue on GitHub.
