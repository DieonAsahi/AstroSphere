import { expect, test } from '@playwright/test';

test.describe('Fitur Kuis Interaktif & Evaluasi Formatif (FR-10)', () => {
  test('Alur Kuis Cepat: mengerjakan kuis Olympus Mons, melihat umpan balik langsung per soal, dan melihat kartu skor akhir', async ({
    page,
  }) => {
    // 1. Kunjungi halaman POI Olympus Mons di planet Mars
    await page.goto('/planet/mars/olympus-mons');

    // Panel POI Olympus Mons terbuka
    await expect(
      page.getByRole('heading', { name: 'Olympus Mons' }),
    ).toBeVisible({ timeout: 10000 });

    // 2. Berpindah ke tab Kuis Cepat
    const quizTab = page.getByRole('tab', { name: /Kuis Cepat/i });
    await expect(quizTab).toBeVisible();
    await quizTab.click();

    // 3. Verifikasi soal nomor 1 dan 4 pilihan ganda
    await expect(page.getByText('Pertanyaan 1 dari 3')).toBeVisible();
    await expect(
      page.getByText(
        'Berapakah ketinggian puncak Olympus Mons dihitung dari datum referensi Mars?',
      ),
    ).toBeVisible();

    // 4. Pilih opsi yang benar (21,9 km)
    const opt1 = page.getByRole('radio', { name: /21,9 km/i });
    await opt1.click();

    // 5. Umpan balik langsung & penjelasan ilmiah NASA muncul seketika
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/Jawaban Benar!/i)).toBeVisible();
    await expect(
      page.getByText(/Data instrumen NASA Mars Global Surveyor/i),
    ).toBeVisible();

    // 6. Klik tombol Soal Berikutnya
    const nextBtn1 = page.getByRole('button', { name: /Soal Berikutnya/i });
    await nextBtn1.click();

    // 7. Jawab soal nomor 2 (lempeng tektonik)
    await expect(page.getByText('Pertanyaan 2 dari 3')).toBeVisible();
    const opt2 = page.getByRole('radio', {
      name: /tidak memiliki lempeng tektonik/i,
    });
    await opt2.click();
    await expect(page.getByText(/Jawaban Benar!/i)).toBeVisible();

    // 8. Klik tombol Soal Berikutnya
    const nextBtn2 = page.getByRole('button', { name: /Soal Berikutnya/i });
    await nextBtn2.click();

    // 9. Jawab soal nomor 3 (Gunung berapi perisai)
    await expect(page.getByText('Pertanyaan 3 dari 3')).toBeVisible();
    const opt3 = page.getByRole('radio', {
      name: /Gunung berapi perisai/i,
    });
    await opt3.click();
    await expect(page.getByText(/Jawaban Benar!/i)).toBeVisible();

    // 10. Selesaikan kuis dan lihat hasil akhir
    const finishBtn = page.getByRole('button', { name: /Lihat Hasil Akhir/i });
    await finishBtn.click();

    // 11. Verifikasi kartu ringkasan skor dan opsi ulangi kuis
    await expect(page.getByText('Hasil Kuis Astronomi')).toBeVisible();
    await expect(page.getByText(/Skor Anda: 3 dari 3 \(100%\)/i)).toBeVisible();
    await expect(
      page.getByText(/Luar biasa! Pemahaman Anda tentang fakta astronomi/i),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Ulangi Kuis/i }),
    ).toBeVisible();
  });
});
