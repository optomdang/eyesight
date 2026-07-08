import React from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PortalBreadcrumbProps {
  items: BreadcrumbItem[];
}

const PortalBreadcrumb: React.FC<PortalBreadcrumbProps> = ({ items }) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const hasClick = item.onClick || item.href;

          if (isLast || !hasClick) {
            return (
              <Typography key={index} variant="body2" color="text.primary">
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={index}
              component="button"
              variant="body2"
              onClick={item.onClick || (item.href ? () => navigate(item.href!) : undefined)}
              sx={{
                cursor: 'pointer',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};

export default PortalBreadcrumb;
