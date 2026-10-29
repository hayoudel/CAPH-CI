/** Affiche « Prototype — à valider » pour toute donnée marquée `isProvisional`. */
export default function ProvisionalBadge({ item }: { item?: { isProvisional?: boolean } | null }) {
  if (!item?.isProvisional) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-0.5">
      Prototype — à valider
    </span>
  );
}
