import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pushUiRouter from "./push-ui";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pushUiRouter);

export default router;
