import express from 'express';
import {
  obtenerTiempoEstimado
} from '../controllers/busController.js';

const router = express.Router();

router.get('/distance', obtenerTiempoEstimado);
router.get('/ping', (req, res) => {
  res.json({ ok: true, mensaje: 'Backend activo' });
});

export default router;