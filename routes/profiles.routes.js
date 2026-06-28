import { Router } from "express";
import { validateParams } from "../middlewares/validate.middleware.js";
import { uuidParamSchema } from "../schemas/posts.schema.js";
import { getPublicProfile } from "../services/profiles.service.js";

const router = Router();

router.get("/:id", validateParams(uuidParamSchema), async (req, res, next) => {
  try {
    const profile = await getPublicProfile(req.validatedParams.id);
    res.status(200).json({
      status: "success",
      data: profile,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: "error",
        message: error.message,
      });
    }
    next(error);
  }
});

export default router;
