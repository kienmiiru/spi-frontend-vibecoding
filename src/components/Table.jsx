import React from "react";

// Table container (not rounded, plain borders, clean styling)
export function Table({ children, className = "", ...props }) {
  return (
    <div className={`overflow-x-auto w-full border border-gray-300 bg-white ${className}`}>
      <table className={`w-full text-left border-collapse text-xs text-gray-800`} {...props}>
        {children}
      </table>
    </div>
  );
}

// Table Header wrapper (thead) with bg-c-cream-600
Table.Header = function TableHeader({ children, className = "", ...props }) {
  return (
    <thead className={`bg-c-cream-600 border-b border-gray-300 text-xs font-semibold text-gray-900 ${className}`} {...props}>
      {children}
    </thead>
  );
};

// Table Body wrapper (tbody)
Table.Body = function TableBody({ children, className = "", ...props }) {
  return (
    <tbody className={`divide-y divide-gray-200 bg-white ${className}`} {...props}>
      {children}
    </tbody>
  );
};

// Table Row (tr)
Table.Row = function TableRow({ children, className = "", ...props }) {
  return (
    <tr className={`hover:bg-gray-50/70 transition-colors ${className}`} {...props}>
      {children}
    </tr>
  );
};

// Table Header Cell (th)
Table.HeaderCell = function TableHeaderCell({ children, className = "", ...props }) {
  return (
    <th className={`px-6 py-3 border-r border-gray-200 last:border-r-0 ${className}`} {...props}>
      {children}
    </th>
  );
};

// Table Data Cell (td)
Table.Cell = function TableCell({ children, className = "", ...props }) {
  return (
    <td className={`px-6 py-4 border-r border-gray-200 last:border-r-0 ${className}`} {...props}>
      {children}
    </td>
  );
};

export default Table;
