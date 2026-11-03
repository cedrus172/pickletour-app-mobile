export const MAX_RULE_FILE_BYTES = 10 * 1024 * 1024;
export const RULE_FILE_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif";

// The installed WebView's file input opens the system file picker on iOS/Android.
// No new native module is needed for the existing installed app binaries.
export const RULE_FILE_PICKER_HTML = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'"><style>body{font-family:-apple-system,Arial,sans-serif;background:#0b2035;color:#eaf3ff;padding:24px;margin:0}label{display:block;background:#0bbfe7;color:#032235;font-weight:700;text-align:center;border-radius:12px;padding:18px;cursor:pointer}input{position:absolute;opacity:0;width:1px;height:1px}p{color:#9db4cc;font-size:14px;line-height:1.6}</style></head><body><label for="file">Chọn ảnh hoặc PDF</label><input id="file" type="file" accept="${RULE_FILE_ACCEPT}"><p>Chọn tệp điều lệ từ Ảnh hoặc Tệp trên điện thoại.<br>Tối đa 10 MB/tệp.</p><p id="status"></p><script>
const input=document.getElementById('file'),status=document.getElementById('status');
input.addEventListener('change',()=>{const file=input.files[0];if(!file)return;if(file.size>${MAX_RULE_FILE_BYTES}){status.textContent='Tệp không được vượt quá 10 MB.';input.value='';return;}status.textContent='Đang đọc tệp…';const reader=new FileReader();reader.onerror=()=>{status.textContent='Không đọc được tệp. Vui lòng chọn lại.';input.value='';};reader.onload=()=>{const types={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',heic:'image/heic',heif:'image/heif',avif:'image/avif'};const mime='${RULE_FILE_ACCEPT}'.split(',').includes(file.type)?file.type:(types[file.name.split('.').pop().toLowerCase()]||file.type);window.ReactNativeWebView.postMessage(JSON.stringify({kind:'rule-file',name:file.name,mime,size:file.size,base64:String(reader.result).split(',')[1]}));};reader.readAsDataURL(file);});
</script></body></html>`;

export function parseRuleFileSelection(message: string) {
  const data = JSON.parse(message);
  if (data?.kind !== "rule-file" || typeof data.name !== "string" ||
      !RULE_FILE_ACCEPT.split(",").includes(data.mime) ||
      !Number.isInteger(data.size) || data.size <= 0 || data.size > MAX_RULE_FILE_BYTES ||
      typeof data.base64 !== "string" || !data.base64.length ||
      data.base64.length > Math.ceil(MAX_RULE_FILE_BYTES / 3) * 4 || data.base64.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(data.base64)) {
    throw new Error("Vui lòng chọn ảnh hoặc PDF không quá 10 MB.");
  }
  const decodedSize = data.base64.length * 3 / 4 - (data.base64.endsWith("==") ? 2 : data.base64.endsWith("=") ? 1 : 0);
  if (decodedSize !== data.size) throw new Error("Nội dung tệp chưa được đọc đầy đủ. Vui lòng chọn lại.");
  return { name: data.name.slice(0, 180), mime: data.mime, size: data.size, base64: data.base64 };
}
