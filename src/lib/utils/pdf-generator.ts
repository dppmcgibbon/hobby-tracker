import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Miniature {
  name: string;
  faction?: { name: string };
  status?: string;
  tags?: { name: string; color: string | null }[];
  created_at?: string;
}

interface PDFOptions {
  title: string;
  miniatures: Miniature[];
  includeStats?: boolean;
  includeImages?: boolean;
}

export async function generateCollectionPDF({
  title,
  miniatures,
  includeStats = true,
}: PDFOptions) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(20);
  doc.text(title, 14, 20);

  // Stats Summary
  if (includeStats) {
    doc.setFontSize(12);
    const totalCount = miniatures.length;
    const statusCounts = miniatures.reduce(
      (acc, m) => {
        const status = m.status || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    let yPos = 35;
    doc.text(`Total Miniatures: ${totalCount}`, 14, yPos);
    yPos += 7;

    Object.entries(statusCounts).forEach(([status, count]) => {
      doc.text(`  ${status}: ${count}`, 14, yPos);
      yPos += 6;
    });

    yPos += 10;

    // Table of Miniatures
    autoTable(doc, {
      startY: yPos,
      head: [["Name", "Faction", "Status", "Tags"]],
      body: miniatures.map((m) => [
        m.name,
        m.faction?.name || "N/A",
        m.status || "N/A",
        m.tags?.map((t) => t.name).join(", ") || "None",
      ]),
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });
  } else {
    autoTable(doc, {
      startY: 30,
      head: [["Name", "Faction", "Status", "Tags"]],
      body: miniatures.map((m) => [
        m.name,
        m.faction?.name || "N/A",
        m.status || "N/A",
        m.tags?.map((t) => t.name).join(", ") || "None",
      ]),
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });
  }

  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}
