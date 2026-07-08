import { useCenter } from 'src/contexts/CenterContext';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import useAuth from 'src/contexts/authGuard/useAuth';

const CenterSwitcher = () => {
  const { centers, changeCenter } = useCenter();
  const { user } = useAuth();

  if (!centers.length) return null;

  return (
    <FormControl size="small" sx={{ minWidth: 160 }}>
      <InputLabel id="center-switcher-label">Trung tâm</InputLabel>
      <Select
        labelId="center-switcher-label"
        value={user?.centerId || ''}
        label="Trung tâm"
        size="small"
        onChange={async (e) => {
          const centerId = Number(e.target.value);
          if (centerId === user?.centerId) return;
          const center = centers.find((c) => c.id === centerId);
          if (center) {
            changeCenter(center);
          }
        }}
      >
        {centers.map((center) => (
          <MenuItem key={center.id} value={center.id}>
            {center.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default CenterSwitcher;
