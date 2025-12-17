const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = config.upload.profilePath;
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = config.upload.documentPath;
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const imageFilter = (req, file, cb) => {
  if (config.upload.allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar (JPG, PNG) yang diizinkan'), false);
  }
};

const documentFilter = (req, file, cb) => {
  const allowedTypes = [...config.upload.allowedImageTypes, 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar atau PDF yang diizinkan'), false);
  }
};

const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: imageFilter
});

const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: documentFilter
});

const optimizeImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const filePath = req.file.path;
    const outputPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '_optimized.jpg');

    await sharp(filePath)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    fs.unlinkSync(filePath);
    
    req.file.path = outputPath;
    req.file.filename = path.basename(outputPath);

    next();
  } catch (error) {
    next(error);
  }
};

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `Ukuran file maksimal ${config.upload.maxFileSize / (1024 * 1024)}MB`
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

module.exports = {
  uploadProfile,
  uploadDocument,
  optimizeImage,
  handleUploadError
};
