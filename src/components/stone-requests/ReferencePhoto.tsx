import Image from "next/image";

/** Never send private image URLs through the public image optimizer or catalog manifest. */
export function ReferencePhoto({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-stone-catalog-photo relative overflow-hidden ${className}`}
    >
      <Image src={src} alt={alt} fill unoptimized className="object-contain" />
    </div>
  );
}
