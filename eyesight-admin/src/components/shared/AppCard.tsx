import React, { useContext } from 'react';

import { Card } from '@mui/material';

import { CustomizerContext } from 'src/contexts/CustomizerContext';

type Props = {
  children: React.ReactNode;
};

const AppCard = ({ children }: Props) => {
  const { isCardShadow } = useContext(CustomizerContext) || { isCardShadow: false };

  return (
    <Card
      sx={{ display: 'flex', p: 0 }}
      elevation={isCardShadow ? 9 : 0}
      variant={!isCardShadow ? 'outlined' : undefined}
    >
      {children}
    </Card>
  );
};

export default AppCard;
