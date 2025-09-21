import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads with no size limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Infinity // No file size limit
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: 'infinity' }));
app.use(express.urlencoded({ extended: true, limit: 'infinity' }));
app.use(express.static('.'));

// Proxy endpoint for serving files
app.get('/f/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const targetUrl = `https://king454534-hf-cdn.hf.space/upload/f/${fileId}`;
    
    console.log('Proxying request to:', targetUrl);
    
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      return res.status(response.status).send('File not found');
    }
    
    // Set appropriate headers
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    const contentDisposition = response.headers.get('content-disposition');
    if (contentDisposition) {
      res.setHeader('Content-Disposition', contentDisposition);
    }
    
    // Pipe the response
    response.body.pipe(res);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Upload endpoint - correctly structured
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    console.log('Uploading file:', req.file.originalname, 'Size:', req.file.size);
    
    // Create FormData for the external CDN
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', blob, req.file.originalname);
    
    const response = await fetch('https://king454534-hf-cdn.hf.space/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Replace the URL in the response with our proxy URL
    if (data.url) {
      const originalUrl = data.url;
      // Extract the file ID from the original URL
      const fileId = originalUrl.split('/f/')[1];
      data.url = `${req.protocol}://${req.get('host')}/f/${fileId}`;
    }
    
    res.json(data);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for Vercel
export default app;
