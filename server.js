const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cloudinary = require('cloudinary').v2; // Cloudinary لائبریری

const app = express();
const PORT = process.env.PORT || 3000;

// === Cloudinary کنفیگریشن ===
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// === ڈیٹا بیس سے کنکشن ===
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("ڈیٹا بیس سے کنکشن کامیاب ہو گیا!"))
    .catch(err => console.error("ڈیٹا بیس سے کنکشن ناکام:", err));

// === ٹیمپلیٹ کا ڈھانچہ (Schema) ===
const templateSchema = new mongoose.Schema({
    title: { type: String, required: true },
    text: String,
    imageUrl: { type: String, required: true }, // یہاں اب Cloudinary کا URL آئے گا
    createdAt: { type: Date, default: Date.now }
});
const Template = mongoose.model('Template', templateSchema);

// === مڈل ویئر ===
app.use(cors());
app.use(express.static('public'));
// اب ہمیں '/uploads' فولڈر کی ضرورت نہیں ہے، اس لیے وہ لائن ہٹا دی گئی ہے
app.use(express.json());

// === API روٹس ===

// --- AI سے ٹیمپلیٹ بنانے کا نیا روٹ (Cloudinary کے ساتھ) ---
app.post('/api/generate-template', async (req, res) => {
    const { title, text } = req.body;
    if (!title) return res.status(400).json({ message: 'ٹیمپلیٹ کا عنوان ضروری ہے' });

    try {
        // 1. Stability AI API کو کال کریں
        const engineId = 'stable-diffusion-v1-6';
        const apiHost = 'https://api.stability.ai';
        const apiKey = process.env.STABILITY_API_KEY;
        if (!apiKey) throw new Error('Stability AI API key موجود نہیں ہے');

        const response = await axios.post(
            `${apiHost}/v1/generation/${engineId}/text-to-image`,
            { text_prompts: [{ text: title }], cfg_scale: 7, height: 512, width: 512, steps: 30, samples: 1 },
            { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${apiKey}` } }
        );

        const imageArtifact = response.data.artifacts[0];
        const base64Image = imageArtifact.base64;

        // 2. تصویر کو براہ راست Cloudinary پر اپلوڈ کریں
        const cloudinaryResponse = await cloudinary.uploader.upload(
          `data:image/png;base64,${base64Image}`,
          { folder: "ai_templates" } // Cloudinary پر ایک فولڈر بنا دے گا
        );

        // 3. نئی ٹیمپلیٹ کی معلومات (Cloudinary URL کے ساتھ) ڈیٹا بیس میں محفوظ کریں
        const newTemplate = new Template({
            title: title,
            text: text,
            imageUrl: cloudinaryResponse.secure_url // Cloudinary کا مستقل URL
        });
        await newTemplate.save();

        res.status(201).json({ message: 'AI ٹیمپلیٹ کامیابی سے بن گئی!', data: newTemplate });

    } catch (error) {
        console.error("AI جنریشن میں خرابی:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'AI سے تصویر بنانے میں ناکامی' });
    }
});

// --- باقی روٹس ---
app.get('/api/templates', async (req, res) => {
    try {
        const templates = await Template.find().sort({ createdAt: -1 });
        res.status(200).json(templates);
    } catch (error) {
        res.status(500).json({ message: 'ڈیٹا حاصل نہیں کیا جا سکا' });
    }
});

app.delete('/api/templates/:id', async (req, res) => {
    try {
        const deletedTemplate = await Template.findByIdAndDelete(req.params.id);
        if (!deletedTemplate) return res.status(404).json({ message: 'ٹیمپلیٹ نہیں ملی' });
        // نوٹ: آپ Cloudinary سے بھی تصویر ڈیلیٹ کرنے کا کوڈ یہاں لکھ سکتے ہیں (ایڈوانسڈ)
        res.status(200).json({ message: 'ٹیمپلیٹ ڈیلیٹ ہو گئی!' });
    } catch (error) {
        res.status(500).json({ message: 'ڈیلیٹ کرتے وقت خرابی' });
    }
});

app.listen(PORT, () => console.log(`سرور پورٹ ${PORT} پر کامیابی سے چل رہا ہے`));
