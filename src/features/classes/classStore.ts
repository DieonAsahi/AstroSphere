import { create } from 'zustand';
import { id } from '../../lib/i18n/id';
import type { ClassItem, ClassMember, UserProfile } from './types';

interface ClassState {
  classes: ClassItem[];
  memberships: ClassMember[];
  isLoading: boolean;
  error: string | null;
  message: string | null;

  createClass: (
    teacher: UserProfile,
    name: string,
    gradeLevel: string,
  ) => Promise<ClassItem | null>;
  joinClassByCode: (student: UserProfile, joinCode: string) => Promise<boolean>;
  leaveClass: (studentId: string, classId: string) => Promise<boolean>;
  getTeacherClasses: (teacherId: string) => ClassItem[];
  getStudentClasses: (studentId: string) => ClassItem[];
  getClassMembers: (requester: UserProfile, classId: string) => ClassMember[];
  clearAlerts: () => void;
}

const CLASSES_STORAGE_KEY = 'astrosphere_classes_data';
const MEMBERSHIPS_STORAGE_KEY = 'astrosphere_memberships_data';

// Karakter acak bersih (tanpa 0, O, 1, I yang mudah tertukar pada layar sekolah)
const CLEAN_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateCleanJoinCode(existingCodes: Set<string>): string {
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      const idx = Math.floor(Math.random() * CLEAN_CHARS.length);
      code += CLEAN_CHARS[idx];
    }
  } while (existingCodes.has(code));
  return code;
}

// Data awal contoh kelas untuk demonstrasi & tes
const INITIAL_CLASSES: ClassItem[] = [
  {
    id: 'class-demo-001',
    teacherId: 'user-guru-demo-002',
    teacherName: 'Ibu Dewi Kartika, M.Pd.',
    name: 'Astronomi Dasar 7A',
    gradeLevel: 'SMP Kelas 7',
    joinCode: 'K7X8M2',
    createdAt: '2026-10-31T08:00:00Z',
    memberCount: 2,
  },
  {
    id: 'class-demo-002',
    teacherId: 'user-guru-demo-002',
    teacherName: 'Ibu Dewi Kartika, M.Pd.',
    name: 'Klub Sains Angkasa 8B',
    gradeLevel: 'SMP Kelas 8',
    joinCode: 'P9W3N4',
    createdAt: '2026-10-31T09:00:00Z',
    memberCount: 1,
  },
];

const INITIAL_MEMBERSHIPS: ClassMember[] = [
  {
    classId: 'class-demo-001',
    studentId: 'user-siswa-demo-001',
    studentName: 'Budi Prakoso',
    studentSchool: 'SMP Negeri 1 Merauke',
    joinedAt: '2026-10-31T08:30:00Z',
  },
  {
    classId: 'class-demo-001',
    studentId: 'user-siswa-demo-004',
    studentName: 'Siti Rahma',
    studentSchool: 'SMP Negeri 1 Merauke',
    joinedAt: '2026-10-31T09:15:00Z',
  },
  {
    classId: 'class-demo-002',
    studentId: 'user-siswa-demo-001',
    studentName: 'Budi Prakoso',
    studentSchool: 'SMP Negeri 1 Merauke',
    joinedAt: '2026-10-31T09:30:00Z',
  },
];

