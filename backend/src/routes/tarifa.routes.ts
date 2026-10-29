import { Router } from 'express';
import { TarifaController } from '../controllers/tarifa.controller.js';

const router = Router();

router.post('/calcular', TarifaController.calcular);

export default router;