import { strToU8, zipSync } from "fflate";

export type AdminOrderExportRow = {
  order_number: string;
  contact_name: string;
  contact_phone: string;
  delivery_area_name: string;
  delivery_date: string;
  meal_slot: string;
  address: string;
  notes: string | null;
  order_items: { name: string; quantity: number }[];
  total: number;
  status: string;
  cancelled_at: string | null;
  created_at: string;
  payments: { status: string }[] | { status: string } | null;
};

function columnName(index: number) {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function worksheetXml(rows: (string | number)[][]) {
  const rowXml = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((value, columnIndex) => {
            const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
            if (typeof value === "number") {
              return `<c r="${reference}"><v>${value}</v></c>`;
            }
            return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
          })
          .join("")}</row>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`;
}

function workbookBytes(sheetName: string, rows: (string | number)[][]) {
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  return zipSync({
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    "xl/workbook.xml": strToU8(workbook),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    ),
    "xl/worksheets/sheet1.xml": strToU8(worksheetXml(rows)),
  });
}

export function buildAdminOrdersXlsx(orders: AdminOrderExportRow[]) {
  const rows: (string | number)[][] = [
    [
      "Order number",
      "Student / customer full name",
      "Contact phone",
      "Campus / delivery area",
      "Delivery date",
      "Meal time",
      "Delivery location preference",
      "Building, hall, room, or landmark",
      "Items",
      "Order total (ETB)",
      "Payment status",
      "Order status",
      "Order placed at",
    ],
    ...orders.map((order) => {
      const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
      return [
        order.order_number,
        order.contact_name,
        order.contact_phone,
        order.delivery_area_name,
        order.delivery_date,
        order.meal_slot,
        order.address,
        order.notes ?? "",
        order.order_items.map((item) => `${item.quantity} x ${item.name}`).join("; "),
        order.total,
        payment?.status ?? "unverified",
        order.cancelled_at ? "cancelled" : order.status,
        order.created_at,
      ];
    }),
  ];

  return workbookBytes("Orders", rows);
}

export function downloadAdminOrdersXlsx(orders: AdminOrderExportRow[]) {
  const blob = new Blob([buildAdminOrdersXlsx(orders)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `tms-orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