function loadStoredClasses(): ClassItem[] {
  if (typeof window === 'undefined') return INITIAL_CLASSES;
  try {
    const raw = localStorage.getItem(CLASSES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_CLASSES;
  } catch {
    return INITIAL_CLASSES;
  }
}

function loadStoredMemberships(): ClassMember[] {
  if (typeof window === 'undefined') return INITIAL_MEMBERSHIPS;
  try {
    const raw = localStorage.getItem(MEMBERSHIPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_MEMBERSHIPS;
  } catch {
    return INITIAL_MEMBERSHIPS;
  }
}

function persistState(classes: ClassItem[], memberships: ClassMember[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CLASSES_STORAGE_KEY, JSON.stringify(classes));
    localStorage.setItem(MEMBERSHIPS_STORAGE_KEY, JSON.stringify(memberships));
  }
}

export const useClassStore = create<ClassState>((set, get) => ({
  classes: loadStoredClasses(),
  memberships: loadStoredMemberships(),
  isLoading: false,
  error: null,
  message: null,

  clearAlerts: () => set({ error: null, message: null }),

  createClass: async (teacher, name, gradeLevel) => {
    set({ isLoading: true, error: null, message: null });

    // Validasi izin peran
    if (teacher.role !== 'guru' && teacher.role !== 'admin') {
      set({
        isLoading: false,
        error: id.auth.errors.unauthorizedRole,
      });
      return null;
    }

    const trimmedName = name.trim();
    const trimmedGrade = gradeLevel.trim();

    if (!trimmedName) {
      set({ isLoading: false, error: id.classes.errors.classNameRequired });
      return null;
    }
    if (!trimmedGrade) {
      set({ isLoading: false, error: id.classes.errors.gradeLevelRequired });
      return null;
    }

    const currentClasses = get().classes;
    const existingCodes = new Set(currentClasses.map((c) => c.joinCode));
    const joinCode = generateCleanJoinCode(existingCodes);

    const newClass: ClassItem = {
      id: `class-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      teacherId: teacher.id,
      teacherName: teacher.name,
      name: trimmedName,
      gradeLevel: trimmedGrade,
      joinCode,
      createdAt: new Date().toISOString(),
      memberCount: 0,
    };

    const updatedClasses = [newClass, ...currentClasses];
    persistState(updatedClasses, get().memberships);

    set({
      classes: updatedClasses,
      isLoading: false,
      message: `${id.classes.createClassTitle} "${trimmedName}" berhasil dibuat dengan kode: ${joinCode}`,
    });

    return newClass;
  },

  joinClassByCode: async (student, joinCode) => {
    set({ isLoading: true, error: null, message: null });

    const normalizedCode = joinCode.trim().toUpperCase();
    if (!normalizedCode || normalizedCode.length !== 6) {
      set({ isLoading: false, error: id.classes.errors.invalidCode });
      return false;
    }

    const targetClass = get().classes.find(
      (c) => c.joinCode === normalizedCode,
    );
    if (!targetClass) {
      set({ isLoading: false, error: id.classes.errors.invalidCode });
      return false;
    }

    // Guru tidak bisa bergabung ke kelas buatannya sendiri
    if (targetClass.teacherId === student.id) {
      set({
        isLoading: false,
        error: id.classes.errors.cannotJoinOwnClass,
      });
      return false;
    }

    // Periksa apakah sudah terdaftar
    const alreadyJoined = get().memberships.some(
      (m) => m.classId === targetClass.id && m.studentId === student.id,
    );
    if (alreadyJoined) {
      set({
        isLoading: false,
        error: id.classes.errors.alreadyJoined,
      });
      return false;
    }

    // Tambah keanggotaan (Privasi UU PDP: email sengaja tidak disimpan di objek anggota)
    const newMember: ClassMember = {
      classId: targetClass.id,
      studentId: student.id,
      studentName: student.name,
      studentSchool: student.schoolName,
      joinedAt: new Date().toISOString(),
    };

    const updatedMemberships = [...get().memberships, newMember];
    const updatedClasses = get().classes.map((c) =>
      c.id === targetClass.id ? { ...c, memberCount: c.memberCount + 1 } : c,
    );

    persistState(updatedClasses, updatedMemberships);

    set({
      classes: updatedClasses,
      memberships: updatedMemberships,
      isLoading: false,
      message: `Berhasil bergabung ke kelas "${targetClass.name}"!`,
    });

    return true;
  },

  leaveClass: async (studentId, classId) => {
    set({ isLoading: true, error: null, message: null });

    const updatedMemberships = get().memberships.filter(
      (m) => !(m.classId === classId && m.studentId === studentId),
    );

    const updatedClasses = get().classes.map((c) => {
      if (c.id === classId) {
        return { ...c, memberCount: Math.max(0, c.memberCount - 1) };
      }
      return c;
    });

    persistState(updatedClasses, updatedMemberships);

    set({
      classes: updatedClasses,
      memberships: updatedMemberships,
      isLoading: false,
      message: 'Anda telah keluar dari kelas.',
    });

    return true;
  },

  getTeacherClasses: (teacherId) => {
    const memberships = get().memberships;
    return get()
      .classes.filter((c) => c.teacherId === teacherId)
      .map((c) => ({
        ...c,
        memberCount: memberships.filter((m) => m.classId === c.id).length,
      }));
  },

  getStudentClasses: (studentId) => {
    const studentClassIds = new Set(
      get()
        .memberships.filter((m) => m.studentId === studentId)
        .map((m) => m.classId),
    );
    const memberships = get().memberships;
    return get()
      .classes.filter((c) => studentClassIds.has(c.id))
      .map((c) => ({
        ...c,
        memberCount: memberships.filter((m) => m.classId === c.id).length,
      }));
  },

  getClassMembers: (requester, classId) => {
    const targetClass = get().classes.find((c) => c.id === classId);
    if (!targetClass) return [];

    // Kebijakan RLS: Hanya guru pemilik kelas tersebut (atau admin) yang boleh melihat daftar anggota
    const isOwnerTeacher = targetClass.teacherId === requester.id;
    const isAdmin = requester.role === 'admin';

    if (!isOwnerTeacher && !isAdmin) {
      // Siswa lain dilarang mengintip daftar anggota kelas guru lain
      return [];
    }

    return get().memberships.filter((m) => m.classId === classId);
  },
}));
