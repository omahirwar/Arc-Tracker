import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import checkRouter from "./check.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(checkRouter);

export default router;
