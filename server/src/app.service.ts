import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

type SaleLine = {
  timestamp: string;
  itemId: string;
  itemName: string;
  quantity: number;
  priceEach: number;
  total: number;
};

@Injectable()
export class AppService {
  private getTodayFilename(): string {
    const today = new Date().toISOString().slice(0, 10);
    const dataDir = path.resolve(process.cwd(), 'data');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    return path.join(dataDir, `sales-${today}.csv`);
  }

  appendSale(lines: SaleLine[]): void {
    if (!lines.length) return;

    const file = this.getTodayFilename();
    const exists = fs.existsSync(file);
    const header = 'timestamp,itemId,itemName,quantity,priceEach,total';

    const rows = lines.map((l) =>
      [
        l.timestamp,
        l.itemId,
        l.itemName,
        l.quantity.toString(),
        l.priceEach.toFixed(2),
        l.total.toFixed(2),
      ]
        .map((col) => {
          const str = String(col);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(','),
    );

    const toWrite = (exists ? '' : `${header}\n`) + rows.join('\n') + '\n';
    fs.appendFileSync(file, toWrite, { encoding: 'utf8' });
  }

  getSales() {
    const file = this.getTodayFilename();
    if (!fs.existsSync(file)) {
      return [];
    }

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.trim().split('\n');
    if (lines.length <= 1) {
      return [];
    }

    const result: (SaleLine & { index: number })[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row.trim()) continue;
      const cols = this.parseCsvRow(row);
      if (cols.length < 6) continue;

      const quantity = Number(cols[3] || '0');
      const priceEach = Number(cols[4] || '0');
      const total = Number(cols[5] || '0');

      if (!Number.isFinite(quantity) || !Number.isFinite(priceEach) || !Number.isFinite(total)) continue;

      result.push({
        index: i - 1, // data index (excluding header)
        timestamp: cols[0],
        itemId: cols[1],
        itemName: cols[2],
        quantity,
        priceEach,
        total,
      });
    }

    return result;
  }

  deleteSale(index: number): void {
    if (!Number.isInteger(index) || index < 0) return;

    const file = this.getTodayFilename();
    if (!fs.existsSync(file)) {
      return;
    }

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    if (lines.length <= 2) {
      // Only header or empty; just truncate the file.
      fs.writeFileSync(file, lines[0] ? `${lines[0].trim()}\n` : '', { encoding: 'utf8' });
      return;
    }

    const header = lines[0];
    const dataLines = lines.slice(1).filter((l) => l.length > 0);

    if (index >= dataLines.length) return;

    dataLines.splice(index, 1);

    const newContent = dataLines.length
      ? `${header}\n${dataLines.join('\n')}\n`
      : `${header}\n`;

    fs.writeFileSync(file, newContent, { encoding: 'utf8' });
  }

  getSummary() {
    const file = this.getTodayFilename();
    if (!fs.existsSync(file)) {
      return { totalRevenue: 0, totalLines: 0, byItem: {} as Record<string, { name: string; quantity: number; revenue: number }> };
    }

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.trim().split('\n');
    if (lines.length <= 1) {
      return { totalRevenue: 0, totalLines: 0, byItem: {} as Record<string, { name: string; quantity: number; revenue: number }> };
    }

    const byItem: Record<string, { name: string; quantity: number; revenue: number }> = {};
    let totalRevenue = 0;
    let totalLines = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row.trim()) continue;
      const cols = this.parseCsvRow(row);
      if (cols.length < 6) continue;

      const itemId = cols[1];
      const itemName = cols[2];
      const quantity = Number(cols[3] || '0');
      const total = Number(cols[5] || '0');

      if (!Number.isFinite(quantity) || !Number.isFinite(total)) continue;

      totalRevenue += total;
      totalLines += 1;

      if (!byItem[itemId]) {
        byItem[itemId] = { name: itemName, quantity: 0, revenue: 0 };
      }
      byItem[itemId].quantity += quantity;
      byItem[itemId].revenue += total;
    }

    return { totalRevenue, totalLines, byItem };
  }

  private parseCsvRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];

      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }
}
