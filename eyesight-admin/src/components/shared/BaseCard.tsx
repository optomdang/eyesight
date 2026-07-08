import React, { useContext } from 'react';
import { Card, CardHeader, CardContent, Divider } from '@mui/material';
import { CustomizerContext } from 'src/contexts/CustomizerContext';

type Props = {
  title: string;
  children: React.ReactNode;
};

const BaseCard = ({ title, children }: Props) => {
  const { isCardShadow } = useContext(CustomizerContext) || { isCardShadow: false };

  return (
    <Card
      sx={{ padding: 0 }}
      elevation={isCardShadow ? 9 : 0}
      variant={!isCardShadow ? 'outlined' : undefined}
    >
      <CardHeader title={title} />
      <Divider />
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default BaseCard;
