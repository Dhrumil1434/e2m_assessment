import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfGenerator {
  async generate(project: any): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    const finished = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(20).text('House Renovation Estimate Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Project: ${project.name ?? project.id}`);
    doc.text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown();

    doc.fontSize(14).text('Region Summary');
    doc.moveDown(0.5);

    for (const image of project.images ?? []) {
      for (const region of image.regions ?? []) {
        doc
          .fontSize(11)
          .text(
            `- ${region.label} (${region.type}): ${region.areaSqFt ?? 'N/A'} sq.ft [${region.status}]`,
          );
      }
    }

    doc.moveDown();
    doc.fontSize(14).text('Quantity Estimations');
    doc.moveDown(0.5);

    for (const quantity of project.quantityEstimations ?? []) {
      doc
        .fontSize(11)
        .text(
          `- Final quantity: ${quantity.finalQuantity} ${quantity.unit} (${quantity.areaSqFt} sq.ft)`,
        );
    }

    doc.moveDown();
    doc.fontSize(14).text('Cost Summary');
    doc.moveDown(0.5);

    const latestCost = project.costEstimations?.[project.costEstimations.length - 1];
    if (latestCost) {
      doc.fontSize(11).text(`Material Total: ₹${latestCost.materialTotal}`);
      doc.text(`Labor Total: ₹${latestCost.laborTotal}`);
      doc.text(`Contingency: ₹${latestCost.contingency}`);
      doc.text(`Grand Total: ₹${latestCost.grandTotal}`);
      doc.text(
        `Estimated Range: ₹${latestCost.rangeLow} – ₹${latestCost.rangeHigh}`,
      );
    } else {
      doc.fontSize(11).text('No cost estimation available.');
    }

    doc.moveDown();
    doc.fontSize(10).fillColor('gray').text(
      'Disclaimer: Areas and costs are AI-estimated approximations. Verify measurements on site before procurement.',
    );

    doc.end();

    return finished;
  }
}
