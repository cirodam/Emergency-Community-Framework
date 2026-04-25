import { Router } from "express";
import {
    createOwner,
    getAllOwners,
    getOwner,
    setPassword,
    setPin,
    verifyPassword,
    verifyPin,
} from "./OwnerController.js";

const router = Router();

router.post("/owners",                      createOwner);
router.get( "/owners",                      getAllOwners);
router.get( "/owners/:ownerId",             getOwner);
router.post("/owners/:ownerId/password",    setPassword);
router.post("/owners/:ownerId/pin",         setPin);
router.post("/auth/password",               verifyPassword);
router.post("/auth/pin",                    verifyPin);

export default router;
