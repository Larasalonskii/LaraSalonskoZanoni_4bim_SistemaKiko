
const express = require('express');
const router = express.Router();
const multer = require('multer');

const imageController = require('../controllers/imageController.js');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.use(imageController.ensureUploadDir);

// Imagem principal do produto — rota antiga mantida.
router.post(
    '/upload-image',
    upload.single('imageFile'),
    imageController.uploadImage
);

router.get('/view-image/:produtoId', imageController.viewImage);

// Imagem individual de cada produto_tom.
router.post(
    '/upload-image-tom',
    upload.single('imageFile'),
    imageController.uploadImageTom
);

router.get(
    '/view-image-tom/:produtoTomId',
    imageController.viewImageTom
);

module.exports = router;
