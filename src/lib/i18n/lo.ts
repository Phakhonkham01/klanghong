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
  date: {
    months: [
      "ມັງກອນ",
      "ກຸມພາ",
      "ມີນາ",
      "ເມສາ",
      "ພຶດສະພາ",
      "ມິຖຸນາ",
      "ກໍລະກົດ",
      "ສິງຫາ",
      "ກັນຍາ",
      "ຕຸລາ",
      "ພະຈິກ",
      "ທັນວາ",
    ],
    /** Monday first (ISO weekday 1..7). */
    weekdaysShort: ["ຈັນ", "ອັງຄານ", "ພຸດ", "ພະຫັດ", "ສຸກ", "ເສົາ", "ອາທິດ"],
  },
  week: {
    thisWeek: "ອາທິດນີ້",
    week: "ອາທິດ",
    daysLeft: (n: number) => `ເຫຼືອ ${n} ວັນ ຮອດວັນສຸກ`,
    dueToday: "ມື້ນີ້ເປັນວັນສຸດທ້າຍ",
    windowClosed: "ເກີນກຳນົດວັນສຸກແລ້ວ",
    late: "ເກີນກຳນົດ",
    outstandingBanner: (count: number, total: string) => `ທ່ານມີ ${count} ອາທິດຄ້າງຊຳລະ · ລວມ ${total}`,
    errors: {
      invalid_date: "ວັນທີບໍ່ຖືກຕ້ອງ",
      not_monday: "ອາທິດຕ້ອງເລີ່ມວັນຈັນ",
      before_start: "ອາທິດນີ້ຢູ່ກ່ອນວັນເລີ່ມເກັບເງິນ",
      future_week: "ບໍ່ສາມາດຈ່າຍລ່ວງໜ້າອາທິດທີ່ຍັງບໍ່ມາຮອດ",
    },
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
