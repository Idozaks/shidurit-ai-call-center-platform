import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenant_id, leads } = await req.json();
    if (!tenant_id || !leads || leads.length === 0) {
      return Response.json({ error: 'No leads to export' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlesheets");

    // Create a new spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: `לידים - ייצוא ${new Date().toLocaleDateString('he-IL')}`
        },
        sheets: [{
          properties: {
            title: 'לידים',
            sheetId: 0,
            rightToLeft: true
          }
        }]
      })
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      return Response.json({ error: 'Failed to create spreadsheet: ' + err }, { status: 500 });
    }

    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;
    const spreadsheetUrl = spreadsheet.spreadsheetUrl;

    // Build rows
    const headers = ['שם', 'טלפון', 'אימייל', 'סיבת פנייה', 'סטטוס', 'עדיפות', 'סנטימנט', 'ציון כוונה', 'דחיפות', 'פעולה מומלצת', 'סיכום', 'תאריך יצירה'];
    
    const statusMap = { new: 'חדש', contacted: 'נוצר קשר', converted: 'הומר', lost: 'אבוד' };
    const priorityMap = { low: 'נמוכה', normal: 'רגילה', high: 'גבוהה' };
    const sentimentMap = { positive: 'חיובי', neutral: 'ניטרלי', negative: 'שלילי' };
    const urgencyMap = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה' };

    const rows = leads.map(lead => [
      lead.customer_name || '',
      lead.customer_phone || '',
      lead.customer_email || '',
      lead.inquiry_reason || '',
      statusMap[lead.status] || lead.status || '',
      priorityMap[lead.priority] || lead.priority || '',
      sentimentMap[lead.sentiment] || lead.sentiment || '',
      lead.intent_score !== undefined ? String(lead.intent_score) : '',
      urgencyMap[lead.urgency_level] || lead.urgency_level || '',
      lead.ai_suggested_action || '',
      lead.summary || '',
      lead.created_date ? new Date(lead.created_date).toLocaleDateString('he-IL') : ''
    ]);

    const values = [headers, ...rows];

    // Write data
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/לידים!A1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.text();
      return Response.json({ error: 'Failed to write data: ' + err }, { status: 500 });
    }

    // Format header row (bold + background)
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              repeatCell: {
                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.26, green: 0.4, blue: 0.96 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)'
              }
            },
            {
              autoResizeDimensions: {
                dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 12 }
              }
            }
          ]
        })
      }
    );

    return Response.json({ spreadsheetUrl, spreadsheetId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});