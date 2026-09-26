import type { Ticket } from "./types";
const escapeXml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
function lines(text: string, width = 36) {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).length > width && line) {
      out.push(line);
      line = "";
    }
    line += (line ? " " : "") + word;
  }
  if (line) out.push(line);
  return out;
}
export function ticketSvg(ticket: Ticket, brand: string) {
  const chunks = [
    brand.toUpperCase(),
    "ADMIT TWO · OUR LITTLE CINEMA",
    ...lines(ticket.names),
    ...lines(ticket.title),
    new Date(ticket.at).toLocaleString(),
    ...lines(ticket.note),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${200 + chunks.length * 42}" viewBox="0 0 720 ${200 + chunks.length * 42}"><rect width="100%" height="100%" rx="32" fill="#12101c"/><rect x="24" y="24" width="672" height="${152 + chunks.length * 42}" rx="24" fill="none" stroke="#a886c9" stroke-dasharray="4 6"/>${chunks.map((line, i) => `<text x="60" y="${90 + i * 42}" font-family="system-ui,sans-serif" font-size="${i === 0 ? 18 : 22}" fill="${i === 0 ? "#d5b2f0" : "#f5eff8"}">${escapeXml(line)}</text>`).join("")}<text x="60" y="${145 + chunks.length * 42}" font-family="system-ui,sans-serif" font-size="16" fill="#bdaccf">One screen. Two favorite people.</text></svg>`;
}
