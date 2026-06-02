const YearDropdown = ({ value, onChange }) => {
  const currentYear = new Date().getFullYear();

  const years = Array.from(
    { length: currentYear - 2023 + 1 },
    (_, i) => 2023 + i
  );

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-3 py-2"
    >
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  );
};

export default YearDropdown;