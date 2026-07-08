import { Card } from '@mui/material';
import React, { useContext } from 'react';
import { useTheme } from '@mui/material/styles';
import { CustomizerContext } from 'src/contexts/CustomizerContext';

type Props = {
  className?: string;
  children: React.ReactNode;
  sx?: React.CSSProperties | Record<string, unknown>;
};

const BlankCard = ({ children, className, sx }: Props) => {
  const { isCardShadow } = useContext(CustomizerContext) || { isCardShadow: false };

  const theme = useTheme();
  const borderColor = theme.palette.grey[100];

  return (
    <Card
      sx={{
        p: 0,
        border: !isCardShadow ? `1px solid ${borderColor}` : 'none',
        position: 'relative',
        sx,
      }}
      className={className}
      elevation={isCardShadow ? 9 : 0}
      variant={!isCardShadow ? 'outlined' : undefined}
    >
      {children}
    </Card>
  );
};

export default BlankCard;
