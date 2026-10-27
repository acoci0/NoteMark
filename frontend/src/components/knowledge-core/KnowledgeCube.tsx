import { FileText, ShieldCheck } from "lucide-react";

type Props = { role: "student" | "admin" };

const faces = ["front", "back", "left", "right", "top", "bottom"] as const;

export default function KnowledgeCube({ role }: Props) {
  return (
    <div className="kc-cube-position" aria-hidden="true">
      <div className="kc-cube-hover">
        <div className="kc-cube-gyro">
          <div className="kc-cube-tilt">
            <div className="kc-cube-pose">
              <div className="kc-cube">
                {faces.map((face) => (
                  <div key={face} className={`kc-cube-face kc-cube-face--${face}`}>
                    <span className="kc-cube-face__trace" />
                  </div>
                ))}
                <div className="kc-cube-inside" />
                <div className="kc-cube-glyph">
                  {role === "student" ? (
                    <FileText size={66} strokeWidth={1.3} />
                  ) : (
                    <ShieldCheck size={66} strokeWidth={1.3} />
                  )}
                  <span className="kc-cube-glyph__glow" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
