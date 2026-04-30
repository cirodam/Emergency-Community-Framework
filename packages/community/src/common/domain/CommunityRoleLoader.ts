import { BaseLoader } from "@ecf/core";
import { CommunityRole } from "../CommunityRole.js";

interface RoleRecord {
    id: string;
    title: string;
    description: string;
    roleTypeId: string | null;
    memberId: string | null;
    kinPerMonth: number;
    funded: boolean;
    termStartDate: string | null;
    termEndDate: string | null;
}

export class CommunityRoleLoader extends BaseLoader<RoleRecord, CommunityRole> {
    protected serialize(role: CommunityRole): RoleRecord {
        return {
            id:            role.id,
            title:         role.title,
            description:   role.description,
            roleTypeId:    role.roleTypeId,
            memberId:      role.memberId,
            kinPerMonth:   role.kinPerMonth,
            funded:        role.funded,
            termStartDate: role.termStartDate?.toISOString() ?? null,
            termEndDate:   role.termEndDate?.toISOString()   ?? null,
        };
    }

    protected deserialize(r: RoleRecord): CommunityRole {
        const role = new CommunityRole(r.title, r.description, r.kinPerMonth, r.roleTypeId ?? null);
        (role as unknown as Record<string, unknown>)["id"] = r.id;
        role.memberId      = r.memberId;
        role.funded        = r.funded;
        role.termStartDate = r.termStartDate ? new Date(r.termStartDate) : null;
        role.termEndDate   = r.termEndDate   ? new Date(r.termEndDate)   : null;
        return role;
    }
}
