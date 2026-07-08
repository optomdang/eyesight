import React from 'react';
import { Container, Box } from '@mui/material';

interface ExamContainerProps {
  children: React.ReactNode;
  minimal?: boolean; // New prop for minimal styling
}

/**
 * A common container for vision test steps with consistent styling
 */
const ExamContainer: React.FC<ExamContainerProps> = ({ children }) => {
  // if (minimal) {
  //   // Minimal container for exam pages - full screen utilization
  //   return (
  //     <Box
  //       sx={{
  //         bgcolor: '#fff',
  //         color: '#000',
  //         minHeight: '100vh',
  //         width: '100%',
  //         display: 'flex',
  //         flexDirection: 'column',
  //         padding: 0,
  //         margin: 0,
  //       }}
  //     >
  //       {children}
  //     </Box>
  //   );
  // }

  // Default container with padding for dashboard pages
  return (
    <Container
      sx={{ bgcolor: 'background.paper', color: 'text.primary', minHeight: '100vh', py: 4 }}
    >
      <Box>{children}</Box>
    </Container>
  );
};

export default ExamContainer;
