const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { whatsappLimiter } = require('../middleware/rateLimit');

router.get('/status', verifyToken, requireAdmin, whatsappController.getStatus);
router.post('/connect', verifyToken, requireAdmin, whatsappController.connect);
router.post('/disconnect', verifyToken, requireAdmin, whatsappController.disconnect);
router.post('/send', verifyToken, whatsappLimiter, whatsappController.sendMessage);
router.get('/sessions', verifyToken, requireAdmin, whatsappController.getSessions);

module.exports = router;
