import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "./ProtectedRoute";

import LoginPage from "../pages/LoginPage";

import DeskPbj from "../pages/pbj/DeskPbj";
import DtmPbj from "../pages/pbj/DtmPbj";
import PeraturanPbj from "../pages/pbj/PeraturanPbj";
import RiwayatDtmPbj from "../pages/pbj/RiwayatDtmPbj";
import BeritaAcaraPbj from "../pages/pbj/BeritaAcaraPbj";
import ChecklistPbj from "../pages/pbj/ChecklistPbj";

import DashboardKeuangan from "../pages/keuangan/DashboardKeuangan";
import CashOpnameKeuangan from "../pages/keuangan/CashOpnameKeuangan";
import DtmKeuangan from "../pages/keuangan/DtmKeuangan";
import KeuanganKeuangan from "../pages/keuangan/KeuanganKeuangan";
import PeraturanKeuangan from "../pages/keuangan/PeraturanKeuangan";
import RiwayatDtmKeuangan from "../pages/keuangan/RiwayatDtmKeuangan";
import BeritaAcaraKeuangan from "../pages/keuangan/BeritaAcaraKeuangan";

import JamKerjaSdm from "../pages/sdm/JamKerjaSdm";
import DtmSdm from "../pages/sdm/DtmSdm";
import PeraturanSdm from "../pages/sdm/PeraturanSdm";
import RiwayatDtmSdm from "../pages/sdm/RiwayatDtmSdm";
import BeritaAcaraSdm from "../pages/sdm/BeritaAcaraSdm";

import BerandaSmmSmap from "../pages/smm-smap/BerandaSmmSmap";
import DtmSmmSmap from "../pages/smm-smap/DtmSmmSmap";
import PeraturanSmmSmap from "../pages/smm-smap/PeraturanSmmSmap";
import RiwayatDtmSmmSmap from "../pages/smm-smap/RiwayatDtmSmmSmap";
import BeritaAcaraSmmSmap from "../pages/smm-smap/BeritaAcaraSmmSmap";

import BerandaBmn from "../pages/bmn/BerandaBmn";
import DtmBmn from "../pages/bmn/DtmBmn";
import LembarKerjaBmn from "../pages/bmn/LembarKerjaBmn";
import PeraturanBmn from "../pages/bmn/PeraturanBmn";
import RiwayatDtmBmn from "../pages/bmn/RiwayatDtmBmn";
import BeritaAcaraBmn from "../pages/bmn/BeritaAcaraBmn";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route
        path="/keuangan"
        element={
          <ProtectedRoute allowedRoles={["KEUANGAN"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardKeuangan />} />
        <Route path="keuangan" element={<KeuanganKeuangan />} />
        <Route path="cash-opname" element={<CashOpnameKeuangan />} />
        <Route path="dtm" element={<DtmKeuangan />} />
        <Route path="riwayat-dtm" element={<RiwayatDtmKeuangan />} />
        <Route path="peraturan" element={<PeraturanKeuangan />} />
        <Route path="berita-acara" element={<BeritaAcaraKeuangan />} />
      </Route>

      <Route
        path="/pbj"
        element={
          <ProtectedRoute allowedRoles={["PBJ"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="desk" replace />} />
        <Route path="desk" element={<DeskPbj />} />
        <Route path="dtm" element={<DtmPbj />} />
        <Route path="riwayat-dtm" element={<RiwayatDtmPbj />} />
        <Route path="berita-acara" element={<BeritaAcaraPbj />} />
        <Route path="peraturan" element={<PeraturanPbj />} />
        <Route path="checklist" element={<ChecklistPbj />} />
      </Route>

      <Route
        path="/bmn"
        element={
          <ProtectedRoute allowedRoles={["BMN"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="beranda" replace />} />
        <Route path="beranda" element={<BerandaBmn />} />
        <Route path="lembar-kerja" element={<LembarKerjaBmn />} />
        <Route path="dtm" element={<DtmBmn />} />
        <Route path="riwayat-dtm" element={<RiwayatDtmBmn />} />
        <Route path="berita-acara" element={<BeritaAcaraBmn />} />
        <Route path="peraturan" element={<PeraturanBmn />} />
      </Route>

      <Route
        path="/smm-smap"
        element={
          <ProtectedRoute allowedRoles={["SMM_SMAP"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="beranda" replace />} />
        <Route path="beranda" element={<BerandaSmmSmap />} />
        <Route path="dtm" element={<DtmSmmSmap />} />
        <Route path="riwayat-dtm" element={<RiwayatDtmSmmSmap />} />
        <Route path="berita-acara" element={<BeritaAcaraSmmSmap />} />
        <Route path="peraturan" element={<PeraturanSmmSmap />} />
      </Route>

      <Route
        path="/sdm"
        element={
          <ProtectedRoute allowedRoles={["SDM"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="jam-kerja" replace />} />
        <Route path="jam-kerja" element={<JamKerjaSdm />} />
        <Route path="dtm" element={<DtmSdm />} />
        <Route path="riwayat-dtm" element={<RiwayatDtmSdm />} />
        <Route path="berita-acara" element={<BeritaAcaraSdm />} />
        <Route path="peraturan" element={<PeraturanSdm />} />
      </Route>
    </Routes>
  );
}
