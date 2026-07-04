import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateBody, validateParams } from "../middlewares/validate.middleware.js";
import { chatIdParamSchema, messageBodySchema } from "../schemas/messages.schema.js";
import { listOwnChats, listChatMessages, sendChatMessage } from "../services/messages.service.js";

const router = Router();

router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const chats = await listOwnChats(req.user.id);
    res.status(200).json({
      status: "success",
      data: chats,
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:chatId/messages",
  authMiddleware,
  validateParams(chatIdParamSchema),
  async (req, res, next) => {
    try {
      const messages = await listChatMessages(req.validatedParams.chatId, req.user.id);
      res.status(200).json({
        status: "success",
        data: messages,
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
  }
);

router.post(
  "/:chatId/messages",
  authMiddleware,
  validateParams(chatIdParamSchema),
  validateBody(messageBodySchema),
  async (req, res, next) => {
    try {
      const message = await sendChatMessage(
        req.validatedParams.chatId,
        req.user.id,
        req.validatedBody.content
      );

      res.status(201).json({
        status: "success",
        data: message,
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
  }
);

export default router;
