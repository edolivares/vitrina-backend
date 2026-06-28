import { Router } from "express";
import { getRegions, getCitiesByRegion } from "../services/location.service.js";

const router = Router();

router.get("/regions", async (req, res, next) => {
  try {
    const regions = await getRegions();
    res.status(200).json({
      status: "success",
      data: regions,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/regions/:regionId/cities", async (req, res, next) => {
  try {
    const regionId = Number(req.params.regionId);
    if (isNaN(regionId)) {
      return res.status(400).json({
        status: "error",
        message: "El parámetro regionId debe ser un número válido",
      });
    }

    const cities = await getCitiesByRegion(regionId);
    res.status(200).json({
      status: "success",
      data: cities,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
