import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './authStore';
import { ClassesPage } from './ClassesPage';
import { useClassStore } from './classStore';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';
import { RoleGuard } from './RoleGuard';
import type { UserProfile } from './types';

const mockTeacher: UserProfile = {
  id: 'teacher-dewi-101',
  email: 'dewi.guru@sekolah.id',
  name: 'Ibu Dewi',
  role: 'guru',
  schoolName: 'SMPN 1 Merauke',
};

const mockTeacherB: UserProfile = {
  id: 'teacher-budi-102',
  email: 'budi.guru@sekolah.id',
  name: 'Pak Budi Guru',
  role: 'guru',
  schoolName: 'SMPN 2 Jayapura',
};

const mockStudent: UserProfile = {
  id: 'student-ahmad-201',
  email: 'ahmad.siswa@sekolah.id',
  name: 'Ahmad Siswa',
  role: 'siswa',
  schoolName: 'SMPN 1 Merauke',
};

describe('Classes Feature & Authorization / Privacy Policies', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().signOut();
    useClassStore.getState().clearAlerts();
  });

  it('allows a teacher to create a class with a 6-character clean join code', async () => {
    const store = useClassStore.getState();
    const newClass = await store.createClass(
      mockTeacher,
      'Fisika Antariksa 8A',
      'SMP Kelas 8',
    );

    expect(newClass).not.toBeNull();
    expect(newClass?.name).toBe('Fisika Antariksa 8A');
    expect(newClass?.teacherId).toBe(mockTeacher.id);
    expect(newClass?.joinCode).toHaveLength(6);
    // Memastikan tidak ada karakter ambigu 0, O, 1, I
    expect(newClass?.joinCode).not.toMatch(/[01OIoi]/);
  });

  it('prevents students from creating classes (unauthorized role)', async () => {
    const store = useClassStore.getState();
    const result = await store.createClass(
      mockStudent,
      'Kelas Ilegal Siswa',
      'SMP Kelas 7',
    );

    expect(result).toBeNull();
    expect(useClassStore.getState().error).toMatch(/akses ditolak/i);
  });

  it('allows a student to join a class with a valid 6-character code', async () => {
    const store = useClassStore.getState();
    const created = await store.createClass(
      mockTeacher,
      'Astronomi Pemula 7B',
      'SMP Kelas 7',
    );
    expect(created).not.toBeNull();

    // Siswa bergabung menggunakan kode kelas
    const joinSuccess = await store.joinClassByCode(
      mockStudent,
      created!.joinCode,
    );
    expect(joinSuccess).toBe(true);

    const studentClasses = store.getStudentClasses(mockStudent.id);
    expect(studentClasses.some((c) => c.id === created!.id)).toBe(true);
  });

  it('rejects joining with an invalid or non-existent code', async () => {
    const store = useClassStore.getState();
    const joinSuccess = await store.joinClassByCode(mockStudent, 'ZZZZZZ');

    expect(joinSuccess).toBe(false);
    expect(useClassStore.getState().error).toMatch(
      /tidak valid atau tidak ditemukan/i,
    );
  });

  it('prevents a teacher from joining their own class', async () => {
    const store = useClassStore.getState();
    const created = await store.createClass(
      mockTeacher,
      'Mandiri 9C',
      'SMP Kelas 9',
    );

    const joinResult = await store.joinClassByCode(
      mockTeacher,
      created!.joinCode,
    );
    expect(joinResult).toBe(false);
    expect(useClassStore.getState().error).toMatch(
      /tidak dapat bergabung ke kelas yang diajarnya/i,
    );
  });

  it('enforces privacy: members list contains no emails, and other teachers/students cannot view foreign class members', async () => {
    const store = useClassStore.getState();
    const created = await store.createClass(
      mockTeacher,
      'Privasi Terjaga 7D',
      'SMP Kelas 7',
    );
    await store.joinClassByCode(mockStudent, created!.joinCode);

    // Guru pemilik dapat melihat daftar anggota
    const membersForOwner = store.getClassMembers(mockTeacher, created!.id);
    expect(membersForOwner.length).toBeGreaterThan(0);
    const member = membersForOwner[0];
    expect(member.studentName).toBe(mockStudent.name);
    // Verifikasi Privasi UU PDP: objek anggota tidak mengandung email!
    expect(
      (member as unknown as Record<string, unknown>).email,
    ).toBeUndefined();

    // Guru lain (Teacher B) dilarang melihat daftar anggota kelas milik Teacher Dewi
    const membersForTeacherB = store.getClassMembers(mockTeacherB, created!.id);
    expect(membersForTeacherB).toEqual([]);

    // Siswa juga dilarang mengintip anggota kelas guru
    const membersForStudent = store.getClassMembers(mockStudent, created!.id);
    expect(membersForStudent).toEqual([]);
  });

  it('RoleGuard redirects unauthenticated users and blocks unauthorized roles', () => {
    // 1. Belum login -> diarahkan ke /masuk
    render(
      <MemoryRouter initialEntries={['/guru-area']}>
        <Routes>
          <Route
            path="/guru-area"
            element={
              <RoleGuard allowedRoles={['guru', 'admin']}>
                <div data-testid="guru-content">Area Rahasia Guru</div>
              </RoleGuard>
            }
          />
          <Route path="/masuk" element={<div>Halaman Masuk</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Halaman Masuk')).toBeInTheDocument();
    expect(screen.queryByTestId('guru-content')).not.toBeInTheDocument();
  });

  it('RoleGuard shows access denied card when a student accesses a teacher-only route', () => {
    useAuthStore.getState().signInDemo('siswa');

    render(
      <MemoryRouter initialEntries={['/guru-area']}>
        <Routes>
          <Route
            path="/guru-area"
            element={
              <RoleGuard allowedRoles={['guru']}>
                <div data-testid="guru-content">Area Rahasia Guru</div>
              </RoleGuard>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Akses Khusus Dibatasi')).toBeInTheDocument();
    expect(screen.queryByTestId('guru-content')).not.toBeInTheDocument();
  });

  it('renders PrivacyPolicyPage and passes accessibility audit with zero axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', {
        name: /Kebijakan Privasi & Perlindungan Data Anak/i,
      }),
    ).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders ClassesPage for teacher and passes accessibility audit', async () => {
    useAuthStore.getState().signInDemo('guru');

    const { container } = render(
      <MemoryRouter>
        <ClassesPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Manajemen Kelas Astronomi/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Kelas yang Saya Ajar/i)).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
