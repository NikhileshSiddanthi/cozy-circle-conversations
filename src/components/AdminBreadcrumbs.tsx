import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Home, Shield } from 'lucide-react';

export const AdminBreadcrumbs: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  const getBreadcrumbs = () => {
    const crumbs = [
      { label: 'Home', href: '/', icon: Home }
    ];

    if (path.startsWith('/admin')) {
      crumbs.push({ label: 'Admin', href: '/admin', icon: Shield });
      
      if (path === '/admin') {
        crumbs.push({ label: 'Dashboard', href: null, icon: null });
      }
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={`breadcrumb-${index}`}>
            <BreadcrumbItem>
              {crumb.href ? (
                <BreadcrumbLink asChild>
                  <Link to={crumb.href} className="flex items-center gap-1.5">
                    {crumb.icon && <crumb.icon className="h-4 w-4" />}
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="flex items-center gap-1.5">
                  {crumb.icon && <crumb.icon className="h-4 w-4" />}
                  {crumb.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};