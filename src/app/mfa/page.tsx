import Image from "next/image";
import { MfaStep } from "@/components/mfa-step";

export default function MfaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="relative h-10 w-10 flex-none">
            <Image src="/brand/mark.png" alt="VatFlow" fill sizes="40px" className="object-contain" />
          </div>
          <div>
            <div className="font-heading text-lg font-bold leading-none">VatFlow</div>
            <div className="text-[11px] text-ink-soft">Ledger &amp; VAT desk</div>
          </div>
        </div>

        <MfaStep />
      </div>
    </div>
  );
}
