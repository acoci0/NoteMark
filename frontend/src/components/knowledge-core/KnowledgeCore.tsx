import { useRef } from "react";
import { CircleDot } from "lucide-react";
import KnowledgeCube from "./KnowledgeCube";
import KnowledgePlatform from "./KnowledgePlatform";
import KnowledgeSatellites from "./KnowledgeSatellites";
import useKnowledgeMotion from "./useKnowledgeMotion";
import "./knowledge-core.css";

type Props = { role: "student" | "admin"; paused?: boolean };

export default function KnowledgeCore({ role, paused = false }: Props) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<(HTMLDivElement | null)[]>([]);
  useKnowledgeMotion({ sceneRef, nodesRef, enabled: !paused });
  const student = role === "student";

  return (
    <section className={`kc-showcase kc-showcase--${role}${paused ? " kc-showcase--paused" : ""}`}
      aria-label={student ? "NotMark akademik içerik platformu" : "NotMark yönetim platformu"}>
      <div className="kc-showcase__eyebrow">
        <CircleDot size={10} strokeWidth={2.2}/>
        <span>{student ? "AKADEMİK ALIŞVERİŞ" : "YÖNETİM MERKEZİ"}</span>
        <span className="kc-showcase__rule" />
      </div>
      <div className="kc-scene" ref={sceneRef} aria-hidden="true">
        <div className="kc-scene__atmosphere" />
        <div className="kc-scene__streak kc-scene__streak--one" />
        <div className="kc-scene__streak kc-scene__streak--two" />
        <KnowledgePlatform />
        <KnowledgeCube role={role} />
        <KnowledgeSatellites role={role} nodesRef={nodesRef} />
      </div>
      <div className="kc-showcase__footer">
        <strong>{student ? "Bilgiye yeni bir boyut." : "Güvenli yönetimin merkezi."}</strong>
        <span>{student ? "Keşfet · Paylaş · Öğren" : "Doğrula · Denetle · Yönet"}</span>
      </div>
    </section>
  );
}
