import { Router } from "express";
import {
  createClient,
  deleteClient,
  deleteVisit,
  getClientById,
  getClients,
  registerVisit,
  updateClient
} from "../controllers/clients.controller.js";
import { activateSubscription } from "../controllers/subscriptions.controller.js";

export const clientsRouter = Router();

clientsRouter.get("/", getClients);
clientsRouter.post("/", createClient);
clientsRouter.get("/:clientId", getClientById);
clientsRouter.patch("/:clientId", updateClient);
clientsRouter.delete("/:clientId", deleteClient);
clientsRouter.post("/:clientId/subscriptions", activateSubscription);
clientsRouter.post("/:clientId/visits", registerVisit);
clientsRouter.delete("/:clientId/visits/:visitId", deleteVisit);
