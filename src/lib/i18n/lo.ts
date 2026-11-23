/**
 * Single source of all user-facing Lao strings.
 * Components must import from here instead of hard-coding text.
 */
export const lo = {
  app: {
    name: "ຄັງຫ້ອງ",
    nameLatin: "KlangHong",
    tagline: "ລະບົບຕິດຕາມເງິນຄັງຫ້ອງ ພາກວິຊາ IT",
  },
  nav: {
    dashboard: "ໜ້າຫຼັກ",
    pay: "ຈ່າຍເງິນ",
    history: "ປະຫວັດ",
    profile: "ໂປຣໄຟລ໌",
    committee: "ພາບລວມ",
    review: "ກວດສະລິບ",
    members: "ສະມາຊິກ",
    students: "ນັກສຶກສາ",
    expenses: "ລາຍຈ່າຍ",
    settings: "ຕັ້ງຄ່າ",
    reports: "ລາຍງານ",
    audit: "ບັນທຶກການເຄື່ອນໄຫວ",
    studentArea: "ໜ້ານັກສຶກສາ",
    committeeArea: "ຄະນະກຳມະການ",
    menu: "ເມນູ",
    logout: "ອອກຈາກລະບົບ",
  },
  status: {
    paid: "ຈ່າຍແລ້ວ",
    pending: "ລໍຖ້າກວດ",
    rejected: "ຖືກປະຕິເສດ",
    unpaid: "ຍັງບໍ່ຈ່າຍ",
    overdue: "ຄ້າງຊຳລະ",
    approved: "ຢືນຢັນແລ້ວ",
  },
  common: {
    loading: "ກຳລັງໂຫຼດ...",
    comingSoon: "ກຳລັງພັດທະນາ",
    save: "ບັນທຶກ",
    cancel: "ຍົກເລີກ",
    back: "ກັບຄືນ",
    copy: "ສຳເນົາ",
    copied: "ສຳເນົາແລ້ວ",
    search: "ຄົ້ນຫາ",
    exportCsv: "ສົ່ງອອກ CSV",
    retry: "ລອງໃໝ່",
    toggleTheme: "ປ່ຽນໂໝດມືດ/ແຈ້ງ",
  },
  errors: {
    generic: "ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່",
    notFoundTitle: "ບໍ່ພົບໜ້ານີ້",
    notFoundBody: "ໜ້າທີ່ທ່ານຊອກຫາບໍ່ມີ ຫຼື ຖືກຍ້າຍໄປແລ້ວ",
    goHome: "ກັບໜ້າຫຼັກ",
  },
} as const;

export type LoDictionary = typeof lo;
