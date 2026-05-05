import { randomUUID } from "crypto";
import type { SessionCategory } from "./Session.js";

export type CourseStatus = "draft" | "active" | "completed" | "cancelled";

export interface Course {
    id:            string;
    title:         string;
    description:   string;
    category:      SessionCategory;
    instructorIds: string[];
    prerequisites: string; // free text; "none" if no prerequisites
    classIds:      string[]; // ordered session IDs
    status:        CourseStatus;
    // Budget approval — set when Teachers pool motion passes
    approvalMotionId:   string | null;
    budgetReservedKin:  number;
    createdAt:     string;
    updatedAt:     string;
}

export function createCourse(
    instructorId: string,
    title: string,
    description: string,
    category: SessionCategory,
    prerequisites: string = "none",
): Course {
    const now = new Date().toISOString();
    return {
        id: randomUUID(),
        title,
        description,
        category,
        instructorIds:      [instructorId],
        prerequisites,
        classIds:           [],
        status:             "draft",
        approvalMotionId:   null,
        budgetReservedKin:  0,
        createdAt:          now,
        updatedAt:          now,
    };
}
