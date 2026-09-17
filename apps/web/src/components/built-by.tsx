import Image from "next/image";

const linkClass = "text-foreground underline underline-offset-2";

export function BuiltBy() {
  return (
    <section className="flex items-center gap-4 rounded-lg border p-4">
      <Image
        src="/builder-odii.png"
        alt="Emmanuel Odii"
        width={64}
        height={64}
        className="size-16 shrink-0 rounded-full object-cover"
      />
      <p className="text-sm text-muted-foreground">
        Hey curious, I&apos;m Odii, I&apos;ve also built{" "}
        <a href="https://stellartools.dev" target="_blank" rel="noreferrer" className={linkClass}>
          StellarTools
        </a>{" "}
        and{" "}
        <a href="https://sorokit.xyz" target="_blank" rel="noreferrer" className={linkClass}>
          Sorokit
        </a>{" "}
        on Stellar, and you can follow my work on{" "}
        <a
          href="https://linkedin.com/in/emmanuelodii"
          target="_blank"
          rel="noreferrer"
          className={linkClass}
        >
          LinkedIn
        </a>{" "}
        and{" "}
        <a href="https://x.com/devodii_" target="_blank" rel="noreferrer" className={linkClass}>
          Twitter
        </a>
        .
      </p>
    </section>
  );
}
