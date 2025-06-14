import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { GroupController } from "@/modules/group";
import {
  CreateGroupsSchema,
  GroupsIdShema,
  GroupsQuerySchema,
  UpdateGroupsSchema,
  deleteGroupsesSchema,
} from "./screen.schema";
import { authenticate, role } from "@/middlewares/auth";
const groupRouter = Router();
// prive

groupRouter.get(
  "/",
  authenticate,
  role("Admin"),
  validateQuery(GroupsQuerySchema),
  GroupController.getAlls
);

groupRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(GroupsIdShema),
  GroupController.getById
);

groupRouter.post(
  "/",
  authenticate,
  role("Admin"),
  validateBody(CreateGroupsSchema),
  GroupController.create
);

groupRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdateGroupsSchema),
  validateParams(GroupsIdShema),
  GroupController.update
);

groupRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(GroupsIdShema),
  GroupController.delete
);

groupRouter.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteGroupsesSchema),
  GroupController.deletes
);

export { groupRouter };
