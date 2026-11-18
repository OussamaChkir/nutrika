import { prisma } from "./db";

/**
 * Deletes the user and everything linked to them. Shared by the web action (lib/account-actions.ts)
 * and the mobile API (DELETE /api/v1/me). Steps are ordered and idempotent: if one fails, running it
 * again finishes the job. Products the user added stay in the shared catalogue, without their name.
 * The caller has already checked who is asking (and the typed-email confirmation).
 */
export async function deleteAccountData(userId: string): Promise<void> {
    await prisma.contribution.updateMany({ where: { reviewedById: userId }, data: { reviewedById: null } });
    await prisma.product.updateMany({ where: { createdById: userId }, data: { createdById: null } });
    await prisma.contribution.deleteMany({ where: { userId } });
    await prisma.profile.deleteMany({ where: { userId } });
    await prisma.scanHistory.deleteMany({ where: { userId } });
    await prisma.favorite.deleteMany({ where: { userId } });
    await prisma.savedProduct.deleteMany({ where: { userId } });
    await prisma.scanEvent.deleteMany({ where: { userId } });
    await prisma.shoppingListItem.deleteMany({ where: { userId } });
    await prisma.productFeedback.deleteMany({ where: { userId } });
    await prisma.labelScanUsage.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
}
