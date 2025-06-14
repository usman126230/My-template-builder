const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// === اہم لائن ===
// یہ لائن Express کو بتاتی ہے کہ public فولڈر میں موجود تمام فائلوں کو براہِ راست دکھانا ہے
app.use(express.static('public'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ٹیمپلیٹ بنانے کے لیے API روٹ
app.post('/api/create-template', upload.single('templateImage'), (req, res) => {
    
    const { title, text } = req.body;
    const imageFile = req.file;

    if (!title || !imageFile) {
        return res.status(400).json({ message: 'عنوان اور تصویر دونوں ضروری ہیں' });
    }

    console.log('موصول شدہ عنوان:', title);
    console.log('موصول شدہ متن:', text);
    console.log('محفوظ شدہ تصویر:', imageFile.path);

    res.status(200).json({ 
        message: 'ٹیمپلیٹ کامیابی سے بن گئی اور تصویر اپلوڈ ہو گئی!',
        data: {
            title: title,
            text: text,
            imageUrl: imageFile.path
        }
    });
});

app.listen(PORT, () => {
    console.log(`سرور پورٹ ${PORT} پر چل رہا ہے`);
    console.log("فرنٹ اینڈ سے درخواستوں کا انتظار ہے۔۔۔");
});

});
