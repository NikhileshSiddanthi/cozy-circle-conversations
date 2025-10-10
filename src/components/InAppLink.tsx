import { useNavigate } from 'react-router-dom';

interface InAppLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const InAppLink = ({ href, children, className, onClick }: InAppLinkProps) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    // Check if it's an external URL
    const isExternal = href.startsWith('http://') || href.startsWith('https://');
    const isCurrentDomain = href.includes(window.location.hostname);

    if (!isExternal || isCurrentDomain) {
      e.preventDefault();
      const path = isCurrentDomain ? new URL(href).pathname : href;
      navigate(path);
    }

    onClick?.(e);
  };

  return (
    <a 
      href={href} 
      className={className}
      onClick={handleClick}
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
};
