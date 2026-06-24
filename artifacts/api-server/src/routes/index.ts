import { Router } from "express";
import healthRouter from "./health.js";
import checkRouter from "./check.js";

const router = Router();

router.use(healthRouter);
router.use(checkRouter);

export default router;
