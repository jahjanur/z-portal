import { Request, Response, NextFunction } from "express";
interface AuthRequest extends Request {
    user?: {
        userId: number;
        role: string;
    };
}
export declare function verifyJWT(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function verifyAdmin(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export {};
