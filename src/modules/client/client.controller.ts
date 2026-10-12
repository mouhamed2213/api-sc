import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";

export const ClientController = {
  getFichesDetail: asyncHandler(async (req: Request, res: Response) => {
    console.log(req.user);
  }),
};
