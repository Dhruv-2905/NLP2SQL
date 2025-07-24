import { DataGridPro, GridColDef, GridRowId } from "@mui/x-data-grid-pro";
import { formatDate } from "./dateFormatter";
import { Box } from "@mui/material";

export const dataGridTable = (data: any) => {
  if (!data || data.length === 0 || typeof data[0] !== "object") return null;

  const columns: GridColDef[] = Object.keys(data[0]).map((header) => ({
    field: header,
    headerName: header.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    flex: 1,
    minWidth: 150,
    renderCell: (params) =>
      header.toLowerCase().includes("date") ? formatDate(params.value) : params.value,
  }));

  const rows = data.map((row: any, index: number) => ({
    id: `col_id_${index+1}`,
    ...row,
  }));

  return (
    <Box boxShadow={4} borderRadius={2} height={"calc(100% -300px)"}>
      <DataGridPro
        className="view-grid"
        rows={rows}
        getRowId={(row) => row.id as GridRowId}
        columns={columns}
        columnHeaderHeight={30}
        pageSizeOptions={[5, 10, 20]}
        getRowHeight={() => "auto"}
        disableColumnFilter
        disableRowSelectionOnClick
        disableDensitySelector
        disableColumnMenu
        slots={{
          headerFilterMenu: null,
        }}
      />
    </Box>
  );
};