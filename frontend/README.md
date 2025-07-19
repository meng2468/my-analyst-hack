# MyAnalyst Frontend

This is the Next.js frontend for the MyAnalyst application.

## File Upload Functionality

The file upload component now uses the FastAPI backend endpoint at `/api/upload-csv`. 

### How it works:

1. **Frontend**: The `FileUpload` component in `app/_components/file-upload.tsx` handles file selection and upload
2. **Backend**: Files are uploaded to the FastAPI backend at `http://localhost:7860/api/upload-csv`
3. **Storage**: Files are saved in the `backend/data/` directory with the session ID as the filename

### Setup:

1. Make sure the FastAPI backend is running on port 7860:
   ```bash
   cd backend
   python main.py
   ```

2. Start the Next.js frontend:
   ```bash
   npm run dev
   ```

3. The frontend will be available at `http://localhost:3000`

### Environment Variables:

- `NEXT_PUBLIC_BACKEND_URL`: Set this to override the default backend URL (defaults to `http://localhost:7860`)

### Features:

- Drag and drop file upload
- CSV file validation
- Progress indicators
- Error handling
- Session-based file naming
