import type { UserRole } from '../../data/database.types';

export type { UserRole };

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  schoolName?: string;
  createdAt?: string;
}

export interface ClassItem {
  id: string;
  teacherId: string;
  teacherName: string;
  name: string;
  gradeLevel: string;
  joinCode: string;
  createdAt: string;
  memberCount: number;
}

export interface ClassMember {
  classId: string;
  studentId: string;
  studentName: string;
  studentSchool?: string;
  joinedAt: string;
  // Perhatian Privasi UU PDP: Alamat email siswa sengaja TIDAK disertakan
}
