const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
// Render جیسی سروسز کے لیے یہ لائن اہم ہے
const PORT = process.env.PORT || 3000;

app.use(cors());

// public فولڈر میں موجود HTML/CSS/JS فائلوں کو دکھانے کے لیے
app.use(express.static('public'));

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

// API روٹ جو تصویر اور ڈیٹا وصول کرے گا
app.post('/api/create-template', upload.single('templateImage'), (req, res) => {
    
    const { title, text } = req.body;
    const imageFile = req.file;

    if (!title || !imageFile) {
        return res.status(400).json({ message: 'عنوان اور تصویر دونوں ضروری ہیں' });
    }

    console.log('ڈیٹا موصول ہوا:', { title, text, imagePath: imageFile.path });

    res.status(200).json({ 
        message: 'ٹیمپلیٹ کامیابی سے بن گئی!',
        data: {
            title: title,
            text: text,
            imageUrl: imageFile.path
        }
    });
});

// سرور کو شروع کریں
app.listen(PORT, () => {
    console.log(`سرور پورٹ ${PORT} پر کامیابی سے چل رہا ہے`);
});
