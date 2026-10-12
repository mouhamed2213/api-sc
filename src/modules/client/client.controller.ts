import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AuthUser } from "../../types/user";
import { ClientService } from "./client.service";

// set DTO For DASH
export const ClientController = {
  getFichesDetail: asyncHandler(async (req: Request, res: Response) => {
    const result = await ClientService.detailFiche(req.user as AuthUser);

    console.log(result);
    res.status(200).json(result);
  }),
};
