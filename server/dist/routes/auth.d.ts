declare const router: import("express-serve-static-core").Router;
/** Generate a reset token for a user and email them the link. Shared by the
 *  self-service flow here and the admin-triggered endpoint in users.ts. */
export declare function issuePasswordReset(user: {
    id: number;
    email: string;
    name: string | null;
}, opts?: {
    byAdmin?: boolean;
    ttlHours?: number;
}): Promise<boolean>;
export default router;
