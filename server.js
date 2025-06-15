const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // فائل سسٹم کے ساتھ کام کرنے کے لیے
const axios = require('axios'); // API کالز کے لیے

const app = express();
const PORT = process.env.PORT || 3000;

// === ڈیٹا بیس سے کنکشن ===
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("ڈیٹا بیس سے کنکشن کامیاب ہو گیا!"))
    .catch(err => console.error("ڈیٹا بیس سے کنکشن ناکام:", err));

// === ٹیمپلیٹ کا ڈھانچہ (Schema) ===
const templateSchema = new mongoose.Schema({
    title: { type: String, required: true },
    text: String,
    imageUrl: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Template = mongoose.model('Template', templateSchema);

// === مڈل ویئر ===
app.use(cors());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// === API روٹس ===

// --- AI سے ٹیمپلیٹ بنانے کا نیا روٹ ---
app.post('/api/generate-template', async (req, res) => {
    const { title, text } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'ٹیمپلیٹ کا عنوان ضروری ہے' });
    }

    try {
        // 1. Stability AI API کو کال کریں
        const engineId = 'stable-diffusion-v1-6';
        const apiHost = 'https://api.stability.ai';
        const apiKey = process.env.STABILITY_API_KEY;

        if (!apiKey) throw new Error('Stability AI API key موجود نہیں ہے');

        const response = await axios.post(
            `${apiHost}/v1/generation/${engineId}/text-to-image`,
            {
                text_prompts: [{ text: title }],
                cfg_scale: 7,
                height: 512,
                width: 512,
                steps: 30,
                samples: 1,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
            }
        );

        const image = response.data.artifacts[0];
        const imagePath = `uploads/${Date.now()}.png`;

        // 2. موصول شدہ تصویر کو سرور پر محفوظ کریں
        fs.writeFileSync(path.join(__dirname, imagePath), Buffer.from(image.base64, 'base64'));

        // 3. نئی ٹیمپلیٹ کی معلومات ڈیٹا بیس میں محفوظ کریں
        const newTemplate = new Template({
            title: title,
            text: text,
            imageUrl: imagePath
        });
        await newTemplate.save();
        
        console.log('AI سے بنی نئی ٹیمپلیٹ ڈیٹا بیس میں محفوظ ہو گئی');
        res.status(201).json({ message: 'AI ٹیمپلیٹ کامیابی سے بن گئی!', data: newTemplate });

    } catch (error) {
        console.error("AI جنریشن میں خرابی:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'AI سے تصویر بنانے میں ناکامی' });
    }
});

// --- باقی تمام روٹس ویسے ہی رہیں گے ---

// تمام ٹیمپلیٹس حاصل کرنے کا روٹ
app.get('/api/templates', async (req, res) => {
    try {
        const templates = await Template.find().sort({ createdAt: -1 });
        res.status(200).json(templates);
    } catch (error) {
        res.status(500).json({ message: 'ڈیٹا حاصل نہیں کیا جا سکا' });
    }
});

// ایک ٹیمپلیٹ کو اپ ڈیٹ کرنے کا روٹ (تصویر کے بغیر)
app.put('/api/templates/:id', async (req, res) => {
    try {
        const { title, text } = req.body;
        const updatedTemplate = await Template.findByIdAndUpdate(req.params.id, { title, text }, { new: true });
        if (!updatedTemplate) return res.status(404).json({ message: 'ٹیمپلیٹ نہیں ملی' });
        res.status(200).json({ message: 'ٹیمپلیٹ اپ ڈیٹ ہو گئی!', data: updatedTemplate });
    } catch (error) {
        res.status(500).json({ message: 'اپ ڈیٹ کرتے وقت خرابی' });
    }
});

// ایک ٹیمپلیٹ کو ڈیلیٹ کرنے کا روٹ
app.delete('/api/templates/:id', async (req, res) => {
    try {
        const deletedTemplate = await Template.findByIdAndDelete(req.params.id);
        if (!deletedTemplate) return res.status(404).json({ message: 'ٹیمپلیٹ نہیں ملی' });
        res.status(200).json({ message: 'ٹیمپلیٹ ڈیلیٹ ہو گئی!' });
    } catch (error) {
        res.status(500).json({ message: 'ڈیلیٹ کرتے وقت خرابی' });
    }
});

// سرور کو شروع کریں
app.listen(PORT, () => {
    console.log(`سرور پورٹ ${PORT} پر کامیابی سے چل رہا ہے`);
});
