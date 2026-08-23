import { clerkClient } from "@clerk/nextjs/server";

export type OrgMember = {
  userId: string;
  name: string;
};

/**
 * يجلب أعضاء المنظمة الحالية من Clerk لاستخدامهم في تعيين العملاء وتوزيع
 * الفريق. لا يرمي أي خطأ — فشل جلب الأعضاء يجب ألا يكسر الصفحة، فقط يُعيد
 * قائمة فارغة (تختفي عناصر التعيين بهدوء، والباقي يعمل بشكل طبيعي).
 */
export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  try {
    const client = await clerkClient();
    const { data } = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });

    return data
      .map((membership) => {
        const userId = membership.publicUserData?.userId ?? "";
        const firstName = membership.publicUserData?.firstName ?? "";
        const lastName = membership.publicUserData?.lastName ?? "";
        const fullName = `${firstName} ${lastName}`.trim();
        const name = fullName || membership.publicUserData?.identifier || "عضو";
        return { userId, name };
      })
      .filter((member) => member.userId);
  } catch (error) {
    console.error("Error fetching organization members:", error);
    return [];
  }
}
