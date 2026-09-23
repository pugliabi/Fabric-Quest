/**
 * Capitalized words the proper-noun heuristic accepts beyond the world's own names. Only Fabric / Power BI / Excel
 * vocabulary, this game's places and people, and the voice.ts allusion layer. Never a Peasant's Quest noun.
 * Add a word here only after checking the line it comes from belongs to THIS game.
 */
export const ALLOWLIST: readonly string[] = [
  // the platform
  'Power', 'BI', 'Fabric', 'Excel', 'Copilot', 'DAX', 'OneLake', 'Lakehouse', 'Lakehouses', 'Spark', 'Delta', 'Parquet', 'Warehouse', 'Warehouses', 'Desktop', 'Query', 'Analyze', 'Premium', 'Pro', 'Trial',
  'Microsoft', 'Azure', 'OpenAI', 'Learn', 'Word', 'Teams', 'GitHub', 'KQL', 'Eventhouse', 'Tabular', 'Editor', 'Formula', 'Firewall', 'Expression', 'Error', 'Locale', 'Notebook', 'Notebooks', 'Dataflow', 'Dataflows', 'Gen1', 'Gen2',
  'Runtime', 'Synapse', 'Starter', 'Pool', 'CU', 'CUs', 'SKU', 'SKUs', 'XMLA', 'Sev', 'P1', 'GROUP', 'BY', 'SELECT', 'EVALUATE', 'CALCULATE', 'CALCULATETABLE', 'SUMX', 'DIVIDE', 'FILTER', 'ALL', 'USERELATIONSHIP', 'CROSS', 'APPLY', 'NOLOCK', 'CTE', 'Table', 'AddColumn', 'Buffer',
  'DirectQuery', 'DirectLake', 'Direct', 'Lake', 'Import', 'Mode', 'Both', 'Single', 'Auto', 'Total', 'Year', 'Quarter', 'Blank', 'Column', 'Column1', 'Column2', 'Column3', 'Custom', 'Custom1', 'Changed', 'Type', 'Type1', 'Source', 'Navigation', 'Promoted', 'Headers', 'Filtered', 'Rows', 'Removed', 'Other', 'Columns', 'Renamed',
  'Sales', 'Region', 'Net', 'Amount', 'Returns', 'Gross', 'YTD', 'Measure', 'Northeast', 'Southeast', 'Midwest', 'West', 'Unknown', 'Certified', 'FINAL', 'Sales_v3_FINAL_final2', 'Sales_v3_FINAL_final4', 'PivotTable', 'PivotTable1', 'Sheet1', 'Data', 'Home', 'Insert', 'Fields', 'Is', 'Current',
  'Standard', 'Personal', 'Card', 'Big', 'Refresh', 'Bursting', 'Boots', 'Hoodie', 'Scroll', 'Shortcut', 'Golden', 'Semantic', 'Model', 'Gallery', 'Pane', 'Portal', 'Admin', 'Tenant', 'Settings', 'Capacity', 'Ledger', 'Publish', 'Guest', 'Autoscale', 'Surge', 'Product', 'Feedback', 'Discover', 'Block', 'Public', 'Internet', 'Access', 'Users', 'Workspace', 'Workloads',
  // places and people of this game
  'Village', 'Square', 'Mill', 'Fields', 'Cottage', 'Town', 'Hall', 'Shore', 'Dock', 'Isle', 'Gateway', 'House', 'Bronze', 'Silver', 'Gold', 'Marsh', 'Monastery', 'Gate', 'Cloister', 'Session', 'Chamber', 'Library', 'Deprecated', 'Sacristy', 'Keep', 'Power', 'Hall', 'View', 'Duke', 'Report', 'Studio', 'Peaks', 'Foothills', 'Throttling', 'Pass', 'Ledge', 'Shrine', 'Moat', 'T-SQL',
  'Jeff', 'Finance', 'Ops', 'HR', 'IT', 'Miller', 'Ferryman', 'Abbot', 'Brother', 'Pandas', 'Librarian', 'Guard', 'Sir', 'Cardinality', 'Throttlor', 'Dragon', 'Manual', 'Clerk', 'Narrator', 'Builder', 'Builders', 'Engineer', 'Engineers', 'Scientist', 'Worthy', 'Three', 'Prophecy', 'FabCon',
  'Monday', 'Tuesday', 'Q2', 'Q3', 'Q4', 'Restore', 'Restart', 'Quit', 'Enter', 'HELP', 'GOAL', 'EXIT', 'FLASK',
  // F12 first run: 26 unknowns, every one this game's UI, field or report vocabulary (checked line by line)
  'Analyst', 'Senior', 'Server', 'Upgrade', 'Council', 'Adirondack', 'CustomerName', 'Customer', 'Off', 'Run', 'Continued', 'Remind', 'North', 'Territory',
  'December', 'Month', 'Colour', 'Default', 'Mr', 'Confidential', 'Highly', 'Yes', 'Values', 'Salesperson', 'Units', 'Requests',
  // the allusion layer and the brands are added from voice.ts by the harness itself
];
