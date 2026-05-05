import { randomUUID } from "crypto";

export type SessionCategory =
    | "practical-skills"
    | "health-wellness"
    | "arts-culture"
    | "civic-governance"
    | "languages"
    | "trades"
    | "agriculture"
    | "other";

export type SessionStatus =
    | "draft"
    | "pending-approval"
    | "approved"
    | "cancelled"
    | "completed";

export interface InstructorSplit {
    personId: string;
    handle:   string;
    pct:      number; // 0–100; all splits must sum to 100
}

export interface AttendanceRecord {
    memberId:   string;
    attended:   boolean;
    recordedAt: string;
}

export interface LyceumSession {
    id:                 string;
    courseId:           string | null;
    title:              string;
    description:        string;
    category:           SessionCategory;
    instructorIds:      string[];        // member IDs; creator is always first
    instructorSplits:   InstructorSplit[];
    scheduledAt:        string;          // ISO 8601
    durationMinutes:    number;
    location:           string;          // physical address or "Online"
    capacity:           number | null;   // null = unlimited
    instructorRateKin:  number;          // total kin to all instructors per session
    studentStipendKin:  number;          // kin per attending student
    status:             SessionStatus;
    approvalMotionId:   string | null;
    enrollmentIds:      string[];
    attendanceLog:      AttendanceRecord[];
    createdAt:          string;
    updatedAt:          string;
}

export function createSession(
    instructorId: string,
    instructorHandle: string,
    title: string,
    description: string,
    category: SessionCategory,
    scheduledAt: string,
    durationMinutes: number,
    location: string,
    instructorRateKin: number,
    studentStipendKin: number,
    capacity: number | null,
    courseId: string | null = null,
    instructorSplits: InstructorSplit[] = [{ personId: instructorId, handle: instructorHandle, pct: 100 }],
): LyceumSession {
    const now = new Date().toISOString();
    return {
        id: randomUUID(),
        courseId,
        title,
        description,
        category,
        instructorIds:    [instructorId],
        instructorSplits,
        scheduledAt,
        durationMinutes,
        location,
        capacity,
        instructorRateKin,
        studentStipendKin,
        status:           "draft",
        approvalMotionId: null,
        enrollmentIds:    [],
        attendanceLog:    [],
        createdAt:        now,
        updatedAt:        now,
    };
}
