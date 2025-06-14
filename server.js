const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose'); // Mongoose کو شامل کریں

const app = express();
const PORT = process.env.PORT || 3000;

// === ڈیٹا بیس سے کنکشن ===
const mongoUri = process.env.MONGO_URI; // Render کے Environment Variable سے کنکشن سٹرنگ حاصل کریں

mongoose.connect(mongoUri)
    .then(() => console.log("ڈیٹا بیس سے کنکشن کامیاب ہو گیا!"))
    .catch(err => console.error("ڈیٹا بیس سے کنکشن ناکام:", err));

// === ٹیمپلیٹ کا ڈھانچہ (Schema) بنانا ===
// یہ ہمارے ڈیٹا بیس کو بتاتا ہے کہ ہر ٹیمپلیٹ میں کیا معلومات ہوں گی
const templateSchema = new mongoose.Schema({
    title: { type: String, required: true },
    text: String,
    imageUrl: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// اسکیما سے ماڈل بنانا
const Template = mongoose.model('Template', templateSchema);


// پرانے مڈل ویئر
app.use(cors());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 'uploads' فولڈر کو تصاویر محفوظ کرنے کے لیے سیٹ اپ کریں
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// === API روٹ کو اپ ڈیٹ کرنا تاکہ وہ ڈیٹا بیس میں محفوظ کرے ===
app.post('/api/create-template', upload.single('templateImage'), async (req, res) => {
    
    const { title, text } = req.body;
    const imageFile = req.file;

    if (!title || !imageFile) {
        return res.status(400).json({ message: 'عنوان اور تصویر دونوں ضروری ہیں' });
    }

    try {
        // ایک نئی ٹیمپلیٹ بنائیں
        const newTemplate = new Template({
            title: title,
            text: text,
            imageUrl: imageFile.path // تصویر کا راستہ
        });

        // اسے ڈیٹا بیس میں محفوظ کریں
        await newTemplate.save();
        
        console.log('نئی ٹیمپلیٹ ڈیٹا بیس میں محفوظ ہو گئی:', newTemplate);

        res.status(201).json({ 
            message: 'ٹیمپلیٹ کامیابی سے ڈیٹا بیس میں محفوظ ہو گئی!',
            data: newTemplate
        });

    } catch (error) {
        console.error("ڈیٹا محفوظ کرتے وقت خرابی:", error);
        res.status(500).json({ message: 'سرور میں خرابی کی وجہ سے ڈیٹا محفوظ نہیں ہو سکا' });
    }
});
// === تمام ٹیمپلیٹس حاصل کرنے کے لیے نیا API روٹ ===
app.get('/api/templates', async (req, res) => {
    try {
        // ڈیٹا بیس سے تمام ٹیمپلیٹس تلاش کریں، اور انہیں تاریخ کے مطابق ترتیب دیں (سب سے نئی پہلے)
        const templates = await Template.find().sort({ createdAt: -1 });
        res.status(200).json(templates);
    } catch (error) {
        console.error("ڈیٹا حاصل کرتے وقت خرابی:", error);
        res.status(500).json({ message: 'سرور سے ڈیٹا حاصل نہیں کیا جا سکا' });
    }
});
// === ایک مخصوص ٹیمپلیٹ حاصل کرنے کے لیے روٹ (ID کی بنیاد پر) ===
app.get('/api/templates/:id', async (req, res) => {
    try {
        const template = await Template.findById(req.params.id);
        
        // اگر اس ID کے ساتھ کوئی ٹیمپلیٹ نہ ملے
        if (!template) {
            return res.status(404).json({ message: 'ٹیمپلیٹ نہیں ملی' });
        }
        
        // اگر مل جائے تو اسے واپس بھیج دیں
        res.status(200).json(template);

    } catch (error) {
        console.error("ایک ٹیمپلیٹ حاصل کرتے وقت خرابی:", error);
        res.status(500).json({ message: 'سرور میں خرابی' });
    }
});

// === ایک ٹیمپلیٹ کو اپ ڈیٹ کرنے کے لیے روٹ (ID کی بنیاد پر) ===
// === ایک ٹیمپلیٹ کو اپ ڈیٹ کرنے کے لیے نیا اور بہتر روٹ ===
app.put('/api/templates/:id', upload.single('templateImage'), async (req, res) => {
    try {
        const { title, text } = req.body;
        const template = await Template.findById(req.params.id);

        if (!template) {
            return res.status(404).json({ message: 'اپ ڈیٹ کرنے کے لیے ٹیمپلیٹ نہیں ملی' });
        }

        // اپ ڈیٹ کرنے کے لیے نئی معلومات تیار کریں
        template.title = title;
        template.text = text;
        
        // اگر کوئی نئی فائل اپلوڈ ہوئی ہے، تو تصویر کا راستہ بھی اپ ڈیٹ کریں
        if (req.file) {
            template.imageUrl = req.file.path;
        }

        // اپ ڈیٹ شدہ ٹیمپلیٹ کو ڈیٹا بیس میں محفوظ کریں
        const updatedTemplate = await template.save();

        res.status(200).json({ message: 'ٹیمپلیٹ کامیابی سے اپ ڈیٹ ہو گئی!', data: updatedTemplate });

    } catch (error) {
        console.error("ٹیمپلیٹ اپ ڈیٹ کرتے وقت خرابی:", error);
        res.status(500).json({ message: 'سرور میں خرابی' });
    }
});



// سرور کو شروع کریں
app.listen(PORT, () => {
    console.log(`سرور پورٹ ${PORT} پر کامیابی سے چل رہا ہے`);
});
