import {
  LayoutDashboard,
  FileText,
  SquarePen,
  ClipboardCheck,
  History,
  WalletIcon,
  BanknoteArrowDownIcon,
  ClipboardList,
  FileCheckCorner,
  UserCheck
} from "lucide-react";

export const menuByRole = {
  KEUANGAN: [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/keuangan/dashboard",
    },
    {
      label: "Keuangan",
      icon: WalletIcon,
      path: "/keuangan/keuangan",
    },
    {
      label: "Cash Opname",
      icon: BanknoteArrowDownIcon,
      path: "/keuangan/cash-opname",
    },
    {
      label: "DTM",
      icon: FileText,
      path: "/keuangan/dtm",
      children: [
        {
          label: "Riwayat",
          icon: History,
          path: "/keuangan/riwayat-dtm",
        },
      ],
    },
    {
      label: "Peraturan",
      icon: SquarePen,
      path: "/keuangan/peraturan",
    },
    {
      label: "Berita Acara",
      icon: ClipboardCheck,
      path: "/keuangan/berita-acara",
    },
    {
      label: "Ketua Auditor",
      icon: UserCheck,
      path: "/keuangan/ketua-auditor",
    },
  ],

  PBJ: [
    {
      label: "Desk",
      icon: LayoutDashboard,
      path: "/pbj/desk",
    },
    {
      label: "DTM",
      icon: FileText,
      path: "/pbj/dtm",
      children: [
        {
          label: "Riwayat",
          icon: History,
          path: "/pbj/riwayat-dtm",
        },
      ],
    },
    {
      label: "Checklist",
      icon: ClipboardList,
      path: "/pbj/checklist",
    },
    {
      label: "Peraturan",
      icon: SquarePen,
      path: "/pbj/peraturan",
    },
    {
      label: "Berita Acara",
      icon: ClipboardCheck,
      path: "/pbj/berita-acara",
    },
    {
      label: "Ketua Auditor",
      icon: UserCheck,
      path: "/pbj/ketua-auditor",
    },
  ],

  BMN: [
    {
      label: "Beranda",
      icon: LayoutDashboard,
      path: "/bmn/beranda",
      children: [
        {
          label: "Lembar Kerja",
          icon: FileCheckCorner,
          path: "/bmn/lembar-kerja",
        },
      ],
    },
    {
      label: "DTM",
      icon: FileText,
      path: "/bmn/dtm",
      children: [
        {
          label: "Riwayat",
          icon: History,
          path: "/bmn/riwayat-dtm",
        },
      ],
    },
    {
      label: "Peraturan",
      icon: SquarePen,
      path: "/bmn/peraturan",
    },
    {
      label: "Berita Acara",
      icon: ClipboardCheck,
      path: "/bmn/berita-acara",
    },
    {
      label: "Ketua Auditor",
      icon: UserCheck,
      path: "/bmn/ketua-auditor",
    },
  ],

  'SMM_SMAP': [
    {
      label: "Beranda",
      icon: LayoutDashboard,
      path: "/smm-smap/beranda",
    },
    {
      label: "DTM",
      icon: FileText,
      path: "/smm-smap/dtm",
      children: [
        {
          label: "Riwayat",
          icon: History,
          path: "/smm-smap/riwayat-dtm",
        },
      ],
    },
    {
      label: "Peraturan",
      icon: SquarePen,
      path: "/smm-smap/peraturan",
    },
    {
      label: "Berita Acara",
      icon: ClipboardCheck,
      path: "/smm-smap/berita-acara",
    },
    {
      label: "Ketua Auditor",
      icon: UserCheck,
      path: "/smm-smap/ketua-auditor",
    },
  ],

  SDM: [
    {
      label: "Audit Jam Kerja",
      icon: LayoutDashboard,
      path: "/sdm/jam-kerja",
    },
    {
      label: "DTM",
      icon: FileText,
      path: "/sdm/dtm",
      children: [
        {
          label: "Riwayat",
          icon: History,
          path: "/sdm/riwayat-dtm",
        },
      ],
    },
    {
      label: "Peraturan",
      icon: SquarePen,
      path: "/sdm/peraturan",
    },
    {
      label: "Berita Acara",
      icon: ClipboardCheck,
      path: "/sdm/berita-acara",
    },
    {
      label: "Ketua Auditor",
      icon: UserCheck,
      path: "/sdm/ketua-auditor",
    },
  ],
};
