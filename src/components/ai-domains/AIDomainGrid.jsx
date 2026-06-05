import AIDomainCard from './AIDomainCard';

export default function AIDomainGrid({ results }) {
  if (!results.length) return null;

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {results.map((item, index) => (
        <AIDomainCard key={`${item.domain_com}-${item.domain_in}`} item={item} index={index} />
      ))}
    </div>
  );
}
