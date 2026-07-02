import { describe, it, expect } from "vitest";
import type { ExportRow } from "@/lib/export";
import { selectedColumnKeys, projectRows, reportColumnLabel, REPORT_COLUMNS } from "@/features/reports/domain";

const fullRow: ExportRow = {
  Kode: "R-001",
  Judul: "Risiko A",
  Departemen: "Keuangan",
  Kategori: "Operasional",
  Sumber: "Internal",
  Likelihood: 3,
  Impact: 4,
  Skor: 12,
  Level: "HIGH",
  Status: "Dinilai",
  Owner: "Budi",
  "Review Berikutnya": "01 Jul 2026",
};

describe("selectedColumnKeys", () => {
  it("selalu menyertakan kolom base (Kode, Judul) meski tak ada pilihan", () => {
    expect(selectedColumnKeys([])).toEqual(["Kode", "Judul"]);
  });

  it("menambah kolom terpilih mengikuti urutan katalog, bukan urutan input", () => {
    expect(selectedColumnKeys(["status", "departemen"])).toEqual(["Kode", "Judul", "Departemen", "Status"]);
  });

  it("parameter 'penilaian' memetakan ke 4 kolom L/I/Skor/Level", () => {
    expect(selectedColumnKeys(["penilaian"])).toEqual(["Kode", "Judul", "Likelihood", "Impact", "Skor", "Level"]);
  });
});

describe("projectRows", () => {
  it("hanya menyisakan kolom terpilih + base", () => {
    const [row] = projectRows([fullRow], ["kategori"]);
    expect(Object.keys(row)).toEqual(["Kode", "Judul", "Kategori"]);
    expect(row.Kategori).toBe("Operasional");
  });

  it("mengabaikan key yang tak ada pada baris (tahan drift)", () => {
    const partial: ExportRow = { Kode: "R-002", Judul: "B" };
    const [row] = projectRows([partial], ["owner"]);
    expect(Object.keys(row)).toEqual(["Kode", "Judul"]);
  });
});

describe("reportColumnLabel", () => {
  it("mengembalikan label katalog, fallback ke id bila tak dikenal", () => {
    expect(reportColumnLabel(REPORT_COLUMNS[0].id)).toBe(REPORT_COLUMNS[0].label);
    expect(reportColumnLabel("tidak-ada")).toBe("tidak-ada");
  });
});
