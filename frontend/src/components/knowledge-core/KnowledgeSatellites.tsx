import { BadgeCheck, Users, Coins, ShieldCheck, ClipboardCheck, BarChart3 } from "lucide-react";
import type { RefObject } from "react";

type Role = "student" | "admin";
type Props = {
  role: Role;
  nodesRef: RefObject<(HTMLDivElement | null)[]>;
};

const studentCards = [
  { title: "Onaylı Notlar", detail: "Güvenilir içerik", Icon: BadgeCheck },
  { title: "Paylaşım Ağı", detail: "Öğrenci topluluğu", Icon: Users },
  { title: "Kazandıran Bilgi", detail: "Notlarından gelir elde et", Icon: Coins },
];

const adminCards = [
  { title: "Öğrenci Doğrulama", detail: "Güvenli erişim", Icon: ShieldCheck },
  { title: "İçerik Moderasyonu", detail: "Kalite ve denetim", Icon: ClipboardCheck },
  { title: "Sistem Analitiği", detail: "İşlem görünürlüğü", Icon: BarChart3 },
];

export default function KnowledgeSatellites({ role, nodesRef }: Props) {
  return (
    <div className="kc-satellites" aria-hidden="true">
      {(role === "student" ? studentCards : adminCards).map(({ title, detail, Icon }, index) => (
        <div
          key={index}
          className={`kc-satellite kc-satellite--${index + 1}`}
          ref={(node) => { nodesRef.current[index] = node; }}
        >
          <span className="kc-satellite__icon"><Icon size={20} strokeWidth={1.65}/></span>
          <span className="kc-satellite__copy"><strong>{title}</strong><small>{detail}</small></span>
          <span className="kc-satellite__led" />
        </div>
      ))}
    </div>
  );
}
