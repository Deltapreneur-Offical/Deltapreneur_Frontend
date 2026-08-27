import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { operationsPathForHubRegistrarService } from '../../utils/operationsSections';
import { formatInr } from '../../utils/money';
import '../../styles/registrations-catalog.css';

export default function HomeRegistrationServiceCard({ categorySlug, service }) {
  const hasPrice = service.price != null && Number(service.price) > 0;

  return (
    <Link
      to={operationsPathForHubRegistrarService(categorySlug, service.slug)}
      className="reg-category-card reg-category-card--service"
      aria-label={`${service.label} Hub Registrar service`}
    >
      <div className="reg-category-card__body">
        <p className="reg-category-card__kicker">Service</p>
        <h3 className="reg-category-card__title">{service.label}</h3>
        {hasPrice ? (
          <p className="reg-category-card__price">
            {formatInr(service.price, { forceDecimals: true })}
          </p>
        ) : null}
      </div>
      <span className="reg-category-card__cta">
        Explore
        <ArrowUpRight size={16} strokeWidth={2.25} aria-hidden />
      </span>
    </Link>
  );
}
