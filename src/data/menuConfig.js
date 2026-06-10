import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  DollarSignIcon
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
      icon: DollarSignIcon,
      path: "/keuangan/keuangan",
    },
    {
      label: "Cash Opname",
      icon: DollarSignIcon,
      path: "/keuangan/cash-opname",
    },
    {
      label: "DTM",
      icon: FolderKanban,
      path: "/keuangan/dtm",
      children: [
        {
          label: "Riwayat",
          path: "/keuangan/riwayat-dtm",
        },
      ],
    },
    {
      label: "Peraturan",
      icon: FileText,
      path: "/keuangan/peraturan",
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
      icon: FolderKanban,
      path: "/pbj/dtm",
      children: [
        {
          label: "Riwayat",
          path: "/pbj/riwayat-dtm",
        },
      ],
    },
    {
      label: "Peraturan",
      icon: FileText,
      path: "/pbj/peraturan",
    },
    {
      label: "Berita Acara",
      icon: FileText,
      path: "/pbj/berita-acara",
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
          path: "/bmn/lembar-kerja",
        },
      ],
    },
    {
      label: "DTM",
      icon: FolderKanban,
      path: "/bmn/dtm",
      children: [
        {
          label: "Riwayat",
          path: "/bmn/riwayat-dtm",
        },
      ],
    },
    {
      label: "Peraturan",
      icon: FileText,
      path: "/bmn/peraturan",
    },
    {
      label: "Berita Acara",
      icon: FileText,
      path: "/bmn/berita-acara",
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
      icon: FolderKanban,
      path: "/smm-smap/dtm",
      children: [
        {
          label: "Riwayat",
          path: "/smm-smap/riwayat-dtm",
        },
      ],
    },
    {
      label: "Peraturan",
      icon: FileText,
      path: "/smm-smap/peraturan",
    },
    {
      label: "Berita Acara",
      icon: FileText,
      path: "/smm-smap/berita-acara",
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
      icon: FolderKanban,
      path: "/sdm/dtm",
      children: [
        {
          label: "Riwayat",
          path: "/sdm/riwayat-dtm",
        },
      ],
    },
    {
      label: "Peraturan",
      icon: FileText,
      path: "/sdm/peraturan",
    },
    {
      label: "Berita Acara",
      icon: FileText,
      path: "/sdm/berita-acara",
    },
  ],
};
