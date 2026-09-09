// app.js - small helpers

export function humanSize(bytes, locale = "fa-IR") {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return locale === "fa-IR" ? "0 بایت" : "0 B";
  const k = 1024;
  const sizesFa = ["بایت", "کیلوبایت", "مگابایت", "گیگابایت", "ترابایت"];
  const sizesEn = ["B", "KB", "MB", "GB", "TB"];
  const sizes = (locale === "fa-IR") ? sizesFa : sizesEn;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const v = bytes / Math.pow(k, i);
  return `${v.toFixed(2)} ${sizes[i]}`;
}

export function fmtDate(ts, locale="fa-IR"){
  try{
    const d = new Date(ts);
    return d.toLocaleDateString(locale) + " " + d.toLocaleTimeString(locale);
  }catch{
    return "—";
  }
}
