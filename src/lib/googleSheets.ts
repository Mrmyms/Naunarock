import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

let credentials: { client_email: string; private_key: string } | null = null;
const sheetId = process.env.GOOGLE_SHEET_ID || '1e6LXPnQFsIYImBLn3JrOv7h2Bo1il3hIHWJLRFJbWTQ';

function getCredentials() {
  if (credentials) return credentials;

  // 1. Intentar desde variables de entorno (ideal para Vercel)
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    return credentials;
  }

  // 2. Fallback a archivo JSON local si existe (para desarrollo local)
  try {
    const keyPath = path.resolve(process.cwd(), 'nauticode-8b981f1cee2d.json');
    if (fs.existsSync(keyPath)) {
      const fileData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      credentials = {
        client_email: fileData.client_email,
        private_key: fileData.private_key,
      };
      return credentials;
    }
  } catch (err) {
    console.error('Error leyendo archivo local de credenciales:', err);
  }

  throw new Error('No se encontraron credenciales de Google Service Account');
}

export function getGoogleSheetsClient() {
  const creds = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ],
  });

  return {
    sheets: google.sheets({ version: 'v4', auth }),
    sheetId,
  };
}

export async function appendScoutRow(sheetName: string, rowValues: any[]) {
  const { sheets, sheetId } = getGoogleSheetsClient();

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [rowValues],
    },
  });

  return response.data;
}

const ensuredSheets = new Set<string>();

export async function ensureSheetWithHeaders(sheetName: string, headers: string[]) {
  if (ensuredSheets.has(sheetName)) return;

  const { sheets, sheetId } = getGoogleSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: 'sheets.properties.title',
  });

  const exists = meta.data.sheets?.some((s) => s.properties?.title === sheetName);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });
  }

  const headerCheck = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!1:1`,
  });

  const firstRow = headerCheck.data.values?.[0];
  if (!firstRow || firstRow.length < headers.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });
  }

  ensuredSheets.add(sheetName);
}

export async function appendRows(
  sheetName: string,
  rows: (string | number)[][],
  valueInputOption: 'USER_ENTERED' | 'RAW' = 'USER_ENTERED'
) {
  const { sheets, sheetId } = getGoogleSheetsClient();

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1`,
    valueInputOption,
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: rows,
    },
  });

  return response.data;
}

export async function batchGetSheetRanges(ranges: string[]) {
  const { sheets, sheetId } = getGoogleSheetsClient();

  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges,
  });

  return response.data.valueRanges || [];
}

export async function getSheetRows(sheetName: string, range = 'A1:AE1000') {
  const { sheets, sheetId } = getGoogleSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!${range}`,
  });

  return response.data.values || [];
}
