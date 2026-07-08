import { useContext } from 'react';
import { DataTableContext } from 'src/contexts/data-context/DataTableContext';
import { DataTableContextState } from 'src/types/core';

export function useDataTable<T>(): DataTableContextState<T> {
  const context = useContext(DataTableContext);
  if (!context) {
    throw new Error('useDataTableContext must be used within a DataTableContextProvider');
  }

  return context as DataTableContextState<T>;
}
export default useDataTable;
