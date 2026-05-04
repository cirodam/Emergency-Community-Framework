import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as applications from "./ApplicationController.js";

const applyRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many applications submitted from this IP, please try again later." },
});

const router = Router();

router.post("/apply", applyRateLimit, applications.publicSubmitApplication);

export default router;
