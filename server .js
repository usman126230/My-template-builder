// ضروری پیکیجز کو امپورٹ کریں
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors'); // CORS کو ہینڈل کرنے کے لیے

// ایکسپریس ایپ بنائیں
const app = express();
const PORT = 3000; // ہمارا سرور اس پورٹ پر چلے گا

// CORS مڈل ویئر استعمال کریں
// یہ آپ کے فرنٹ اینڈ (جو فائل سے کھولا گیا ہے) کو بیک اینڈ سے بات کرنے کی اجازت دے گا
app.use(cors());

// Multer کو سیٹ اپ کریں تاکہ یہ تصاویر کو 'uploads' فولڈر میں محفوظ کر سکے
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // 'uploads' نام کا ایک فولڈر بنانا یقینی بنائیں
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // فائل کا نام منفرد بنانے کے لیے تاریخ اور اصل نام کا استعمال کریں
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// فارم سے آنے والے JSON اور URL-encoded ڈیٹا کو پارس کرنے کے لیے مڈل ویئر
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ایک بنیادی روٹ یہ چیک کرنے کے لیے کہ سرور چل رہا ہے
app.get('/', (req, res) => {
    res.send('بیک اینڈ سرور کامیابی سے چل رہا ہے!');
});

// ٹیمپلیٹ بنانے کے لیے API روٹ
// 'templateImage' وہی نام ہے جو HTML فارم میں input فیلڈ کا ہے
app.post('/api/create-template', upload.single('templateImage'), (req, res) => {
    
    // فارم سے آنے والا ٹیکسٹ ڈیٹا
    const title = req.body.title;
    const text = req.body.text;
    const imageFile = req.file;

    // چیک کریں کہ تمام ضروری ڈیٹا موجود ہے
    if (!title || !imageFile) {
        return res.status(400).json({ message: 'عنوان اور تصویر دونوں ضروری ہیں' });
    }

    // کنسول پر موصول شدہ ڈیٹا دکھائیں (ڈیبگنگ کے لیے)
    console.log('موصول شدہ عنوان:', title);
    console.log('موصول شدہ متن:', text);
    console.log('محفوظ شدہ تصویر:', imageFile.path);

    // یہاں، آپ اس ڈیٹا کو ڈیٹا بیس میں محفوظ کریں گے۔
    // فی الحال، ہم صرف ایک کامیابی کا پیغام واپس بھیج رہے ہیں۔

    res.status(200).json({ 
        message: 'ٹیمپلیٹ کامیابی سے بن گئی اور تصویر اپلوڈ ہو گئی!',
        data: {
            title: title,
            text: text,
            imageUrl: imageFile.path
        }
    });
});


// سرور کو شروع کریں
app.listen(PORT, () => {
    console.log(`سرور http://localhost:${PORT} پر چل رہا ہے`);
    console.log("فرنٹ اینڈ سے درخواستوں کا انتظار ہے۔۔۔");
});
