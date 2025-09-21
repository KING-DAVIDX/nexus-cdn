import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Infinity }
});

app.use(cors());
app.use(express.json({ limit: 'infinity' }));
app.use(express.urlencoded({ extended: true, limit: 'infinity' }));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/f/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const targetUrl = `https://king454534-hf-cdn.hf.space/upload/f/${fileId}`;
    const response = await fetch(targetUrl);
    if (!response.ok) return res.status(response.status).send('File not found');

    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    const contentDisposition = response.headers.get('content-disposition');
    if (contentDisposition) res.setHeader('Content-Disposition', contentDisposition);

    response.body.pipe(res);
  } catch (e) {
    res.status(500).send('Internal Server Error');
  }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', blob, req.file.originalname);

    const response = await fetch('https://king454534-hf-cdn.hf.space/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);
    const data = await response.json();

    if (data.url) {
      const fileId = data.url.split('/f/')[1];
      data.url = `${req.protocol}://${req.get('host')}/f/${fileId}`;
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Internal Server Error', details: e.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
export default app;
