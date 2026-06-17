import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import guestPostsRouter from "./guestPosts";
import botSessionsRouter from "./botSessions";
import stubsRouter from "./stubs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(guestPostsRouter);
router.use("/bot", botSessionsRouter);
router.use(stubsRouter);

export default router;
