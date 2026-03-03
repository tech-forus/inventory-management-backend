const PDFDocument = require('pdfkit');
const { format } = require('date-fns');

/**
 * Generates a professional quotation PDF.
 * @param {Object} data - Quotation data including items and company info.
 * @returns {Promise<Buffer>} - The generated PDF buffer.
 */
async function generateQuotationPDF(data) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // --- Colors & Styling ---
        const primaryColor = '#4f46e5';
        const textColor = '#1f2937';
        const lightTextColor = '#6b7280';
        const borderColor = '#e5e7eb';

        // --- Header ---
        doc.fillColor(primaryColor).rect(0, 0, doc.page.width, 60).fill();
        doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('QUOTATION', 40, 20);

        doc.fontSize(10).font('Helvetica').text(`${data.quote_no || ''}  ·  ${data.version || 'V1'}`, doc.page.width - 200, 25, { align: 'right', width: 160 });

        let y = 80;

        // --- Meta Information ---
        doc.fillColor(textColor).fontSize(9).font('Helvetica-Bold').text('Date:', 40, y);
        doc.font('Helvetica').text(data.quote_date ? format(new Date(data.quote_date), 'dd MMM yyyy') : '-', 75, y);

        doc.font('Helvetica-Bold').text('Valid Until:', 180, y);
        doc.font('Helvetica').text(data.valid_until ? format(new Date(data.valid_until), 'dd MMM yyyy') : '-', 235, y);

        doc.font('Helvetica-Bold').text('Prepared By:', 350, y);
        doc.font('Helvetica').text(data.assigned_to_name || 'Sales Department', 415, y);

        y += 25;

        // --- Bill To / Ship To ---
        doc.fillColor('#f9fafb').rect(40, y, 250, 80).fill();
        doc.fillColor('#f9fafb').rect(305, y, 250, 80).fill();

        doc.fillColor(lightTextColor).fontSize(8).font('Helvetica-Bold').text('BILL TO', 50, y + 10);
        doc.text('SHIP TO', 315, y + 10);

        doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold').text(data.customer_company || data.customer_name || '—', 50, y + 25, { width: 230 });
        doc.fontSize(9).font('Helvetica').text(data.billing_address || '—', 50, y + 40, { width: 230, height: 30 });
        if (data.customer_gst_no) {
            doc.fontSize(8).font('Helvetica-Bold').text(`GST: ${data.customer_gst_no}`, 50, y + 70);
        }

        doc.fontSize(10).font('Helvetica-Bold').text(data.customer_company || data.customer_name || '—', 315, y + 25, { width: 230 });
        doc.fontSize(9).font('Helvetica').text(data.consigning_address || data.billing_address || '—', 315, y + 40, { width: 230, height: 30 });

        y += 100;

        // --- Items Table Header ---
        const tableTop = y;
        doc.fillColor(primaryColor).rect(40, tableTop, 515, 20).fill();
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

        doc.text('#', 45, tableTop + 6, { width: 20 });
        doc.text('Item Description', 70, tableTop + 6, { width: 110 });
        doc.text('Brand', 185, tableTop + 6, { width: 50 });
        doc.text('HSN', 235, tableTop + 6, { width: 40, align: 'center' });
        doc.text('Qty', 275, tableTop + 6, { width: 30, align: 'center' });
        doc.text('Unit', 310, tableTop + 6, { width: 35, align: 'center' });
        doc.text('Rate', 350, tableTop + 6, { width: 50, align: 'right' });
        doc.text('Disc%', 405, tableTop + 6, { width: 35, align: 'center' });
        doc.text('GST%', 445, tableTop + 6, { width: 35, align: 'center' });
        doc.text('Amount', 485, tableTop + 6, { width: 65, align: 'right' });

        y = tableTop + 20;

        // --- Items Table Rows ---
        doc.fillColor(textColor).font('Helvetica').fontSize(8);
        const items = data.items || [];

        items.forEach((item, i) => {
            const rowHeight = 20;
            if (y + rowHeight > 750) {
                doc.addPage();
                y = 40;
            }

            if (i % 2 === 1) {
                doc.fillColor('#f9fafb').rect(40, y, 515, rowHeight).fill();
            }

            doc.fillColor(textColor);
            doc.text(i + 1, 45, y + 6);
            doc.text(item.item_name || '—', 70, y + 6, { width: 110, height: rowHeight, ellipsis: true });
            doc.text(item.brand || '—', 185, y + 6, { width: 50, height: rowHeight, ellipsis: true });
            doc.text(item.hsn || '—', 235, y + 6, { width: 40, align: 'center' });
            doc.text(item.qty || 0, 275, y + 6, { width: 30, align: 'center' });
            doc.text(item.unit || '—', 310, y + 6, { width: 35, align: 'center' });
            doc.text((Number(item.rate) || 0).toLocaleString('en-IN'), 350, y + 6, { width: 50, align: 'right' });

            // Show discount/gst even if 0, but as "—" if truly null/undefined
            const dVal = (item.discount_pct !== undefined && item.discount_pct !== null) ? `${item.discount_pct}%` : '—';
            const gVal = (item.gst_pct !== undefined && item.gst_pct !== null) ? `${item.gst_pct}%` : '—';

            doc.text(dVal, 405, y + 6, { width: 35, align: 'center' });
            doc.text(gVal, 445, y + 6, { width: 35, align: 'center' });
            doc.text((Number(item.amount) || 0).toLocaleString('en-IN'), 485, y + 6, { width: 65, align: 'right' });

            doc.strokeColor(borderColor).lineWidth(0.5).moveTo(40, y + rowHeight).lineTo(555, y + rowHeight).stroke();
            y += rowHeight;
        });

        y += 15;

        // --- Totals Section ---
        const totalsX = 350;
        const fmt = (v) => (v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

        const rows = [
            ['Subtotal', fmt(data.subtotal)],
            [`Discount (${data.overall_disc_type === 'pct' ? data.overall_disc_value + '%' : 'Flat'})`, `-${fmt(data.overall_disc_amt)}`],
            ['Taxable Amount', fmt(data.taxable_amt)],
            ['Total Tax', fmt(data.total_tax)]
        ];

        rows.forEach(([label, val]) => {
            doc.fillColor(lightTextColor).fontSize(9).font('Helvetica').text(label, totalsX, y);
            doc.fillColor(textColor).font('Helvetica-Bold').text(`₹${val}`, 510, y, { align: 'right', width: 45 });
            y += 18;
        });

        doc.fillColor(primaryColor).rect(totalsX - 10, y - 5, 215, 25).fill();
        doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('Grand Total', totalsX, y + 3);
        doc.fontSize(13).text(`₹${fmt(data.grand_total)}`, 450, y + 2, { align: 'right', width: 105 });

        y += 40;

        // --- Footnote ---
        if (data.terms_text) {
            doc.fillColor(lightTextColor).fontSize(8).font('Helvetica-Bold').text('TERMS & CONDITIONS', 40, y);
            y += 12;
            doc.font('Helvetica').fontSize(7.5).text(data.terms_text, 40, y, { width: 515, lineGap: 2 });
        }

        doc.end();
    });
}

module.exports = { generateQuotationPDF };
