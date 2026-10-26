/** Bind this file to the ARL_Content spreadsheet. No credentials are stored here. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('ARL CMS')
    .addItem('Tạo ID cho dòng đang chọn', 'arlCreateId')
    .addSeparator()
    .addItem('Mở CMS: kiểm tra / preview / xuất bản', 'arlOpenCms')
    .addItem('Cấu hình URL CMS', 'arlConfigureCmsUrl')
    .addToUi();
}

function arlCreateId() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const row = sheet.getActiveCell().getRow();
  if (row < 2) throw new Error('Hãy chọn một dòng dữ liệu, không phải dòng tiêu đề.');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {
    Pages: ['page_id', 'PG'], Products: ['product_id', 'P'], Solutions: ['solution_id', 'S'],
    Research: ['research_id', 'R'], Members: ['member_id', 'MB'], Content_Blocks: ['block_id', 'B'],
    Taxonomies: ['taxonomy_id', 'T'], Entity_Taxonomies: ['mapping_id', 'ET'],
    Relations: ['relation_id', 'REL'], Placements: ['placement_id', 'PL'], Navigation: ['navigation_id', 'NAV'],
    CTAs: ['cta_id', 'CTA'], Media: ['media_id', 'M'], Redirects: ['redirect_id', 'RD']
  };
  const spec = map[sheet.getName()];
  if (!spec) throw new Error('Tab này không dùng ID tự tạo.');
  const index = headers.indexOf(spec[0]) + 1;
  if (!index) throw new Error('Thiếu cột ' + spec[0]);
  const cell = sheet.getRange(row, index);
  if (cell.getValue()) throw new Error('Dòng đã có ID; không thay đổi ID đang dùng.');
  const id = spec[1] + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase();
  cell.setValue(id);
  const editorial = headers.indexOf('editorial_status') + 1;
  if (editorial && !sheet.getRange(row, editorial).getValue()) sheet.getRange(row, editorial).setValue('draft');
  SpreadsheetApp.getActive().toast('Đã tạo ' + id);
}

function arlConfigureCmsUrl() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.prompt('URL CMS', 'Nhập URL HTTPS của CMS, ví dụ https://example.com/cms', ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK) return;
  const url = answer.getResponseText().trim();
  if (!/^https:\/\/[^\s]+\/cms\/?$/.test(url)) throw new Error('URL phải là HTTPS và kết thúc bằng /cms.');
  PropertiesService.getDocumentProperties().setProperty('ARL_CMS_URL', url);
  ui.alert('Đã lưu URL CMS cho workbook này.');
}

function arlOpenCms() {
  const url = PropertiesService.getDocumentProperties().getProperty('ARL_CMS_URL');
  if (!url) return arlConfigureCmsUrl();
  const safe = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const html = HtmlService.createHtmlOutput('<p>Mở trang quản trị ARL:</p><p><a href="' + safe + '" target="_blank" rel="noopener noreferrer">' + safe + '</a></p>').setWidth(360).setHeight(130);
  SpreadsheetApp.getUi().showModalDialog(html, 'ARL CMS');
}
