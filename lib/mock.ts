export type Look = { id: string; title: string; meta: string };
export type Service = { id: string; name: string; duration: string; price: number; starting?: boolean };
export type Specialist = { id: string; name: string; role: string };

export const LOOKS: Look[] = [
  { id: "look-1", title: "Soft bridal glam", meta: "Makeup · Bridal" },
  { id: "look-2", title: "Silk press + curls", meta: "Hair · Birthday" },
  { id: "look-3", title: "Everyday polish", meta: "Makeup · Everyday" }
];

export const SERVICES: Service[] = [
  { id: "svc-makeup", name: "Signature makeup", duration: "90 mins · studio", price: 45000 },
  { id: "svc-hair", name: "Silk press + curls", duration: "2 hrs · studio", price: 25000 },
  { id: "svc-bridal", name: "Bridal full look", duration: "3–4 hrs · studio or off-site", price: 120000, starting: true }
];

export const SPECIALISTS: Specialist[] = [
  { id: "spec-ada", name: "Adaeze", role: "Makeup" },
  { id: "spec-funmi", name: "Funmi", role: "Hair" },
  { id: "spec-match", name: "Studio match", role: "We choose for you" }
];

export const SLOTS = ["Sat 27 Sep · 10:00", "Sat 27 Sep · 13:00", "Mon 29 Sep · 11:00"];

export function naira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}
