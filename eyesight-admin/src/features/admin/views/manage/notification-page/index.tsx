import { DataTableProvider } from 'src/contexts/data-context/DataTableContext';
import NotificationPage from './NotificationPage';

export default function NotificationIndex() {
  return (
    <DataTableProvider endpoint="/notifications">
      <NotificationPage />
    </DataTableProvider>
  );
}
