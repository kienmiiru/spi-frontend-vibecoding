import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const UnitKerjaDropdown = ({ value, onChange }) => {
  const [unitKerjaList, setUnitKerjaList] = useState(['Memuat...']);

  useEffect(() => {
    const fetchUnitKerja = async () => {
      try {
        const response = await apiFetch("/api/fakultas", {
          method: "GET",
        });
        const unitKerjaNames = response.map((f) => f.namaFakultas);
        setUnitKerjaList(unitKerjaNames);
      } catch (error) {
        console.error("Error fetching unit kerja list:", error);
      }
    };

    fetchUnitKerja();
  }, []);

  return (
    <select
      value={value}
      onChange={onChange}
      className="border rounded px-3 py-2"
    >
      {unitKerjaList.map((f) => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
    </select>
  );
};

export default UnitKerjaDropdown;
